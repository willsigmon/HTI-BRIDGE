import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from crm_eval.data import CriteriaConfig, VendorRecord  # noqa: E402


@pytest.fixture
def sample_weights() -> dict[str, int]:
    return {
        "integrations_apis": 12,
        "customization_extensibility": 10,
        "usability_admin": 10,
        "analytics_ai": 10,
        "security_compliance": 10,
        "sales_core": 15,
        "service": 7,
        "marketing": 7,
        "pricing_tco": 9,
        "data_migration_portability": 5,
        "support_ecosystem_viability": 5,
    }


@pytest.fixture
def criteria_config(sample_weights: dict[str, int]) -> CriteriaConfig:
    return CriteriaConfig(weights=sample_weights, scales={0: "absent", 5: "excellent"})


@pytest.fixture
def make_vendor_record(tmp_path: Path, sample_weights: dict[str, int]):
    def factory(name: str = "Test CRM", scores: dict[str, float] | None = None) -> VendorRecord:
        payload_scores = scores or {metric: 4 for metric in sample_weights}
        payload = {
            "name": name,
            "scores": payload_scores,
            "notes": ["Strengths: solid option", "Trade-offs: higher training effort"],
        }
        vendor_path = tmp_path / f"{name.lower().replace(' ', '_')}.yml"
        vendor_path.write_text(f'name: "{name}"\n', encoding="utf-8")
        return VendorRecord(slug=vendor_path.stem, name=name, source=vendor_path, payload=payload)

    return factory
