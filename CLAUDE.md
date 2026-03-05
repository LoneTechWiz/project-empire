# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

Node.js is not in the system PATH by default. Use fnm to activate it first:

```bash
export PATH="$HOME/.local/share/fnm:$PATH" && eval "$(fnm env)"
```

Then:

```bash
npm run dev     # development (ticks every 10 min, NODE_ENV=development)
npm start       # production (ticks every 2 hours)
```

Server runs on `http://localhost:3000`. No build step — EJS templates are rendered server-side on each request.

The SQLite database is created automatically at `data/game.db` on first run. To reset the game state, delete `data/game.db`.

## Architecture

This is a server-side rendered Express app. There is no frontend framework or bundler.

**Request flow:**
1. `src/app.js` — entry point, mounts all routes, registers EJS helpers (`formatMoney`, `formatNumber`, `timeAgo`, `resourceIcon`), starts the cron tick
2. `src/middleware/auth.js` — `loadUser` runs on every request and populates `res.locals.user`, `res.locals.nation`, `res.locals.unreadMessages` for use in all EJS templates. `requireNation` is used to guard routes that need an active nation.
3. Route files in `src/routes/` handle all HTTP logic
4. Views in `views/` are EJS templates; all include `views/partials/header.ejs` and `views/partials/footer.ejs`

**Game engine (`src/game/`):**
- `economy.js` — `applyTick(db)` is called by cron and updates all nations' resources based on city improvements, military upkeep, and infrastructure-based commerce income. `calcCityProduction(city, nation)` returns a per-turn delta object and is also called on-demand for display purposes.
- `war.js` — `resolveAttack(type, attacker, defender, war)` returns a result object with casualties, loot, and infra destroyed. The wars route applies the result to the DB.

**Database (`src/db/`):**
- `schema.sql` is applied via `db.exec()` every startup using `CREATE TABLE IF NOT EXISTS`, so it is safe to re-run. Add new columns as `ALTER TABLE` migrations separately since SQLite's `IF NOT EXISTS` only applies at the table level.
- All queries use `better-sqlite3` (synchronous). Never use async/await for DB calls.

## Key Conventions

**EJS templates never have access to `req`** — query params and flash messages must be explicitly passed as template variables from the route. Pattern used throughout:

```js
res.render('view', { error: req.query.error || null, success: req.query.success || null });
```

**Route redirects for errors** use query strings (`?error=Message+here`), and the route passes them to the template. Do not rely on `req.query` inside EJS.

**`requireNation` middleware** sets `req.nation` (the full nations row) before the route handler runs. Routes that modify nation state should re-fetch from DB (`db.prepare(...).get(req.nation.id)`) rather than trusting the cached `req.nation` for resource checks.

**All DB updates that deduct resources use inline arithmetic** (e.g. `money = money - ?`) so they are atomic. Do not read then write separately for financial transactions.

**Score** is recalculated from scratch on every tick in `economy.js` — do not manually set it elsewhere.

## Environment

- `PORT` — defaults to 3000
- `SESSION_SECRET` — defaults to a hardcoded dev string; set in production
- `NODE_ENV=production` — switches tick schedule from every 10 minutes to every 2 hours
