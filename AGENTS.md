# AGENTS.md — CRM Alternatives Evaluator (No Salesforce)

## Objective
Build a reproducible toolkit that ranks and explains **highly-rated CRM systems (excluding Salesforce)** for a given business profile. Deliver:
1) a scored short-list (JSON + Markdown),  
2) a migration & rollout plan draft,  
3) a security/compliance checklist,  
4) integration notes with verification steps.

## Tech Choices
- Language: Python 3.11+ (CLI + library).
- Packaging: `uv` (preferred) or `pipx`/`pip`.
- Testing: `pytest`.
- Lint/Format: `ruff`, `black`.
- CI: GitHub Actions (lint + test + report artifacts).
- Data files: YAML under `data/vendors/` and `config/criteria.yml`.

## Default Approval & Safety
- Run in **Auto** approval inside the repo; require explicit approval before any **network** access or file writes outside the repo. Prefer Read-Only while planning.  
- Never exfiltrate secrets. Use `.env` only for local tokens; do not commit.

## Directory Layout (create if missing)
````
.
├── AGENTS.md
├── src/crm_eval/                # Python package
│   ├── __init__.py
│   ├── cli.py                   # entrypoint `crm-eval`
│   ├── data.py                  # load YAML vendor + criteria
│   ├── scoring.py               # weighted scoring engine
│   ├── report.py                # MD/JSON generators
│   ├── migration.py             # data migration plan draft
│   ├── security.py              # compliance checklist generator
│   └── integrate.py             # integration notes & checks
├── data/vendors/                # curated vendor YAML (no Salesforce)
│   ├── hubspot.yml
│   ├── zoho.yml
│   ├── pipedrive.yml
│   ├── zendesk_sell.yml
│   ├── freshsales.yml
│   ├── dynamics365.yml
│   ├── monday_sales_crm.yml
│   ├── copper.yml
│   ├── insightly.yml
│   ├── sugarcrm.yml
│   ├── creatio.yml
│   ├── keap.yml
│   ├── nutshell.yml
│   └── suitecrm.yml
├── config/criteria.yml          # weights + rubric (see below)
├── artifacts/.gitkeep           # generated outputs go here
├── tests/                       # pytest suite
│   ├── test_scoring.py
│   ├── test_report.py
│   └── test_cli.py
├── pyproject.toml               # ruff/black/pytest config
├── .pre-commit-config.yaml
└── Makefile
````

## Setup Commands
- Install deps:
  - If `uv` is available: `uv venv && uv pip install -e ".[dev]"`  
  - Else: `python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"`
- Run lint/tests: `make check` (alias for `ruff . && black --check . && pytest -q`)
- Format: `make fmt` (alias for `ruff --fix . && black .`)

## CLI Behavior
Implement `crm-eval` with subcommands:

- `crm-eval score --profile ./config/profile.yml --out ./artifacts/scorecard.json --md ./artifacts/scorecard.md`
  - Loads vendors and criteria; outputs ranked list + Markdown explainer.
- `crm-eval migrate --profile ./config/profile.yml --out ./artifacts/migration.md`
  - Drafts phased migration plan (pilot → staged rollout), mapping, cutover checks, post-migration validation.
- `crm-eval security --out ./artifacts/security.md`
  - Generates checklist: SSO/MFA, RBAC, audit logs, encryption in transit/at rest, DPA, SOC 2/ISO 27001 evidence, data residency, retention/backups.
- `crm-eval integrate --profile ./config/profile.yml --out ./artifacts/integration.md`
  - Notes for APIs/webhooks, rate limits, idempotency, error handling, and which iPaaS (e.g., Workato/MuleSoft/Zapier) vs first-party SDKs.

## Scoring Rubric (100 pts total)
Use 0–5 per metric; normalize to weights. Missing data ⇒ conservative default (2/5) and flag.
- **Integrations & APIs (12)**: first-party APIs, webhooks, SDKs, iPaaS support, events coverage.
- **Customization & Extensibility (10)**: objects/fields, low-code tools, workflow engine, sandboxing.
- **Usability & Admin Experience (10)**: learnability, admin UX, permission clarity.
- **Analytics & AI (10)**: reporting, dashboards, predictive scoring, conversational insights.
- **Security & Compliance (10)**: SSO/MFA, role hierarchy, audit logs, encryption, SOC 2/ISO 27001, data residency options.
- **Sales Pipeline & Core CRM (15)**: leads/opportunities, tasks, email/calendar sync.
- **Service/Ticketing (7)**: help desk, SLAs, multi-channel.
- **Marketing Automation (7)**: email/journey builder, lead capture, attribution basics.
- **Pricing & TCO (9)**: license tiers, add-on creep, implementation effort, admin hours.
- **Data Migration & Portability (5)**: import/export, bulk APIs, historical notes/files, ID mapping.
- **Support, Ecosystem & Viability (5)**: marketplace depth, partner network, docs quality.

