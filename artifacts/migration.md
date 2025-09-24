# CRM Migration & Rollout Plan

**Context:** Planning for a 10-50 organisation in services across US.

## Recommended Vendors To Validate

1. **HubSpot CRM** — score 91.80/100
   - Highlights: Strengths: unified marketing/sales platform, deep automation.
   - iPaaS / connectors: Zapier, Make, Workato
   - APIs/webhooks: REST
2. **Microsoft Dynamics 365 Sales** — score 88.60/100
   - Highlights: Strengths: deep enterprise extensibility across Power Platform.
   - iPaaS / connectors: Power Automate, MuleSoft
   - APIs/webhooks: REST, OData
3. **Creatio** — score 83.60/100
   - Highlights: Strengths: unified platform for sales, service, and marketing with strong low-code tools.
   - iPaaS / connectors: Workato, MuleSoft
   - APIs/webhooks: REST, SOAP

## Phase 0 – Preparation (Weeks -6 to -2)
- Inventory objects, fields, automations, and integration touchpoints.
- Dedupe records and lock a stakeholder-approved historical cutoff date.
- Map legacy IDs to targets; script dry-run migrations in the sandbox.
- Back up source systems and stage anonymised samples for testing.
- Define success metrics and confirm executive sponsor plus champion team.

## Phase 1 – Pilot (Weeks -2 to 0)
- Configure sandbox; enable SSO/MFA, RBAC, and audit logging pre-import.
- Import cleansed pilot data; validate mappings, workflows, and reports.
- Run UAT with the pilot cohort and capture feedback in weeks 1 and 3.
- Document comms, ticketing, and marketing handoffs; verify with fixtures.
- Finalise comms plan for training, blackout window, and rollback path.

## Phase 2 – Staged Rollout (Weeks 1 to 4)
- Roll out by unit/region; batch remaining records with named owners.
- Reconcile counts each batch; refresh search and reconnect integrations.
- Retire shadow sheets; redirect legacy URLs to the workspace.
- Deliver enablement sessions, office hours, and champion-led refreshers.

## Cutover & Downtime Planning
- Cut over in low-activity windows; freeze legacy updates 24h pre-export.
- Maintain rollback snapshots/scripts to restore the legacy system quickly.
- Communicate downtime, escalation, and support channels to every team.

## Post-Migration Validation & Hypercare (Weeks 1 to 4)
- Reconcile totals, stages, and activity logs; spot-check sample accounts.
- Monitor automations, integrations, and webhooks; run daily smoke tests.
- Track adoption metrics and refresh the training backlog as needed.
- Keep hypercare running 2–4 weeks with daily triage before hand-off.

## Verification Checklists

**Pre-migration**
- ✅ Cutoff date documented and approved
- ✅ Data dictionary and ID mappings reviewed
- ✅ Full backups stored and restore tested

**Pilot exit**
- ✅ Sandbox import dry-run signed off
- ✅ SSO/MFA enforced; RBAC validated
- ✅ Integrations smoke-tested with retries and idempotency

**Post-cutover**
- ✅ Record counts reconciled vs. source
- ✅ User feedback captured in week 1 and week 3
- ✅ Shadow spreadsheets archived and access revoked

## Adoption Actions
- Nominate champions per team; publish quick-start guides and videos.
- Review adoption KPIs weekly and close any gaps quickly.
- Maintain a feedback backlog for continuous roadmap tuning.
