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

# Run backend (port 8080)
cd backend && mvn spring-boot:run
```

Or build and run the JAR:
```bash
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

Node.js is not in system PATH by default. Use fnm:

```bash
export PATH="$HOME/.local/share/fnm:$PATH" && eval "$(fnm env)"
cd frontend && npm install && npm run dev   # port 5173
```

Vite proxies `/api` to `http://localhost:8080` in dev mode.

## Architecture

**Monorepo:** `backend/` (Spring Boot) + `frontend/` (React/Vite). No shared build system — run each independently.

### Backend

**Request flow:**
1. `JwtFilter` — extracts Bearer token from `Authorization` header, validates with `JwtUtil`, populates `SecurityContextHolder`
2. `SecurityConfig` — stateless JWT sessions; public routes: `GET /api/alliances/**`, `GET /api/nations/**`, `GET /api/rankings/**`, `GET /api/search`, `POST /api/auth/**`; all others require auth
3. Controllers in `com.empire.controller` handle all HTTP logic and return `ApiResponse<T>` wrappers
4. `GameTickService` — `@Scheduled` runs every `TICK_MS`, calls `EconomyEngine.applyTick()` and expires old wars

**Game engine (`com.empire.game`):**
- `EconomyEngine` — `applyTick()` iterates all nations, sums city production (`calcCityProduction`) + military upkeep, applies deltas, updates score. `RESOURCES` list and `BASE_PRICES` map are static constants used by `TradeController`.
- `WarEngine` — `resolveAttack(type, attacker, defender, war)` returns a `WarAttack.WarAttackBuilder` with all result fields populated. The controller applies the result to the DB.

**Database:** Hibernate `ddl-auto=update` auto-generates schema from JPA entities. All entities are in `com.empire.model`. Never manually set `score` — it is recalculated by `EconomyEngine.calcScore()` on every tick.

**Key conventions:**
- All DB access is through Spring Data JPA repositories in `com.empire.repository`
- `ApiResponse.ok(data)` / `ApiResponse.error(msg)` are the standard response wrappers
- Controllers use `requireNation(UserDetails)` helper to get the authenticated nation
- `CityController` uses reflection (`City.class.getDeclaredField(imp)`) to generically get/set improvement counts

### Frontend

**State management:**
- `AuthContext` — JWT token in `localStorage`, current user + nation in React state; provides `login`, `register`, `logout`, `refreshNation`
- TanStack Query (React Query) — all server data fetching; query key conventions: `['cities']`, `['wars']`, `['war', id]`, `['alliance', id]`, `['nation', id]`, `['nation-mine']`, `['military']`, `['trade', ...]`, `['messages']`, `['rankings-nations', category]`, `['rankings-alliances']`
- `src/api/client.js` — axios instance; auto-injects `Authorization: Bearer <token>` header; redirects to `/login` on 401

**Routing:** `react-router-dom` v6 in `App.jsx`. `Protected` wrapper redirects unauthenticated users to `/login`.

**Styling:** Plain CSS in `src/index.css` with CSS variables. No CSS framework. Class utilities: `.card`, `.btn`, `.btn-sm`, `.btn-danger`, `.btn-success`, `.btn-ghost`, `.badge`, `.grid-2/3/4`, `.page`, `.tab-bar`, `.alert`, `.loading`, `.stat-label`, `.stat-value`.
