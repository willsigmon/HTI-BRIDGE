# Lead & Enrichment Sources

Curated list of data feeds you can wire into NewDash without paying for commercial prospecting tools. Each source is annotated with rate limits, integration notes, and ideas for persona tagging.

## Always-on APIs (free)

| Feed | What you get | Access | Integration idea |
| --- | --- | --- | --- |
| **Data.gov package search** | Federal/state digital equity grants, e‑waste programs, public donation initiatives | Anonymous JSON API (`package_search`) | Already wired (`sync:datagov`). Tune `HTI_DATAGOV_QUERY` per persona segment. |
| **GSA Auctions** | Real-time surplus equipment lots (computers, vehicles, industrial gear) | Requires optional API key | Already wired (`sync:gsa`). Use `HTI_GSA_STATES` to stay within pickup radius. |
| **SAM.gov contract opportunities** | Technology refresh, asset disposition bids, federal donation programs | Requires free API key (14-day approval) | Already wired (`sync:sam`). Adjust `HTI_SAM_KEYWORDS` to chase niche persona buckets. |
| **USAspending.gov Awards** | Historical IT modernization awards, vendor payments | Anonymous API | Use `sync:usaspending` to ingest top awards and enrich targets with agency + spend totals. |
| **Grants.gov public API** | Federal grants (education, workforce, health) | Anonymous XML/JSON endpoints | Map CFDA codes to personas; ingest deadlines into grant milestones. |
| **OpenCorporates** | Company registrations, officers, jurisdictions | Free tier (rate limited) | Build enrichment step that stamps organization profiles with legal name + jurisdiction. |

## Slow-drip scrapes (polite robots, free)

| Source | Delivery | Notes |
| --- | --- | --- |
| **GovDeals RSS** | RSS per category/location | Produce persona-specific feeds (e.g., `Computers & Networking in NC`). Use `connectors` CSV import after parsing. |
| **State surplus portals (NC, SC, VA)** | CSV/HTML listings | Most publish weekly spreadsheets. Set up Github Action to download and push through `/connectors/import/csv`. |
| **University surplus auctions** | HTML calendars | Many UNC system schools post monthly. Scrape basic metadata (title, quantities) and create leads tagged `Education Partner`. |
| **Municipal IT RFP boards** | RSS/Atom | Prioritize cities with ARPA digital equity plans. Tag for `Government Procurement` persona. |

## Account-required but free tiers

| Platform | Data | How to wire |
| --- | --- | --- |
| **Microsoft Nonprofit Hub** | Donation & grant announcements, hardware refresh alerts | Requires HTI tenant login. Enable email connector (Outlook) to drip announcements into interactions. |
| **TechSoup Forums** | Nonprofit IT asset exchanges | Login required but free. Scrape daily digest email via Gmail connector and convert posts to leads. |
| **NC eProcurement (BidBuy)** | State bids, surplus sales | Create API key (SOAP/JSON). Map categories `IT Equipment Disposal`, convert to `Government Procurement` persona. |

## Enrichment boosts

- **Clearbit Reveal (free tier)** – augment anonymous site traffic to capture companies hitting intake forms. Pipe matches into `connectors` webhook.
- **Breethe ESG datasets** – highlight sustainability scores for corporate targets; convert to persona weight adjustments.
- **FCC Broadband Map** – crosswalk ZIP codes for grant eligibility; store in `entities.metrics` for compliance filters.

## Implementation Playbook

1. **Prototype** new ingest under `server/scripts/ingest-*.js`. Follow the cursor/sync-log pattern from Reddit/Data.gov.
2. **Tag personas early** – call `categorizeLeadPersona` with hints (e.g., set `source` to `usa-spending` to trigger government persona logic).
3. **Record sync health** using `startSyncRun`/`finishSyncRun` so the operations console surfaces counts.
4. **Throttle politely** – stick to 1–2 req/s and persist cursors in `db.data.ingestCursor`.
5. **Document credentials** in `.env.example` and `README.md` before deploying.

For deeper enrichment, queue the scripts via GitHub Actions or a cheap Fly.io cron process; point them at the production API with `HTI_REQUIRE_AUTH=true` so every job authenticates via service account headers.