### Vendor Exclusion Rule
Explicitly **exclude Salesforce**—do not load `salesforce*.yml`. If a vendor alias maps to Salesforce, skip.

## Vendor YAML Schema (placeholders)
Each file under `data/vendors/*.yml` should follow:
```yaml
name: "HubSpot CRM"
plan_names: ["Starter", "Professional", "Enterprise"]
hosting: "SaaS"
oss: false
website: "https://example"
g2_slug: "hubspot-sales-hub"         # optional; used only if network access is approved
core:
  sales_pipeline: true
  service_ticketing: optional
  marketing_automation: strong
integrations:
  apis: ["REST", "GraphQL?"]
  webhooks: true
  sdks: ["JS", "Python"]
  ipaas: ["Zapier", "Make", "Workato"]
customization:
  objects: ["contacts","companies","deals","tickets","custom_objects"]
  workflow_engine: "yes/limits"
analytics_ai:
  reporting: "robust"
  ai_features: ["forecasting","summaries","auto-capture"]
security:
  sso: "SAML/OIDC"
  mfa: true
  compliance: ["SOC 2","ISO 27001","GDPR","CCPA"]
data:
  bulk_api: true
  export: ["CSV","API"]
  attachments: "supported"
pricing_tco:
  notes: "watch for add-ons at scale"
support_ecosystem:
  marketplace_apps: 1200
  partners: "broad"
notes:
  - "Strengths: <…>"
  - "Trade-offs: <…>"
```

## Criteria Config (`config/criteria.yml`)

```yaml
weights:
  integrations_apis: 12
  customization_extensibility: 10
  usability_admin: 10
  analytics_ai: 10
  security_compliance: 10
  sales_core: 15
  service: 7
  marketing: 7
  pricing_tco: 9
  data_migration_portability: 5
  support_ecosystem_viability: 5
scales:
  # map 0–5 raw to descriptive anchors
  0: "absent"
  3: "adequate"
  5: "excellent"
```

## Verification (Codex must do this)

1. **Unit tests**: add tests for scoring normalization, YAML loading, and CLI argument parsing; keep ≥95% branch coverage for `scoring.py` and `data.py`.
2. **Static checks**: `ruff .` and `mypy --strict` (if mypy added).
3. **Determinism**: running `crm-eval score` with same inputs yields identical JSON.
4. **Reports**: generate `artifacts/scorecard.{json,md}`; include table of top 5 vendors and rationale.
5. **No network by default**: scraping or API calls **only** after explicit approval and behind a function flag `--fetch-ratings`.

## Migration & Rollout Best Practices (embed in outputs)

* Prefer **phased rollout (pilot → staged)** unless business approves “big-bang”; include cutover timing, downtime window, rollback, and comms plan.
* Pre-migration: profile fields, dedupe, establish **cutoff date** for historicals, map IDs, back up everything, dry-run imports in sandbox.
* Post-migration: reconcile counts, spot-check records, re-index search, re-connect integrations, run hypercare for 2–4 weeks.
* Adoption: champions, training, feedback loop in week 1 & 3, turn off shadow spreadsheets after sign-off.

## Security Checklist (embed in outputs)

* Enforce SSO + MFA; least-privilege RBAC; audit logging enabled.
* Confirm vendor attestations (SOC 2) or certification (ISO 27001); sign DPA; document data residency; set retention & backup policies.
* Verify encryption in transit/at rest, API token scopes, and webhook signature validation.

## Integration Notes (embed in outputs)

* Prefer webhooks over polling; design for idempotency; implement retry with backoff.
* Budget for rate limits; centralize secrets; provide replayable fixtures for tests.
* Decide early: iPaaS vs first-party SDKs vs custom broker.

## Pull Requests

* Title: `[crm-eval] <feature>`
* Before pushing: `make fmt && make check`
* Include: sample profile, sample output, and discussion of top-3 vendors and why.

## Makefile Targets

* `make check` → ruff + black --check + pytest
* `make fmt` → ruff --fix + black .
* `make demo` → run `crm-eval score` against `examples/profile_smb.yml`

