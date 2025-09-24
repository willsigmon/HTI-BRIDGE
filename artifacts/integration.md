# Integration Blueprint & Verification

## Business Priorities
- Must-have integrations/capabilities: email_calendar_sync, basic_automation
- Nice-to-have hooks: helpdesk, predictive_scoring
- Budget alignment: $30 per user/month

## Preferred Integration Strategy
- Prefer event-driven webhooks over polling to reduce lag and API usage.
- Design idempotent endpoints and persist dedupe keys for safe retries.
- Apply exponential backoff plus dead-letter queues for transient errors.
- Keep secrets in a vault and rotate credentials on a quarterly cadence.
- Ship replayable fixtures and contract tests for lead/opportunity flows.

## Vendor Capabilities Snapshot

- **HubSpot CRM** (score 91.80)
  - APIs: REST; SDKs: JavaScript, Python
  - Webhooks available: True
  - iPaaS connectors: Zapier, Make, Workato
  - Profile-aligned capabilities: email_calendar_sync, basic_automation, predictive_scoring, helpdesk, chat, knowledge_base
- **Microsoft Dynamics 365 Sales** (score 88.60)
  - APIs: REST, OData; SDKs: .NET, JavaScript
  - Webhooks available: True
  - iPaaS connectors: Power Automate, MuleSoft
  - Profile-aligned capabilities: email_calendar_sync, basic_automation, predictive_scoring, enterprise_rbac, helpdesk
- **Creatio** (score 83.60)
  - APIs: REST, SOAP; SDKs: .NET, JavaScript
  - Webhooks available: True
  - iPaaS connectors: Workato, MuleSoft
  - Profile-aligned capabilities: email_calendar_sync, basic_automation, helpdesk, predictive_scoring

## Verification Steps
1. Confirm rate limits/concurrency and document integration budgets in runbooks.
2. Run sandbox E2E tests for create/update/delete, retries, and webhook checks.
3. Choose iPaaS, first-party SDK, or custom broker and record the rationale.
4. Add structured logging plus alerting for HTTP failures and SLA breaches.
5. Re-validate integrations after cutover and each CRM release.

## Decision Matrix
| Option | When to Choose | Trade-offs |
| :----- | :------------- | :--------- |
| iPaaS platform | Fast multi-SaaS delivery | Subscription cost; limited control |
| First-party SDK | Deep vendor alignment | More engineering lift; language limits |
| Custom broker | Complex hybrid landscape | Requires ongoing DevOps investment |
