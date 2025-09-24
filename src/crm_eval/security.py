"""Security and compliance checklist generator."""

from __future__ import annotations

from collections.abc import Mapping, Sequence

from .scoring import ScoreResult

__all__ = ["build_security_checklist"]


def build_security_checklist(
    ranked_vendors: Sequence[ScoreResult],
    *,
    shortlist_size: int = 5,
) -> str:
    """Generate a Markdown security/compliance checklist informed by top vendors."""

    shortlist_size = max(1, shortlist_size)
    top_vendors = list(ranked_vendors[:shortlist_size])
    lines: list[str] = []
    lines.append("# Security & Compliance Checklist")
    lines.append("")

    lines.append("## Identity & Access")
    lines.append("- Enforce SSO (SAML/OIDC) and MFA prior to production go-live.")
    lines.append("- Map least-privilege RBAC roles; review admin scopes quarterly.")
    lines.append("- Enable audit logging and archive read-only copies for compliance.")
    lines.append("")

    lines.append("## Data Protection")
    lines.append("- Verify TLS 1.2+ in transit and encryption at rest for all storage layers.")
    lines.append("- Rotate API keys/OAuth secrets; constrain scopes to least privilege.")
    lines.append("- Validate webhook signatures and enable replay protection.")
    lines.append("")

    lines.append("## Regulatory & Contractual Controls")
    lines.append("- Collect SOC 2 Type II or ISO 27001 evidence; track renewal dates.")
    lines.append("- Execute a DPA with clear residency commitments (US/EU as needed).")
    lines.append("- Document retention policies and test backup restores regularly.")
    lines.append("")

    lines.append("## Operational Safeguards")
    lines.append("- Confirm incident response SLAs and named escalation contacts.")
    lines.append("- Stream CRM access logs to the SIEM; alert on privileged actions.")
    lines.append("- Run annual tabletops for breach, account takeover, and integration failure.")
    lines.append("")

    lines.append("## Vendor Snapshots")
    lines.append("")
    for result in top_vendors:
        vendor = result.vendor.as_dict()
        security = vendor.get("security", {})
        compliance = (
            ", ".join(security.get("compliance", [])) if isinstance(security, Mapping) else ""
        )
        sso = security.get("sso", "unspecified") if isinstance(security, Mapping) else "unspecified"
        mfa = security.get("mfa", "unspecified") if isinstance(security, Mapping) else "unspecified"
        lines.append(f"- **{vendor['name']}** (score {result.total:.2f})")
        lines.append(f"  - SSO: {sso}; MFA available: {mfa}")
        if compliance:
            lines.append(f"  - Noted attestations/certifications: {compliance}")
        data_residency = security.get("data_residency") if isinstance(security, Mapping) else None
        if data_residency:
            if isinstance(data_residency, list):
                residency = ", ".join(data_residency)
            else:
                residency = str(data_residency)
            lines.append(f"  - Data residency options: {residency}")
        missing = result.missing_metrics
        if missing:
            lines.append(f"  - Metrics to validate: {', '.join(missing)}")
    lines.append("")

    lines.append("## Verification Steps")
    lines.append("- Request latest SOC 2/ISO reports and map controls to internal policies.")
    lines.append("- Test SSO, MFA enforcement, and role provisioning in sandbox before production.")
    lines.append("- Perform quarterly access reviews and webhook/API credential rotation.")

    return "\n".join(lines).strip() + "\n"
