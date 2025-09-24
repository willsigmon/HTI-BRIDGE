"""Generate migration and rollout guidance."""

from __future__ import annotations

from collections.abc import Mapping, Sequence

from .scoring import ScoreResult

__all__ = ["build_migration_plan"]


def build_migration_plan(
    profile: Mapping[str, object],
    ranked_vendors: Sequence[ScoreResult],
    shortlist_size: int = 3,
) -> str:
    """Return a Markdown migration plan covering prep, pilot, rollout, and validation."""

    shortlist_size = max(1, shortlist_size)
    top_vendors = list(ranked_vendors[:shortlist_size])
    plan_lines: list[str] = []
    plan_lines.append("# CRM Migration & Rollout Plan")
    plan_lines.append("")

    company_size = profile.get("company_size", "unspecified")
    industry = profile.get("industry", "unspecified industry")
    regions_value = profile.get("regions", "global")
    if isinstance(regions_value, list):
        regions = ", ".join(str(item) for item in regions_value)
    else:
        regions = str(regions_value)
    plan_lines.append(
        f"**Context:** Planning for a {company_size} organisation in {industry} across {regions}."
    )
    plan_lines.append("")

    plan_lines.append("## Recommended Vendors To Validate")
    plan_lines.append("")
    for idx, result in enumerate(top_vendors, start=1):
        vendor = result.vendor.as_dict()
        strengths = vendor.get("notes", [])
        raw_integrations = vendor.get("integrations", {})
        integrations = raw_integrations if isinstance(raw_integrations, Mapping) else {}
        apis = ", ".join(integrations.get("apis", [])) if integrations else ""
        ipaas = ", ".join(integrations.get("ipaas", [])) if integrations else ""
        plan_lines.append(f"{idx}. **{vendor['name']}** — score {result.total:.2f}/100")
        if strengths:
            plan_lines.append(f"   - Highlights: {strengths[0]}")
        if ipaas:
            plan_lines.append(f"   - iPaaS / connectors: {ipaas}")
        if apis:
            plan_lines.append(f"   - APIs/webhooks: {apis}")
    plan_lines.append("")

    plan_lines.append("## Phase 0 – Preparation (Weeks -6 to -2)")
    plan_lines.append("- Inventory objects, fields, automations, and integration touchpoints.")
    plan_lines.append("- Dedupe records and lock a stakeholder-approved historical cutoff date.")
    plan_lines.append("- Map legacy IDs to targets; script dry-run migrations in the sandbox.")
    plan_lines.append("- Back up source systems and stage anonymised samples for testing.")
    plan_lines.append("- Define success metrics and confirm executive sponsor plus champion team.")
    plan_lines.append("")

    plan_lines.append("## Phase 1 – Pilot (Weeks -2 to 0)")
    plan_lines.append("- Configure sandbox; enable SSO/MFA, RBAC, and audit logging pre-import.")
    plan_lines.append("- Import cleansed pilot data; validate mappings, workflows, and reports.")
    plan_lines.append("- Run UAT with the pilot cohort and capture feedback in weeks 1 and 3.")
    plan_lines.append("- Document comms, ticketing, and marketing handoffs; verify with fixtures.")
    plan_lines.append("- Finalise comms plan for training, blackout window, and rollback path.")
    plan_lines.append("")

    plan_lines.append("## Phase 2 – Staged Rollout (Weeks 1 to 4)")
    plan_lines.append("- Roll out by unit/region; batch remaining records with named owners.")
    plan_lines.append("- Reconcile counts each batch; refresh search and reconnect integrations.")
    plan_lines.append("- Retire shadow sheets; redirect legacy URLs to the workspace.")
    plan_lines.append("- Deliver enablement sessions, office hours, and champion-led refreshers.")
    plan_lines.append("")

    plan_lines.append("## Cutover & Downtime Planning")
    plan_lines.append("- Cut over in low-activity windows; freeze legacy updates 24h pre-export.")
    plan_lines.append("- Maintain rollback snapshots/scripts to restore the legacy system quickly.")
    plan_lines.append("- Communicate downtime, escalation, and support channels to every team.")
    plan_lines.append("")

    plan_lines.append("## Post-Migration Validation & Hypercare (Weeks 1 to 4)")
    plan_lines.append("- Reconcile totals, stages, and activity logs; spot-check sample accounts.")
    plan_lines.append("- Monitor automations, integrations, and webhooks; run daily smoke tests.")
    plan_lines.append("- Track adoption metrics and refresh the training backlog as needed.")
    plan_lines.append("- Keep hypercare running 2–4 weeks with daily triage before hand-off.")
    plan_lines.append("")

    plan_lines.append("## Verification Checklists")
    plan_lines.append("")
    plan_lines.append("**Pre-migration**")
    plan_lines.extend(
        [
            "- ✅ Cutoff date documented and approved",
            "- ✅ Data dictionary and ID mappings reviewed",
            "- ✅ Full backups stored and restore tested",
        ]
    )
    plan_lines.append("")
    plan_lines.append("**Pilot exit**")
    plan_lines.extend(
        [
            "- ✅ Sandbox import dry-run signed off",
            "- ✅ SSO/MFA enforced; RBAC validated",
            "- ✅ Integrations smoke-tested with retries and idempotency",
        ]
    )
    plan_lines.append("")
    plan_lines.append("**Post-cutover**")
    plan_lines.extend(
        [
            "- ✅ Record counts reconciled vs. source",
            "- ✅ User feedback captured in week 1 and week 3",
            "- ✅ Shadow spreadsheets archived and access revoked",
        ]
    )
    plan_lines.append("")

    plan_lines.append("## Adoption Actions")
    plan_lines.append("- Nominate champions per team; publish quick-start guides and videos.")
    plan_lines.append("- Review adoption KPIs weekly and close any gaps quickly.")
    plan_lines.append("- Maintain a feedback backlog for continuous roadmap tuning.")

    return "\n".join(plan_lines).strip() + "\n"
