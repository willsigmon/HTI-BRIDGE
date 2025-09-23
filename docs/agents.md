# Automation & Agent Registry

_Last updated: 2025-09-23_

## Ingestion Agents
- `sync:reddit` – r/sysadmin and r/ITManagers threads; polite throttling, cursor tracking.
- `sync:datagov` – Data.gov package search, converts datasets into leads + corporate targets.
- `sync:gsa` – GSA Auctions API, filters by state, maps auctions to leads.
- `sync:sam` – SAM.gov opportunity fetch (requires API key) for Government Procurement persona.
- `sync:usaspending` – USAspending awards, adds federal vendor leads, enriches metrics.
- `sync:govdeals` – GovDeals RSS parser, feeds Logistics Hotshot persona for surplus hardware.
- `sync:grants` – Grants.gov search API; refreshes grant milestones, badges matched keywords, links to listings, and closes expired opportunities while updating digital-literacy hours.
- `sync:corporate` – Corporate refresh monitor using curated corporate, healthcare, finance, and logistics signals to queue national laptop refresh prospects with contact intel.

## Operational Agents
- `smoke:bootstrap` – CLI smoke check for `/api/bootstrap`; also invoked nightly via GitHub Actions (`nightly-smoke-check`).
- Automation Designer – stage-change workflows in UI trigger follow-ups and tasks (configured via `/api/automations`).
- Operations Console – monitors ingestion jobs, connectors, API keys, and forms from `/api/admin/ingestion`.

## To Provision Next
- Evaluate Microsoft Nonprofit Hub connector for donor announcements (requires service account for Outlook sync).
- Automation upgrades: compliance alerts for grant-aligned opportunities and Microsoft Nonprofit Hub connector.
