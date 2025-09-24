# TODO

- [x] Implement backend API with JSON persistence and REST endpoints.
- [x] Add Reddit and Data.gov ingestion scripts with polite throttling and cursor tracking.
- [x] Connect the frontend to the live API with auto-refresh and offline fallbacks.
- [x] Refresh HTI branding and document deployment & operations workflow.

- [x] Build a unified contact/company record with deduplication rules and household/org rollups.
- [x] Add automation designer for follow-up emails, reminders, and grant tasks triggered by pipeline stage changes.
- [x] Implement multi-pipeline boards with customizable fields and saved views for programs, inspired by Monday.com/Pipedrive dashboards.
- [x] Layer in location-aware map view and routing for donation pickups (baseline from Pipeline CRM feature set).
- [x] Integrate email/calendar sync plus interaction timeline per lead, including import/export from CSV and Gmail/Outlook connectors.
- [x] Add role-based permissions, team workspaces, and audit log for compliance.
- [x] Deliver mobile-responsive tweaks and optional PWA caching for field staff.
- [x] Ship admin console to monitor/schedule ingestion jobs, including rerun, pause, and API key health indicators.
- [x] Expand analytics with stage duration, conversion funnel, forecast KPIs, and grant compliance scorecards.
- [x] Provide embeddable lead intake forms / API keys so partners can submit opportunities directly.
- [x] Add optional HTI_REQUIRE_AUTH gate so the dashboard surfaces live sign-in prompts when auth is enforced.

- [x] Ship `sync:usaspending` job to enrich corporate targets with award history + agency spend tagging.
- [x] Build GovDeals RSS parser that drips surplus equipment into the Logistics Hotshot persona queue daily.
- [x] Wire Grants.gov feed into grant milestones (auto-close items when expiration passes).
- [x] Create smoke-test GitHub Action that runs `npm run smoke:bootstrap` nightly against production.

- [x] Implement automatic grant-alignment scoring and priority weighting for new leads post ingestion.
- [x] Auto assign high-priority leads to owners based on persona with follow-up tasks.
- [x] Deliver Slack/email notifications summarizing new leads with logistics flags.

- [x] Bootstrap Salesforce-free CRM evaluator per `AGENTS.md`.
- [x] Populate vendor YAML stubs under `data/vendors/`.
- [x] Implement scoring engine + CLI (`crm-eval score`).
- [x] Draft migration, security, and integration generators.
- [x] Wire CI (Makefile, ruff/black/pytest) and produce sample artifacts.
- [ ] Phase 1: Split dashboard frontend into ES modules and finish shared config adoption.
- [ ] Phase 2: Replace LowDB with Postgres (Knex/Prisma), add migrations, enforce workspace scoping.
- [ ] Phase 3: Add API key auth + rate limiting/logging on intake/connectors, surface UI auth errors.
- [ ] Phase 4: Add Node integration tests, wire Node lint/tests into CI, document local scripts.
