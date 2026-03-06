# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

### Backend (Java / Spring Boot)

Requires Java 21 and Maven. PostgreSQL must be running with a database named `empire`.

```bash
# Start PostgreSQL (if not running)
sudo service postgresql start

# Create DB/user (first time only)
sudo -u postgres psql -c "CREATE USER empire WITH PASSWORD 'empire';"
sudo -u postgres psql -c "CREATE DATABASE empire OWNER empire;"

# Run backend (port 8180)
cd backend && mvn spring-boot:run

# Run tests
cd backend && mvn test

# Build JAR
cd backend && mvn clean package -DskipTests && java -jar target/empire-backend-0.0.1-SNAPSHOT.jar
```

Environment variables (all have defaults for local dev):
- `DB_URL` — `jdbc:postgresql://localhost:5432/empire`
- `DB_USER` — `empire`
- `DB_PASSWORD` — `empire`
- `JWT_SECRET` — defaults to a dev string
- `TICK_MS` — game tick interval in ms (default 600000 = 10 min)
- `CORS_ORIGINS` — allowed origins (default `http://localhost:5173,http://localhost:3000`)

### Frontend (React / Vite)

npm is on PATH directly:

```bash
cd frontend && npm install && npm run dev   # port 3001
cd frontend && npm run build               # production build to dist/
```

Vite proxies `/api` to `http://localhost:8180` in dev mode.

### Services (systemd)

The backend and frontend run as user-level systemd services that auto-start on boot:

```bash
# Restart backend (must rebuild JAR first — service runs from the JAR, not mvn)
cd backend && mvn clean package -DskipTests && systemctl --user restart empire-backend

# Restart frontend
systemctl --user restart empire-frontend

# Status / logs
systemctl --user status empire-backend
journalctl --user -u empire-backend -f
```

## Architecture

**Monorepo:** `backend/` (Spring Boot) + `frontend/` (React/Vite). No shared build system — run each independently.

## Git Conventions
- Do NOT add `Co-Authored-By` or any Claude/AI authorship lines to commit messages.

### Backend

**Request flow:**
1. `JwtFilter` — extracts Bearer token from `Authorization` header, validates with `JwtUtil`, populates `SecurityContextHolder`
2. `SecurityConfig` — stateless JWT sessions; public routes: `GET /api/alliances/**`, `GET /api/nations/**`, `GET /api/rankings/**`, `GET /api/search`, `POST /api/auth/**`; all others require auth
3. Controllers in `com.empire.controller` handle all HTTP logic and return `ApiResponse<T>` wrappers
4. `GameTickService` — `@Scheduled` runs every `TICK_MS`, calls `EconomyEngine.applyTick()` and expires old wars

**Game engine (`com.empire.game`):**
- `EconomyEngine` — `applyTick()` iterates all nations, sums city production (`calcCityProduction`) + military upkeep, applies deltas, updates score. `RESOURCES` list and `BASE_PRICES` map are static constants used by `TradeController`. Cities receive a 0.5x production penalty when unpowered.
- `WarEngine` — `resolveAttack(type, attacker, defender, war)` returns a `WarAttack.WarAttackBuilder` with all result fields populated. The controller applies the result to the DB.

**War mechanics:**
- Each `War` has `attackerResistance` and `defenderResistance` (both start at 100). Successful attacks reduce the defender's resistance; hitting 0 means defeat.
- `groundControl`, `airControl`, `navalControl` on `War` track battlefield dominance (`"attacker"`, `"defender"`, or `"none"`). Control grants strength multipliers in subsequent attacks.
- War status: `active`, `peace` (agreed), `expired` (time limit).
- **Attack charges:** max 4 per war, 1 regenerates every 6 hours (timestamp-based). Costs: ground=1, airstrike/naval/missile=2, nuke=4. Stored as `chargesCost` on `WarAttack`.
- **Resistance per attack:** ground=10, airstrike/naval/missile=15, nuke=20.
- **Missiles/nukes** are consumed on use regardless of success (interceptable by defender aircraft).
- **Infra damage** hits a random city from the defender's cities (not always the first).
- **Loot** only applies to ground attacks (`min(defender.money * 5%, $50k)`). Air/naval/missile/nuke deal no loot.
- **War limits:** attacker capped at 8 total active wars (offensive + defensive); defender capped at 3 defensive wars.
- **Battlefield control:** `WarController` sets `groundControl`/`airControl`/`navalControl` to `"attacker"` or `"defender"` after each successful attack by that side. Defender casualties are applied even on failed attacks.
- **Beige (post-war protection):** war losers receive 72 turns (~12 hours). New nations start with 432 turns.
- **Missile/nuke requirements:** missiles require 3+ cities; nukes require 5+ cities.
- **Spy success formula:** `min(0.95, (attackerSpies + 1) / (attackerSpies + defenderSpies + 1))` — undefended nations are ~95% easy to spy on.
- **Tank ground strength multiplier:** 8x soldiers (not 40x).

