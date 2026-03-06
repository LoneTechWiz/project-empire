# Project Empire

A browser-based nation-building and strategy game. Build cities, manage resources, grow your economy, wage wars, and form alliances with other players in real time.

---

## Features

- **Nation management** — Lead your nation, set a flag, grow your score
- **City building** — Found cities, buy infrastructure and land, build improvements
- **Economy** — Resource production (coal, oil, iron, steel, aluminum, gasoline, munitions, food, uranium), commerce income, food consumption, power grid management
- **Population** — Density-based growth system influenced by death rate and city improvements
- **Military** — Train soldiers, tanks, aircraft, ships, spies; build missiles and nukes
- **War** — Declare wars, launch ground/air/naval/missile/nuke attacks with a charge-based system
- **Trade** — Post buy/sell offers on a live marketplace with partial fill support
- **Alliances** — Create alliances, manage roles, sign inter-alliance treaties
- **Messaging** — Threaded conversations between nations
- **Finance** — Per-city production breakdown with totals and military upkeep
- **Rankings** — Nation and alliance leaderboards

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3, Spring Security (JWT), Spring Data JPA |
| Database | PostgreSQL (schema auto-managed via Hibernate `ddl-auto=update`) |
| Frontend | React 18, Vite, TanStack Query, React Router v6 |
| Auth | Stateless JWT — Bearer token in `Authorization` header |

---

## Project Structure

```
project-empire/
├── backend/          # Spring Boot API (port 8180)
│   └── src/main/java/com/empire/
│       ├── controller/   # REST endpoints
│       ├── game/         # EconomyEngine, WarEngine
│       ├── model/        # JPA entities
│       ├── repository/   # Spring Data repositories
│       └── ...
└── frontend/         # React/Vite app (port 3001)
    └── src/
        ├── api/          # Axios client
        ├── components/   # Navbar, shared components
        ├── context/      # AuthContext (JWT + nation state)
        └── pages/        # One file per route
```

---

## Getting Started

### Prerequisites

- Java 21
- Maven
- PostgreSQL
- Node.js (via [fnm](https://github.com/Schniz/fnm) or system install)

### Database setup (first time only)

```bash
sudo service postgresql start
sudo -u postgres psql -c "CREATE USER empire WITH PASSWORD 'empire';"
sudo -u postgres psql -c "CREATE DATABASE empire OWNER empire;"
```

### Backend

```bash
cd backend
mvn spring-boot:run
# Runs on http://localhost:8180
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3001
# Proxies /api → http://localhost:8180
```

### Environment variables (backend)

| Variable | Default | Description |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/empire` | PostgreSQL JDBC URL |
| `DB_USER` | `empire` | DB username |
| `DB_PASSWORD` | `empire` | DB password |
| `JWT_SECRET` | dev string | Must be 256+ bits in production |
| `TICK_MS` | `600000` | Game tick interval in ms (10 min) |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Allowed frontend origins |

---

## Game Mechanics Summary

### Economy
- **Tick:** every 10 minutes — resources produced, consumed, population grows, score recalculated
- **Improvements:** slotted by infrastructure (`floor(infra / 25)` slots); cost scales `baseCost * (1 + count * 0.5)` per duplicate
- **Population:** max = `infra * 1000`; grows toward cap based on land density relative to ideal (`land / infra * 50` pop/acre); death rate from polluting improvements slows growth
- **Commerce income:** `population * (commerce% / 100) * 0.5 / 12` per tick
- **Power:** plants supply power; unpowered cities produce at 50%

### War
- **Resistance:** attacker and defender each start at 100; hits 0 = defeat
- **Charges:** 4 per war, 1 regenerates every 6 hours
- **Charge costs:** ground = 1, airstrike / naval / missile = 2, nuke = 4
- **Resistance damage:** ground = 10, airstrike / naval / missile = 15, nuke = 20
- **Loot:** ground attacks only (`min(defender money * 5%, $50k)`)
- **Missiles/nukes:** consumed on use; interceptable by defender aircraft
- **War limits:** max 8 total active wars per nation; max 3 defensive wars

### Military unit caps (per city)
| Unit | Cap |
|---|---|
| Soldiers | 15,000 |
| Tanks | 1,250 |
| Aircraft | 75 |
| Ships | 15 |
| Spies | 5 (max 60) |

---

## API Overview

All responses are wrapped: `{ "success": true, "data": ... }` or `{ "success": false, "message": "..." }`

Public routes (no auth): `GET /api/alliances/**`, `GET /api/nations/**`, `GET /api/rankings/**`, `GET /api/search`, `POST /api/auth/**`

All other routes require `Authorization: Bearer <token>`.

Key endpoints:

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/nations/mine` | Your nation |
| GET | `/api/nations/mine/finances` | Full production breakdown |
| GET/POST | `/api/cities` | List cities / found new city |
| POST | `/api/cities/{id}/build` | Build an improvement |
| POST | `/api/cities/{id}/demolish` | Demolish an improvement |
| GET/POST | `/api/military` | Military stats / buy units |
| POST | `/api/wars/declare/{targetId}` | Declare war |
| POST | `/api/wars/{id}/attack` | Launch an attack |
| GET/POST | `/api/trade` | Trade offers / post offer |
| POST | `/api/trade/{id}/accept` | Accept (partial) trade offer |
| GET/POST | `/api/messages` | Conversations / send message |
| GET/POST | `/api/alliances` | Alliance list / create |

---

## Contributing

This is a personal project. See `CLAUDE.md` for development conventions and architecture notes used when working with AI coding assistants.
