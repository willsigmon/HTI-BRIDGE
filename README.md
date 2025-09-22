# HTI NewDash

Live CRM dashboard for HUBZone Technology Initiative. The project now ships with:

- **Static dashboard UI** (in this folder) optimized for Vercel/static hosting.
- **Node/Express API** under `server/` with a SQLite store and ingestion scripts for Reddit + Data.gov.

## Getting Started

### 1. Run the API locally

```bash
cd server
npm install
npm run seed        # optional: load sample data
npm run dev         # starts API on http://localhost:4000
```

Environment variables (create `server/.env`):

```
PORT=4000
HTI_DB_PATH=./data/hti.json
HTI_REDDIT_SUBS=sysadmin,ITManagers
HTI_DATAGOV_QUERY="computer donation"
```

### 2. Serve the frontend

Use any static server from the project root (Vercel, `npx serve`, etc.). The UI auto-detects the API at `/api` and falls back to local data if the API is offline.

```bash
npx serve .
```

When hosting both together, reverse-proxy `/api` to the Express server.

## Data Ingestion

The API includes drip crawlers you can schedule (cron, GitHub Actions, etc.):

```bash
# reddit.com/r/sysadmin and r/ITManagers
npm run sync:reddit

# catalog.data.gov search (configurable query)
npm run sync:datagov
```

Each script is polite (throttled, user-agent tagged) and stores cursors so they can run on a schedule without re-ingesting older items.

## API Endpoints

- `GET /healthz` – health check.
- `GET /api/bootstrap` – bulk payload (leads, corporate targets, milestones, activities, dashboard summary).
- `GET /api/dashboard` – aggregated metrics only.
- `GET /api/leads?status=&source=&priority=&search=`
- `POST /api/leads`
- `PATCH /api/leads/:id`
- `DELETE /api/leads/:id`
- `POST /api/leads/:id/complete-follow-up`
- `GET /api/corporate-targets?priority=`
- `POST /api/corporate-targets`
- `GET /api/milestones`
- `GET /api/activities?limit=`

## Deploying

1. Deploy `server/` to a Node host (Render, Fly.io, Railway, Vercel serverless). Persist the `HTI_DB_PATH` storage.
2. Set environment variables above (and add API keys when you obtain them, e.g. SAM.gov).
3. Point the frontend (`index.html`) at the API domain by setting `window.__HTI_API_BASE__` before loading `app.js` if it’s not under the same origin.
4. Schedule ingestion scripts via cron/worker.

## Extending

- Add auth (Supabase, Clerk) by protecting the API routes.
- Swap SQLite for Postgres by changing `HTI_DB_PATH` to a Postgres connection string and using `better-sqlite3` alternatives (or adopt Prisma).
- Enrich data with official APIs (SAM.gov, Crunchbase, Clearbit) once you have API keys.
