"""Scoring logic for CRM vendor evaluation."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from .data import CriteriaConfig, VendorRecord

__all__ = ["ScoreResult", "score_vendor", "rank_vendors"]

DEFAULT_MISSING_SCORE = 2.0


@dataclass(frozen=True)
class ScoreResult:
    """Represents weighted score output for a single vendor."""

    vendor: VendorRecord
    total: float
    breakdown: dict[str, dict[str, float]]
    missing_metrics: list[str]

    def as_dict(self) -> dict[str, Any]:
        return {
            "vendor": self.vendor.as_dict(),
            "score": round(self.total, 2),
            "breakdown": {
                metric: {
                    "raw": round(values["raw"], 2),
                    "weighted": round(values["weighted"], 4),
                    "weight": values["weight"],
                }
                for metric, values in self.breakdown.items()
            },
            "missing_metrics": list(self.missing_metrics),
        }


def score_vendor(
    vendor: VendorRecord,
    weights: Mapping[str, int],
    *,
    default_missing_score: float = DEFAULT_MISSING_SCORE,
) -> ScoreResult:
    """Calculate the weighted score for a vendor using the provided metric weights."""

    if default_missing_score < 0 or default_missing_score > 5:
        raise ValueError("default_missing_score must be between 0 and 5 inclusive.")

    breakdown: dict[str, dict[str, float]] = {}
    missing_metrics: list[str] = []
    total_score = 0.0

    raw_scores = vendor.get_scores()
    for metric, weight in weights.items():
        raw_value = raw_scores.get(metric)
        if raw_value is None:
            raw_value = default_missing_score
            missing_metrics.append(metric)
        try:
            raw_float = float(raw_value)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Score for metric '{metric}' in vendor '{vendor.name}' must be numeric."
            ) from exc
        raw_clamped = max(0.0, min(5.0, raw_float))
        weighted_score = (raw_clamped / 5.0) * float(weight)
        breakdown[metric] = {
            "raw": raw_clamped,
            "weighted": weighted_score,
            "weight": float(weight),
        }
        total_score += weighted_score

    return ScoreResult(
        vendor=vendor,
        total=round(total_score, 4),
        breakdown=breakdown,
        missing_metrics=missing_metrics,
    )


def rank_vendors(
    vendors: Sequence[VendorRecord],
    criteria: CriteriaConfig,
    *,
    default_missing_score: float = DEFAULT_MISSING_SCORE,
) -> list[ScoreResult]:
    """Score and rank vendors, returning results sorted by total descending then name."""

    results = [
        score_vendor(vendor, criteria.weights, default_missing_score=default_missing_score)
        for vendor in vendors
    ]
    results.sort(key=lambda item: (-item.total, item.vendor.name.lower()))
    return results
