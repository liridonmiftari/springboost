## Spring-Boilerplate-Buster

Full‑stack Spring Boot project generator with an Express + Vite + React UI.

### Prerequisites

- Node.js 20+
- npm
- Docker & Docker Compose

---

## Quickstart (recommended flow)

This is the flow you used that works: Docker for Postgres, app on your host.

```bash
cd /Users/liridonmiftari/Desktop/Spring-Boilerplate-Buster

# 1. Start Postgres in Docker
docker compose up -d db

# 2. Export DATABASE_URL for local dev
source ./env.local.sh

# 3. Install deps (first time only)
npm install

# 4. Apply DB schema (Drizzle)
npm run db:push

# 5. Run the app
npm run dev
```

Then open: `http://localhost:5000`

---

## What `env.local.sh` does

`env.local.sh` sets the Postgres connection string for local development:

```bash
export DATABASE_URL="postgres://app:app@localhost:5432/spring_bbb"
```

Always `source ./env.local.sh` (or set `DATABASE_URL` yourself) **before**:

- `npm run db:push`
- `npm run dev`
- `npm run build` / `npm start`

---

## All-in-one Docker (DB + app in containers)

If you prefer everything in Docker, use the included `docker-compose.yml`:

```bash
cd /Users/liridonmiftari/Desktop/Spring-Boilerplate-Buster
docker compose up
```

Services:
- `db`: Postgres 16 (`spring_bbb` / `app` / `app`)
- `app`: Node 20 container that runs `npm install` and `npm run dev` with  
  `DATABASE_URL=postgres://app:app@db:5432/spring_bbb`

App will be available at: `http://localhost:5000`

To stop:

```bash
docker compose down
```

---

## Production build (local host)

```bash
cd /Users/liridonmiftari/Desktop/Spring-Boilerplate-Buster
source ./env.local.sh   # or set DATABASE_URL another way
npm install
npm run build
npm start
```

The server listens on port `5000` by default (or `PORT` if set).