**Database:** Hibernate `ddl-auto=update` auto-generates schema from JPA entities. All entities are in `com.empire.model`. Never manually set `score` — it is recalculated by `EconomyEngine.calcScore()` on every tick.

**Key conventions:**
- All entities use Lombok `@Data @Builder @NoArgsConstructor @AllArgsConstructor`. Use `@Builder.Default` for any field with a non-null default.
- All DB access is through Spring Data JPA repositories in `com.empire.repository`
- `ApiResponse.ok(data)` / `ApiResponse.error(msg)` are the standard response wrappers
- Controllers use `requireNation(UserDetails)` helper to get the authenticated nation
- `CityController` uses reflection (`City.class.getDeclaredField(imp)`) to generically get/set improvement counts — city improvement fields on `City` must follow the naming convention `imp` + PascalCase (e.g., `impCoalmine`, `impSteelmill`). The string passed from the frontend must exactly match the field name.
- The `projects` field on `Nation` is a JSON array stored as a `TEXT` column — deserialize/serialize manually.
- `Nation.turns` is an action-point system for war attacks. `Nation.beigeTurns` tracks remaining turns of post-war beige (protection) status.
- **Commerce income**: `population * (commerce/100) * 1.0 / 12` per tick — the 1.0 multiplier is intentional (was deliberately increased from 0.5).
- **Commerce cap**: Commerce rate is intentionally uncapped — players can build as many commerce improvements as slots allow. Do not add a cap.
- **Nuclear plant cost**: Nuclear power plants are intentionally expensive (high cost, 2.4 uranium/turn). This is a deliberate design decision to make nuclear a late-game option.
- **Starting money**: Nations start with a small amount intentionally — it is seed money to get going, not enough to buy significant assets. Do not increase it.
- **Market prices**: Resource prices are not set by the game engine. Players/alliances set prices via trade offers. `BASE_PRICES` in `EconomyEngine` is only used for display/reference — do not auto-set market prices.
- **Population growth per tick:** `naturalGrowth = (maxPop - pop) * 0.002 * densityFactor` where `densityFactor = min(idealDensity / popPerAcre, 1.0)` and `idealDensity = land / infra * 50`. Growth is then scaled by death rate (net zero at 10% death rate).
- **Demolish refund:** 25% of what was actually paid for that copy — `baseCost * (1 + (count-1) * 0.5) * 0.25`, not flat 25% of base cost. Same logic in copy-to.
- **Username login is case-insensitive** — `UserRepository` uses `findByUsernameIgnoreCase` for login and `existsByUsernameIgnoreCase` for registration. Do not change these back to the case-sensitive variants.
- **React forms on mobile** — password managers may silently fill inputs without triggering React `onChange`. Use `new FormData(e.target)` to read actual DOM values on submit, falling back to React state.
- **Resource icon URLs** — `ResIcon.jsx`, `Navbar.jsx`, and `Dashboard.jsx` each maintain their own hardcoded icon URL maps. When icon PNG files are updated, bump `?v=N` in all three files to bust browser cache.

### Frontend

**State management:**
- `AuthContext` — JWT token in `localStorage`, current user + nation in React state; provides `login`, `register`, `logout`, `refreshNation`
- TanStack Query (React Query) — all server data fetching; query key conventions: `['cities']`, `['wars']`, `['war', id]`, `['alliance', id]`, `['nation', id]`, `['nation-mine']`, `['military']`, `['trade', ...]`, `['messages']`, `['rankings-nations', category]`, `['rankings-alliances']`
- `src/api/client.js` — axios instance; auto-injects `Authorization: Bearer <token>` header; redirects to `/login` on 401

**Routing:** `react-router-dom` v6 in `App.jsx`. `Protected` wrapper redirects unauthenticated users to `/login`.

**Styling:** Plain CSS in `src/index.css` with CSS variables. No CSS framework. Class utilities: `.card`, `.btn`, `.btn-sm`, `.btn-danger`, `.btn-success`, `.btn-ghost`, `.badge`, `.grid-2/3/4`, `.page`, `.tab-bar`, `.alert`, `.loading`, `.stat-label`, `.stat-value`.
