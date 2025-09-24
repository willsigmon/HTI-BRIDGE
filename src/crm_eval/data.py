"""Data loading utilities for CRM evaluator."""

from __future__ import annotations

from collections.abc import Iterator, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

__all__ = [
    "CriteriaConfig",
    "VendorRecord",
    "DataLoadError",
    "load_criteria",
    "load_vendors",
    "load_profile",
    "DEFAULT_CRITERIA_PATH",
    "DEFAULT_VENDORS_DIR",
]


class DataLoadError(RuntimeError):
    """Raised when configuration or vendor data cannot be loaded."""


@dataclass(frozen=True)
class CriteriaConfig:
    """Normalized scoring weights and descriptive scales."""

    weights: dict[str, int]
    scales: dict[int, str]

    def as_dict(self) -> dict[str, Any]:
        """Return a JSON-serialisable representation."""

        return {"weights": dict(self.weights), "scales": dict(self.scales)}


@dataclass(frozen=True)
class VendorRecord:
    """Represents a vendor YAML payload along with metadata about its source file."""

    slug: str
    name: str
    source: Path
    payload: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        """Return the payload merged with helper metadata."""

        merged = dict(self.payload)
        merged.setdefault("name", self.name)
        merged.setdefault("slug", self.slug)
        return merged

    def get_scores(self) -> Mapping[str, Any]:
        """Return the raw score dictionary from the payload, if present."""

        scores = self.payload.get("scores", {})
        if isinstance(scores, Mapping):
            return scores
        return {}

    def get_notes(self) -> list[str]:
        """Ensure notes are returned as a list of strings."""

        notes = self.payload.get("notes", [])
        if isinstance(notes, list):
            return [str(item) for item in notes]
        if isinstance(notes, str):
            return [notes]
        return []


PACKAGE_ROOT = Path(__file__).resolve().parent
REPO_ROOT = PACKAGE_ROOT.parent.parent
DEFAULT_CRITERIA_PATH = REPO_ROOT / "config" / "criteria.yml"
DEFAULT_VENDORS_DIR = REPO_ROOT / "data" / "vendors"


def load_criteria(path: Path | str | None = None) -> CriteriaConfig:
    """Load weighting criteria from YAML, validating the total reaches 100."""

    candidate_paths = _candidate_paths(path, DEFAULT_CRITERIA_PATH)
    for candidate in candidate_paths:
        if candidate.exists():
            data = _read_yaml(candidate)
            weights = data.get("weights")
            if not isinstance(weights, Mapping):
                raise DataLoadError(f"Weights missing or invalid in {candidate}.")
            normalized_weights: dict[str, int] = {}
            for key, value in weights.items():
                try:
                    normalized_weights[str(key)] = int(value)
                except (TypeError, ValueError) as exc:
                    raise DataLoadError(f"Weight for metric '{key}' must be an integer.") from exc
            total = sum(normalized_weights.values())
            if total != 100:
                raise DataLoadError(
                    f"Criteria weights must sum to 100; found {total} in {candidate}."
                )
            scales_raw = data.get("scales", {})
            normalized_scales: dict[int, str] = {}
            if isinstance(scales_raw, Mapping):
                for key, value in scales_raw.items():
                    try:
                        normalized_scales[int(key)] = str(value)
                    except (TypeError, ValueError) as exc:
                        raise DataLoadError(f"Scale key '{key}' must be castable to int.") from exc
            return CriteriaConfig(weights=normalized_weights, scales=normalized_scales)
    searched = ", ".join(str(p) for p in candidate_paths)
    raise DataLoadError(f"Unable to locate criteria configuration. Searched: {searched}.")


def load_vendors(directory: Path | str | None = None) -> list[VendorRecord]:
    """Load CRM vendor payloads from YAML files, skipping Salesforce entries."""

    candidate_dirs = _candidate_paths(directory, DEFAULT_VENDORS_DIR)
    for candidate in candidate_dirs:
        if candidate.is_dir():
            vendor_records: list[VendorRecord] = []
            for path in sorted(candidate.glob("*.yml")) + sorted(candidate.glob("*.yaml")):
                slug = path.stem.lower()
                if slug.startswith("salesforce"):
                    continue
                payload = _read_yaml(path)
                if not isinstance(payload, Mapping) or not payload:
                    raise DataLoadError(f"Vendor file {path} is empty or invalid.")
                name = str(payload.get("name") or _derive_name_from_slug(slug))
                merged_payload = dict(payload)
                merged_payload["name"] = name
                vendor_records.append(
                    VendorRecord(slug=slug, name=name, source=path, payload=merged_payload)
                )
            if not vendor_records:
                raise DataLoadError(f"No vendor files found in {candidate}.")
            return vendor_records
    searched = ", ".join(str(p) for p in candidate_dirs)
    raise DataLoadError(f"Unable to locate vendor directory. Searched: {searched}.")


def load_profile(path: Path | str) -> dict[str, Any]:
    """Load a business profile YAML file for scoring context."""

    profile_path = Path(path)
    if not profile_path.exists():
        raise DataLoadError(f"Profile not found: {profile_path}")
    data = _read_yaml(profile_path)
    if not isinstance(data, Mapping) or not data:
        raise DataLoadError(f"Profile at {profile_path} is empty or invalid.")
    return dict(data)


def _candidate_paths(
    supplied: Path | str | None,
    default: Path,
) -> Iterator[Path]:
    """Yield candidate paths to search, deduplicated and ordered by priority."""

    seen: set[Path] = set()
    if supplied is not None:
        supplied_path = Path(supplied).expanduser().resolve()
        if supplied_path not in seen:
            seen.add(supplied_path)
            yield supplied_path
    try:
        relative_default = default.relative_to(REPO_ROOT)
    except ValueError:
        relative_default = default.name if default.is_file() else default
    cwd_candidate = (Path.cwd() / relative_default).resolve()
    if cwd_candidate not in seen:
        seen.add(cwd_candidate)
        yield cwd_candidate
    default_resolved = default.resolve()
    if default_resolved not in seen:
        seen.add(default_resolved)
        yield default_resolved


def _read_yaml(path: Path) -> dict[str, Any]:
    """Safely read a YAML file, returning an empty dict when the file is blank."""

    try:
        with path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}
    except FileNotFoundError as exc:
        raise DataLoadError(f"File not found: {path}") from exc
    except yaml.YAMLError as exc:
        raise DataLoadError(f"YAML parsing error in {path}: {exc}") from exc
    if not isinstance(data, Mapping):
        raise DataLoadError(f"Expected mapping at {path}; found {type(data).__name__}.")
    return dict(data)


def _derive_name_from_slug(slug: str) -> str:
    """Convert a filename slug into a human-friendly vendor name."""

    parts = slug.replace("_", " ").split()
    return " ".join(part.capitalize() for part in parts) or slug
