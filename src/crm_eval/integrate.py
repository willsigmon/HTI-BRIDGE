"""Integration planning notes."""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence

from .scoring import ScoreResult

__all__ = ["build_integration_notes"]


def build_integration_notes(
    profile: Mapping[str, object],
    ranked_vendors: Sequence[ScoreResult],
    *,
    shortlist_size: int = 3,
) -> str:
    """Produce Markdown guidance for integrations and verification steps."""

    shortlist_size = max(1, shortlist_size)
    top_vendors = list(ranked_vendors[:shortlist_size])
    lines: list[str] = []
    lines.append("# Integration Blueprint & Verification")
    lines.append("")

    lines.append("## Business Priorities")
    must_have = _format_items(profile.get("must_have", []))
    nice_to_have = _format_items(profile.get("nice_to_have", []))
    lines.append(f"- Must-have integrations/capabilities: {must_have}")
    lines.append(f"- Nice-to-have hooks: {nice_to_have}")
    budget = profile.get("budget_per_user_per_month", "unspecified")
    lines.append(f"- Budget alignment: ${budget} per user/month")
    lines.append("")

    lines.append("## Preferred Integration Strategy")
    lines.append("- Prefer event-driven webhooks over polling to reduce lag and API usage.")
    lines.append("- Design idempotent endpoints and persist dedupe keys for safe retries.")
    lines.append("- Apply exponential backoff plus dead-letter queues for transient errors.")
    lines.append("- Keep secrets in a vault and rotate credentials on a quarterly cadence.")
    lines.append("- Ship replayable fixtures and contract tests for lead/opportunity flows.")
    lines.append("")

    lines.append("## Vendor Capabilities Snapshot")
    lines.append("")
    for result in top_vendors:
        vendor = result.vendor.as_dict()
        raw_integrations = vendor.get("integrations", {})
        integrations = raw_integrations if isinstance(raw_integrations, Mapping) else {}
        apis = ", ".join(integrations.get("apis", [])) if integrations else ""
        ipaas = ", ".join(integrations.get("ipaas", [])) if integrations else ""
        sdks = ", ".join(integrations.get("sdks", [])) if integrations else ""
        webhooks = integrations.get("webhooks") if integrations else "?"
        lines.append(f"- **{vendor['name']}** (score {result.total:.2f})")
        lines.append(
            f"  - APIs: {apis or 'documented REST endpoints'}; " f"SDKs: {sdks or 'via REST/OData'}"
        )
        lines.append(f"  - Webhooks available: {webhooks}")
        if ipaas:
            lines.append(f"  - iPaaS connectors: {ipaas}")
        capabilities = vendor.get("capabilities", [])
        if capabilities:
            cap_text = ", ".join(map(str, capabilities))
            lines.append(f"  - Profile-aligned capabilities: {cap_text}")
        missing = result.missing_metrics
        if missing:
            lines.append(f"  - Metrics requiring validation: {', '.join(missing)}")
    lines.append("")

    lines.append("## Verification Steps")
    lines.append("1. Confirm rate limits/concurrency and document integration budgets in runbooks.")
    lines.append("2. Run sandbox E2E tests for create/update/delete, retries, and webhook checks.")
    lines.append("3. Choose iPaaS, first-party SDK, or custom broker and record the rationale.")
    lines.append("4. Add structured logging plus alerting for HTTP failures and SLA breaches.")
    lines.append("5. Re-validate integrations after cutover and each CRM release.")
    lines.append("")

    lines.append("## Decision Matrix")
    lines.append("| Option | When to Choose | Trade-offs |")
    lines.append("| :----- | :------------- | :--------- |")
    lines.append(
        "| iPaaS platform | Fast multi-SaaS delivery | Subscription cost; limited control |"
    )
    lines.append(
        "| First-party SDK | Deep vendor alignment | More engineering lift; language limits |"
    )
    lines.append(
        "| Custom broker | Complex hybrid landscape | Requires ongoing DevOps investment |"
    )

    return "\n".join(lines).strip() + "\n"


def _format_items(value: object) -> str:
    if isinstance(value, Iterable) and not isinstance(value, (str, bytes)):
        items = [str(item) for item in value]
        return ", ".join(items) if items else "none listed"
    if isinstance(value, (str, bytes)):
        return str(value)
    return "none listed"
