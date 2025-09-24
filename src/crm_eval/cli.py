"""Command-line interface for CRM evaluator."""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from .data import DataLoadError, load_criteria, load_profile, load_vendors
from .integrate import build_integration_notes
from .migration import build_migration_plan
from .report import build_scorecard_payload, render_markdown_scorecard
from .scoring import rank_vendors
from .security import build_security_checklist

DEFAULT_TOP_N = 5

__all__ = ["main"]


def main(argv: Iterable[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    if not hasattr(args, "handler"):
        parser.print_help()
        return 1
    try:
        return args.handler(args)
    except DataLoadError as exc:
        parser.error(str(exc))
        return 2
    except ValueError as exc:
        parser.error(str(exc))
        return 2


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="crm-eval",
        description="Evaluate Salesforce-free CRM alternatives and produce rollout artifacts.",
    )
    parser.add_argument(
        "--vendors-dir",
        default="data/vendors",
        help="Directory containing vendor YAML definitions.",
    )
    parser.add_argument(
        "--criteria",
        default="config/criteria.yml",
        help="Path to criteria YAML file (weights/scales).",
    )

    subparsers = parser.add_subparsers(dest="command")

    score_parser = subparsers.add_parser(
        "score",
        help="Produce ranked shortlist and Markdown/JSON scorecards.",
    )
    score_parser.add_argument(
        "--profile",
        required=True,
        help="Path to the business profile YAML file.",
    )
    score_parser.add_argument(
        "--out",
        required=True,
        help="Output path for JSON scorecard.",
    )
    score_parser.add_argument(
        "--md",
        required=True,
        help="Output path for Markdown report.",
    )
    score_parser.add_argument(
        "--top",
        type=int,
        default=DEFAULT_TOP_N,
        help="Number of vendors to highlight in reports (default: 5).",
    )
    score_parser.add_argument(
        "--fetch-ratings",
        action="store_true",
        help=(
            "Optional network call for live ratings (requires explicit approval; "
            "disabled by default)."
        ),
    )
    score_parser.set_defaults(handler=_handle_score)

    migrate_parser = subparsers.add_parser(
        "migrate",
        help="Draft a phased migration and rollout plan.",
    )
    migrate_parser.add_argument(
        "--profile",
        required=True,
        help="Path to the business profile YAML file.",
    )
    migrate_parser.add_argument(
        "--out",
        required=True,
        help="Output path for migration Markdown document.",
    )
    migrate_parser.add_argument(
        "--top",
        type=int,
        default=3,
        help="Number of vendors to feature in the plan (default: 3).",
    )
    migrate_parser.set_defaults(handler=_handle_migrate)

    security_parser = subparsers.add_parser(
        "security",
        help="Generate security and compliance checklist.",
    )
    security_parser.add_argument(
        "--out",
        required=True,
        help="Output path for security Markdown checklist.",
    )
    security_parser.add_argument(
        "--top",
        type=int,
        default=5,
        help="Number of vendors to survey (default: 5).",
    )
    security_parser.set_defaults(handler=_handle_security)

    integrate_parser = subparsers.add_parser(
        "integrate",
        help="Provide integration notes and verification steps.",
    )
    integrate_parser.add_argument(
        "--profile",
        required=True,
        help="Path to the business profile YAML file.",
    )
    integrate_parser.add_argument(
        "--out",
        required=True,
        help="Output path for integration Markdown notes.",
    )
    integrate_parser.add_argument(
        "--top",
        type=int,
        default=3,
        help="Number of vendors to highlight (default: 3).",
    )
    integrate_parser.set_defaults(handler=_handle_integrate)

    return parser


def _handle_score(args: argparse.Namespace) -> int:
    if getattr(args, "fetch_ratings", False):
        raise ValueError(
            "--fetch-ratings is disabled in offline mode. Remove the flag or enable "
            "a networked implementation."
        )

    profile = load_profile(args.profile)
    criteria = load_criteria(args.criteria)
    vendors = load_vendors(args.vendors_dir)
    results = rank_vendors(vendors, criteria)

    payload = build_scorecard_payload(
        profile,
        results,
        criteria,
        shortlist_size=max(1, args.top),
    )
    markdown = render_markdown_scorecard(
        profile,
        results,
        criteria,
        shortlist_size=max(1, args.top),
    )

    _write_json(args.out, payload)
    _write_text(args.md, markdown)

    top_names = ", ".join(entry["name"] for entry in payload["shortlist"][:3])
    print(
        f"Scorecard generated. JSON saved to {args.out}; Markdown saved to {args.md}."
        f" Top picks: {top_names}",
        file=sys.stdout,
    )
    return 0


def _handle_migrate(args: argparse.Namespace) -> int:
    profile = load_profile(args.profile)
    criteria = load_criteria(args.criteria)
    vendors = load_vendors(args.vendors_dir)
    results = rank_vendors(vendors, criteria)

    markdown = build_migration_plan(profile, results, shortlist_size=max(1, args.top))
    _write_text(args.out, markdown)
    print(f"Migration plan saved to {args.out}.", file=sys.stdout)
    return 0


def _handle_security(args: argparse.Namespace) -> int:
    criteria = load_criteria(args.criteria)
    vendors = load_vendors(args.vendors_dir)
    results = rank_vendors(vendors, criteria)
    markdown = build_security_checklist(results, shortlist_size=max(1, args.top))
    _write_text(args.out, markdown)
    print(f"Security checklist saved to {args.out}.", file=sys.stdout)
    return 0


def _handle_integrate(args: argparse.Namespace) -> int:
    profile = load_profile(args.profile)
    criteria = load_criteria(args.criteria)
    vendors = load_vendors(args.vendors_dir)
    results = rank_vendors(vendors, criteria)
    markdown = build_integration_notes(profile, results, shortlist_size=max(1, args.top))
    _write_text(args.out, markdown)
    print(f"Integration notes saved to {args.out}.", file=sys.stdout)
    return 0


def _write_json(path: str, payload: Any) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write("\n")


def _write_text(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as handle:
        handle.write(content)


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
