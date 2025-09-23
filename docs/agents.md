# Automation & Agent Registry

_Last updated: 2025-09-23_

## Ingestion Agents
- `sync:reddit` – r/sysadmin and r/ITManagers threads; polite throttling, cursor tracking.
- `sync:datagov` – Data.gov package search, converts datasets into leads + corporate targets.
- `sync:gsa` – GSA Auctions API, filters by state, maps auctions to leads.
- `sync:sam` – SAM.gov opportunity fetch (requires API key) for Government Procurement persona.
- `sync:usaspending` – USAspending awards, adds federal vendor leads, enriches metrics.
- `sync:govdeals` – GovDeals RSS parser, feeds Logistics Hotshot persona for surplus hardware.

## Operational Agents
- `smoke:bootstrap` – CLI smoke check for `/api/bootstrap`; also invoked nightly via GitHub Actions (`nightly-smoke-check`).
- Automation Designer – stage-change workflows in UI trigger follow-ups and tasks (configured via `/api/automations`).
- Operations Console – monitors ingestion jobs, connectors, API keys, and forms from `/api/admin/ingestion`.

## To Provision Next
- Grants.gov ingestion agent to sync grant postings and auto-update milestone due dates (blocked by 405 on REST endpoint; evaluate bulk download/CSV mirror).
