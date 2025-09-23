# HTI NewDash Memory Log

_Last updated: 2025-09-23_

- **API Deployment**: Express/LowDB server with optional auth gate (`HTI_REQUIRE_AUTH`). Smoke probe (`npm run smoke:bootstrap`) verifies `/api/bootstrap` health.
- **Data Sources**: Reddit, Data.gov, GSA Auctions, SAM.gov, USAspending awards, GovDeals RSS. Leads enriched with personas and synced to `server/data/hti.json`.
- **Personas**: Corporate IT Partner, Tech Refresh Donor, Government Surplus, Government Procurement, Healthcare System, Education Partner, Logistics Hotshot.
- **Pipelines**: Multi-board with automation engine, tasks, and ingestion console; default workspace seeded via `bootstrapSecurity`.
- **Settings**: Persona toggles, default owner (`hti-outreach`), map and automation switches, auth URL persisted via `/api/settings`.
- **Automation**: Nightly GitHub Action (`nightly-smoke-check`) runs smoke probe when `HTI_SMOKE_API_BASE` secret is set.
- **Grants.gov**: `sync:grants` script consumes the public search API to refresh grant milestones, surface matched keyword badges, auto-close expired opportunities, deep-link to the original listings, and feed the digital-literacy hours tracker (`HTI_GRANTS_*` env vars tune coverage).
- **Corporate Refresh Monitor**: `sync:corporate` ingests a curated national prospect list (corporate, healthcare, finance, logistics, higher-ed) to surface laptop refresh batches plus CSR/ITAD contacts; filter via `HTI_CORPREFRESH_*` env vars.
- **Automation**: auto-scoring/assignment runs after ingestion, creates follow-up tasks, and logs Slack/email digest notifications for high-priority logistics-friendly leads.
