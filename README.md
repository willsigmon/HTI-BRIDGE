# HTI NewDash

Modernized CRM cockpit for HUBZone Technology Initiative. The stack now ships with:

- **HTI Dashboard (static)** &mdash; the SPA in this directory, deployable to any static host.
- **Express/LowDB API** under `server/` with ingestion jobs (Reddit, Data.gov, GSA Auctions, SAM.gov) plus connector tooling.
- **Offline-ready UX** with a service worker, manifest, and responsive styles inspired by hubzonetech.org.

## Getting Started

### 1. Run the API locally

```bash
cd server
npm install
npm run seed        # optional: reload sample data with dedup-ready entities
npm run dev         # http://localhost:4000
```

Create `server/.env` (values shown are safe defaults):

```
PORT=4000
HTI_DB_PATH=./data/hti.json
HTI_REDDIT_SUBS=sysadmin,ITManagers
HTI_DATAGOV_QUERY="computer donation"
```

Additional keys (optional) unlock richer ingest feeds:

```
HTI_GSA_API_KEY=your_gsa_key
HTI_GSA_STATES=NC,SC,VA
HTI_SAM_API_KEY=your_sam_api_key
HTI_SAM_KEYWORDS="technology donation"
HTI_SAM_AGENCY="DEPT OF DEFENSE"
HTI_USA_KEYWORDS="information technology,computer,digital equity"
HTI_USA_AWARD_TYPES="A,B,C,D"
HTI_USA_START_DATE=2023-10-01
HTI_USA_END_DATE=2025-09-23
```

### Optional authentication toggle

Set `HTI_REQUIRE_AUTH=true` to force callers to include a trusted `x-user-id` header before any CRM payload is returned. Pair it with `HTI_AUTH_URL=https://sso.example.com/login` so the dashboard banner can direct users to the appropriate sign-in flow. Leave the flag unset (default) for demo or offline use.

### Quick smoke check

Verify the deployed API is returning live payloads before a demo:

```bash
cd server
HTI_SMOKE_API="https://api.example.com/api" npm run smoke:bootstrap
```

Pass `HTI_SMOKE_USER` if your proxy expects a specific user id header. The script prints lead counts, top opportunities, and ingestion job health.

### 2. Serve the frontend

Any static server will work. The UI auto-detects `/api`; override with `localStorage.setItem('hti-api-base', 'https://api.example.com')` if hosting separately.

```bash
npx serve .
```

The service worker precaches core assets (`index.html`, `style.css`, `app.js`, icons) so the dashboard keeps working offline.

## Feature Highlights

- **Unified CRM Data Hub** – contacts, households, and companies roll up with dedupe intelligence and merge actions.
- **Persona Intelligence** – every lead is auto-bucketed (Tech Refresh Donor, Government Surplus, Healthcare System, etc.) for filters, dashboards, and routing.
- **Multi-pipeline kanban** – drag-style lanes (via click actions) for donation, grants, or partnership pipelines with probability-weighted forecasts.
- **Automation Studio** – build stage-change automations that schedule follow-ups, log activities, and create task queues.
- **Field Ops Map** – Leaflet map for routing pickups, with weighted markers and quick route summaries.
- **Operations Console** – monitor ingestion jobs, register connectors, manage API keys, and grab embeddable intake forms.
- **Settings Dashboard** – toggle personas, adjust weighting, set default owners, and manage feature switches without redeploying.
- **PWA polish** – installable manifest, offline caching, and responsive layouts tuned for hubzonetech.org branding.

## Data Ingestion & Connectors

### Scheduled jobs (cron-friendly)

```bash
npm run sync:reddit   # r/sysadmin, r/ITManagers
npm run sync:datagov  # catalog.data.gov
npm run sync:gsa      # GSA surplus auctions
npm run sync:sam      # SAM.gov opportunities (requires HTI_SAM_API_KEY)
npm run sync:usaspending  # USAspending awards (public federal IT contracts)
```

Runs are cursor-aware, lightly throttled, and log to the ingestion console with audit entries.

### Connector console

- Register Gmail/Outlook/CSV/ICS connectors for drip ingestion.
- Paste CSV or ICS payloads directly in the UI to drip interactions; records feed the Data Hub timeline instantly.
- API Keys page issues scoped tokens for partner intake forms (embed snippet available per form).

## API Surface

### Core
- `GET /api/bootstrap`
- `GET /api/dashboard`
- `GET /api/leads`
- `POST /api/leads`
- `PATCH /api/leads/:id`
- `DELETE /api/leads/:id`
- `POST /api/leads/:id/complete-follow-up`
- `GET /api/corporate-targets`
- `POST /api/corporate-targets`
- `GET /api/milestones`
- `GET /api/activities`

### Pipelines & Automations
- `GET /api/pipelines`
- `POST /api/pipelines`
- `PATCH /api/pipelines/:id`
- `POST /api/pipelines/:id/stages`
- `PATCH /api/pipelines/:id/stages/:stageId`
- `POST /api/pipelines/:id/assign`
- `GET /api/pipelines/:id/board`
- `GET /api/automations`
- `POST /api/automations`
- `PATCH /api/automations/:id`
- `DELETE /api/automations/:id`
- `GET /api/automations/:id/executions`
- `GET /api/tasks`
- `PATCH /api/tasks/:id/complete`

### CRM Data Hub
- `GET /api/entities`
- `GET /api/entities/dedupe`
- `POST /api/entities/:primaryId/merge`
- `GET /api/interactions`

### Operations & Connectors
- `GET /api/admin/ingestion`
- `PATCH /api/admin/ingestion/:id`
- `POST /api/admin/ingestion/:id/run`
- `GET /api/connectors`
- `POST /api/connectors`
- `PATCH /api/connectors/:id`
- `POST /api/connectors/import/csv`
- `POST /api/connectors/import/ics`

### Forms & Security
- `GET /api/forms`
- `POST /api/forms`
- `PATCH /api/forms/:id`
- `GET /api/forms/:id/embed`
- `GET /api/security/users`
- `GET /api/security/api-keys`
- `POST /api/security/api-keys`
- `DELETE /api/security/api-keys/:id`

### Public Intake
- `GET /external/forms/:slug.html`
- `POST /external/intake/:slug` (requires API key)

All routes respect role-based permissions; the default `hti-admin` owner seeded in LowDB has `*` scope.

## Deploying

1. Deploy `server/` (Render/Fly.io/Railway). Persist `HTI_DB_PATH` or swap to Postgres.
2. Configure env vars and secrets (Reddit, Data.gov, GSA, SAM.gov, etc.).
3. Serve the static dashboard (Vercel/Netlify/S3). If API lives elsewhere, set `window.__HTI_API_BASE__` before loading `app.js` or persist via localStorage.
4. Schedule ingestion jobs (cron, GitHub Actions, or a managed worker).
5. Optional: expose `/external/forms/:slug` on the API domain for partner embed usage.

## Extending

- **Auth & multi-tenancy**: front a proxy (Clerk, Supabase) and map workspaces to JWT claims.
- **Deeper enrichment**: plug SAM.gov, Crunchbase, Clearbit, etc., into the connector system for automated enrichment.
- **Analytics**: ship metrics to Metabase/Redash or embed Superset charts via the new operations console.
- **Mobile**: wrap the PWA in Capacitor for kiosk/field deployment.
- **Lead sourcing**: browse `docs/data-sources.md` for free APIs and drip scrapes to plug into `sync:*` jobs.

Enjoy the new HubZone-flavored cockpit! If you uncover issues, open the inspector & look for toasts—everything now reports errors unobtrusively.