## Nice-to-have (if time allows)

* Add `--html` to export a single-page report.
* Add `--weights` to override `config/criteria.yml`.
* Add `--profile` templates for SMB, mid-market, enterprise, and nonprofit.

````

## Add these helper files (stubs)

**`pyproject.toml` (ruff/black/pytest minimal)**
```toml
[tool.black]
line-length = 100
target-version = ["py311"]

[tool.ruff]
line-length = 100
select = ["E","F","I","UP","B"]
exclude = ["venv",".venv","build","dist"]

[tool.pytest.ini_options]
addopts = "-q"
testpaths = ["tests"]
```

**`tests/test_scoring.py` (skeleton)**

```python
from crm_eval.scoring import score_vendor

def test_weights_sum_to_100(load_default_weights):
    assert sum(load_default_weights().values()) == 100

def test_scoring_is_deterministic(sample_vendor, load_default_weights):
    s1 = score_vendor(sample_vendor, load_default_weights())
    s2 = score_vendor(sample_vendor, load_default_weights())
    assert s1 == s2
```

**Sample profile** `examples/profile_smb.yml`

```yaml
company_size: "10-50"
must_have:
  - "email_calendar_sync"
  - "basic_automation"
nice_to_have:
  - "helpdesk"
  - "predictive_scoring"
budget_per_user_per_month: 30
regions: ["US"]
industry: "services"
```

## Codex CLI Cheat-Sheet (to run this plan)

```bash
# 1) Plan in read-only, then switch to auto:
codex /approvals read-only
codex "Create the repo structure above, add pyproject, Makefile, and stubs. Do NOT fetch the web yet."

# 2) Implement core modules + tests:
codex exec "Implement src/crm_eval/{data.py,scoring.py,cli.py,report.py} and tests. Wire up 'crm-eval score'."

# 3) Generate a demo scorecard (offline):
codex exec "Run make check && crm-eval score --profile examples/profile_smb.yml --out artifacts/scorecard.json --md artifacts/scorecard.md"

# 4) Add migration, security, and integration outputs:
codex exec "Implement migration.py, security.py, integrate.py and subcommands. Regenerate artifacts."

# 5) (Optional) Fetch ratings from trusted sources (requires approval & network):
codex /approvals auto
codex exec "Implement --fetch-ratings to optionally pull G2 category scores; cache locally. Respect rate limits."
```

## Notes & sources behind the rules (for humans)

* **Codex CLI behavior** (approvals, exec/non-interactive mode, model selection, and prompting tactics) comes directly from the Codex docs and prompting guide. ([OpenAI Developers][2])
* **`AGENTS.md`** is the standard, open format agents (including Codex) scan for context and commands. Putting verification steps and build/test commands here measurably improves agent output quality. ([Agents][1])
* **Data migration & rollout**: use *phased* or *trickle* when risk is high; clean and dedupe data before import; set a **cutoff date**, dry-run in sandbox, and validate after cutover. ([Dynamic Consultants Group][5])
* **Implementation best practices**: align with business outcomes, define adoption loops and training, and map CRM workflows to real processes. ([Tokara Solutions][6])
* **Security & compliance**: verify vendor SOC 2 (attestation) vs ISO 27001 (certification) posture; enforce SSO/MFA, RBAC, audit logs, and documented retention/residency. ([Sprinto][7])
* **“Highly-rated” references** for market sanity checks: G2 CRM category and recent TechRadar roundup (useful for seed vendors besides Salesforce). ([G2][4])

If you want, I can immediately generate the first vendor YAML stubs and a default `criteria.yml` tuned for **SMB marketing-led teams** vs **mid-market sales-ops**—so Codex has concrete files to chew on next.

[1]: https://agents.md/ "AGENTS.md"
[2]: https://developers.openai.com/codex/cli/ "Codex CLI"
[3]: https://thegroove.io/blog/data-migration-best-practices "Top Data Migration Best Practices for Success"
[4]: https://www.g2.com/categories/crm "Best CRM Software: User Reviews from September 2025"
[5]: https://dynamicconsultantsgroup.com/resources/crm/data-migration-best-practices-and-strategies "Data Migration Best Practices and Strategies"
[6]: https://www.tokarasolutions.com/2025/03/26/crm-implementation-guide/ "Complete Guide to Successful CRM Implementation"
[7]: https://sprinto.com/blog/soc-2-vs-iso-27001/ "SOC 2 vs ISO 27001: What's the Difference?"
