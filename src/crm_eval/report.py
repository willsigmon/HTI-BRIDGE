"""Report builders for CRM evaluation outputs."""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence

from .data import CriteriaConfig
from .scoring import ScoreResult

SCHEMA_VERSION = "crm-eval-scorecard/v1"

__all__ = [
    "SCHEMA_VERSION",
    "build_scorecard_payload",
    "render_markdown_scorecard",
]


def build_scorecard_payload(
    profile: Mapping[str, object],
    results: Sequence[ScoreResult],
    criteria: CriteriaConfig,
    *,
    shortlist_size: int = 5,
) -> dict[str, object]:
    """Create a deterministic JSON-serialisable payload summarising scoring results."""

    shortlist_size = max(1, shortlist_size)
    vendor_entries: list[dict[str, object]] = []
    for rank, result in enumerate(results, start=1):
        vendor_snapshot = result.vendor.as_dict()
        breakdown = {
            metric: {
                "raw": round(values["raw"], 2),
                "weighted": round(values["weighted"], 4),
                "weight": round(values["weight"], 2),
            }
            for metric, values in result.breakdown.items()
        }
        strengths, tradeoffs = _partition_notes(result.vendor.get_notes())
        vendor_entries.append(
            {
                "rank": rank,
                "name": vendor_snapshot.get("name", result.vendor.name),
                "slug": vendor_snapshot.get("slug", result.vendor.slug),
                "score": round(result.total, 2),
                "breakdown": breakdown,
                "missing_metrics": list(result.missing_metrics),
                "capabilities": vendor_snapshot.get("capabilities", []),
                "strengths": strengths,
                "tradeoffs": tradeoffs,
                "notes": vendor_snapshot.get("notes", []),
            }
        )

    payload: dict[str, object] = {
        "schema": SCHEMA_VERSION,
        "profile": dict(profile),
        "weights": dict(criteria.weights),
        "scales": dict(criteria.scales),
        "vendors": vendor_entries,
        "shortlist": vendor_entries[:shortlist_size],
    }
    return payload


def render_markdown_scorecard(
    profile: Mapping[str, object],
    results: Sequence[ScoreResult],
    criteria: CriteriaConfig,
    *,
    shortlist_size: int = 5,
) -> str:
    """Render a Markdown report mirroring the JSON payload."""

    payload = build_scorecard_payload(profile, results, criteria, shortlist_size=shortlist_size)
    lines: list[str] = []
    lines.append("# CRM Evaluation Scorecard")
    lines.append("")

    lines.append("## Profile Snapshot")
    lines.extend(_render_profile(profile))
    lines.append("")

    lines.append("## Top Vendors Overview")
    lines.append("")
    lines.extend(_render_top_table(payload["shortlist"]))
    lines.append("")

    lines.append("## Deep Dive on Top Choices")
    lines.append("")
    for entry in payload["shortlist"][:3]:
        lines.extend(_render_vendor_detail(entry))
        lines.append("")

    lines.append("## How to Use This Scorecard")
    lines.append("")
    lines.append(
        "- Compare must-have requirements with `Capabilities`; adjust weights if priorities shift."
    )
    lines.append(
        "- Investigate metrics listed under `Missing Metrics` before committing to migration."
    )
    lines.append(
        "- Re-run `crm-eval score` after updating vendor YAMLs or criteria to refresh outputs."
    )
    lines.append("")

    return "\n".join(lines).strip() + "\n"


def _partition_notes(notes: Iterable[str]) -> tuple[list[str], list[str]]:
    strengths: list[str] = []
    tradeoffs: list[str] = []
    for note in notes:
        note_clean = note.strip()
        lowered = note_clean.lower()
        if lowered.startswith("strengths:"):
            strengths.append(note_clean.split(":", 1)[1].strip() or note_clean)
        elif lowered.startswith("trade-offs:") or lowered.startswith("tradeoffs:"):
            tradeoffs.append(note_clean.split(":", 1)[1].strip() or note_clean)
        else:
            strengths.append(note_clean)
    return strengths, tradeoffs


def _render_profile(profile: Mapping[str, object]) -> list[str]:
    bullets: list[str] = []
    company_size = profile.get("company_size", "unspecified")
    industry = profile.get("industry", "unspecified industry")
    regions_value = profile.get("regions", "global")
    if isinstance(regions_value, list):
        regions = ", ".join(str(item) for item in regions_value)
    else:
        regions = str(regions_value)
    budget = profile.get("budget_per_user_per_month")
    budget_str = f"${budget}" if budget is not None else "not provided"
    must_have = _format_list(profile.get("must_have", []))
    nice_to_have = _format_list(profile.get("nice_to_have", []))

    bullets.append(f"- Company size: {company_size}; Industry: {industry}; Regions: {regions}")
    bullets.append(f"- Budget per user/month: {budget_str}")
    bullets.append(f"- Must-have capabilities: {must_have}")
    bullets.append(f"- Nice-to-have capabilities: {nice_to_have}")
    return bullets


def _format_list(values: object) -> str:
    if isinstance(values, Iterable) and not isinstance(values, (str, bytes)):
        items = [str(item) for item in values]
        return ", ".join(items) if items else "none listed"
    if isinstance(values, (str, bytes)):
        return str(values)
    return "none listed"


def _render_top_table(shortlist: Sequence[Mapping[str, object]]) -> list[str]:
    header = "| Rank | Vendor | Score | Highlights |"
    divider = "| ---: | :----- | ----: | :--------- |"
    rows = [header, divider]
    for entry in shortlist:
        strengths = entry.get("strengths", [])
        tradeoffs = entry.get("tradeoffs", [])
        highlight_parts: list[str] = []
        if strengths:
            highlight_parts.append(f"+ {strengths[0]}")
        if tradeoffs:
            highlight_parts.append(f"– {tradeoffs[0]}")
        highlight_text = (
            "<br>".join(highlight_parts) if highlight_parts else "Review detailed notes"
        )
        rows.append(
            f"| {entry['rank']} | {entry['name']} | {entry['score']:.2f} | {highlight_text} |"
        )
    return rows


def _render_vendor_detail(entry: Mapping[str, object]) -> list[str]:
    lines: list[str] = []
    name = entry.get("name", "Unnamed Vendor")
    score = entry.get("score", 0.0)
    lines.append(f"### {entry['rank']}. {name} — {score:.2f}/100")
    lines.append("")
    strengths = entry.get("strengths", [])
    tradeoffs = entry.get("tradeoffs", [])
    capabilities = entry.get("capabilities", [])
    missing = entry.get("missing_metrics", [])

    if strengths:
        lines.append("- Strengths: " + "; ".join(strengths))
    if tradeoffs:
        lines.append("- Watch-outs: " + "; ".join(tradeoffs))
    if capabilities:
        lines.append("- Core capabilities: " + ", ".join(str(cap) for cap in capabilities))
    if missing:
        lines.append("- Missing metrics to verify: " + ", ".join(str(item) for item in missing))
    return lines
