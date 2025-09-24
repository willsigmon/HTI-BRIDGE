from pathlib import Path

import pytest

import crm_eval.data as data_module
from crm_eval.data import (
    CriteriaConfig,
    DataLoadError,
    VendorRecord,
    load_criteria,
    load_profile,
    load_vendors,
)


def test_load_criteria_success():
    criteria = load_criteria(Path("config/criteria.yml"))
    assert sum(criteria.weights.values()) == 100
    assert 0 in criteria.scales


def test_load_criteria_invalid_sum(tmp_path: Path):
    criteria_file = tmp_path / "criteria.yml"
    criteria_file.write_text(
        "weights:\n  integrations_apis: 10\n  sales_core: 10\n",
        encoding="utf-8",
    )
    with pytest.raises(DataLoadError):
        load_criteria(criteria_file)


def test_load_vendors_skips_salesforce(tmp_path: Path):
    vendor_dir = tmp_path / "vendors"
    vendor_dir.mkdir()
    (vendor_dir / "acme.yml").write_text(
        "name: Acme\nscores:\n  sales_core: 5\n  integrations_apis: 4\n",
        encoding="utf-8",
    )
    (vendor_dir / "salesforce_cloud.yml").write_text("name: Salesforce\n", encoding="utf-8")
    vendors = load_vendors(vendor_dir)
    assert len(vendors) == 1
    assert vendors[0].name == "Acme"


def test_load_vendors_invalid_payload(tmp_path: Path):
    vendor_dir = tmp_path / "vendors"
    vendor_dir.mkdir()
    (vendor_dir / "empty.yml").write_text("", encoding="utf-8")
    with pytest.raises(DataLoadError):
        load_vendors(vendor_dir)


def test_load_vendors_empty_directory(tmp_path: Path):
    vendor_dir = tmp_path / "vendors"
    vendor_dir.mkdir()
    with pytest.raises(DataLoadError):
        load_vendors(vendor_dir)


def test_load_profile_success(tmp_path: Path):
    profile_path = tmp_path / "profile.yml"
    profile_path.write_text("company_size: mid\nregions: ['US']\n", encoding="utf-8")
    profile = load_profile(profile_path)
    assert profile["company_size"] == "mid"


def test_load_profile_invalid(tmp_path: Path):
    profile_path = tmp_path / "profile.yml"
    profile_path.write_text("- nope\n- still nope\n", encoding="utf-8")
    with pytest.raises(DataLoadError):
        load_profile(profile_path)


def test_load_profile_missing(tmp_path: Path):
    with pytest.raises(DataLoadError):
        load_profile(tmp_path / "missing.yml")


def test_load_criteria_invalid_type(tmp_path: Path):
    criteria_file = tmp_path / "criteria.yml"
    criteria_file.write_text(
        "weights:\n  integrations_apis: not-a-number\n  sales_core: 90\n",
        encoding="utf-8",
    )
    with pytest.raises(DataLoadError):
        load_criteria(criteria_file)


def test_vendor_record_helpers(tmp_path: Path):
    source = tmp_path / "record.yml"
    source.write_text("name: Example\nnotes: Single note\nscores: [1,2,3]\n", encoding="utf-8")
    record = VendorRecord(
        slug="example",
        name="Example",
        source=source,
        payload={"name": "Example", "notes": "Single note", "scores": [1, 2, 3]},
    )
    as_dict = record.as_dict()
    assert as_dict["slug"] == "example"
    assert record.get_scores() == {}
    assert record.get_notes() == ["Single note"]


def test_criteria_as_dict(sample_weights: dict[str, int]):
    criteria = CriteriaConfig(weights=sample_weights, scales={0: "absent"})
    exported = criteria.as_dict()
    assert exported["weights"] == sample_weights


def test_vendor_record_notes_other_type(tmp_path: Path):
    record = VendorRecord(
        slug="misc",
        name="Misc",
        source=tmp_path / "misc.yml",
        payload={"notes": 42},
    )
    assert record.get_notes() == []


def test_load_criteria_missing_file(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(data_module, "DEFAULT_CRITERIA_PATH", tmp_path / "nope.yml")
    with pytest.raises(DataLoadError):
        load_criteria(tmp_path / "missing.yml")


def test_load_vendors_missing_directory(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(data_module, "DEFAULT_VENDORS_DIR", tmp_path / "none")
    with pytest.raises(DataLoadError):
        load_vendors(tmp_path / "missing")


def test_load_vendors_derive_name(tmp_path: Path):
    vendor_dir = tmp_path / "vendors"
    vendor_dir.mkdir()
    (vendor_dir / "acme_cloud.yml").write_text(
        "scores:\n  sales_core: 3\n  integrations_apis: 3\n",
        encoding="utf-8",
    )
    vendors = load_vendors(vendor_dir)
    assert vendors[0].name == "Acme Cloud"


def test_read_yaml_errors(tmp_path: Path):
    with pytest.raises(DataLoadError):
        data_module._read_yaml(tmp_path / "missing.yml")

    bad_file = tmp_path / "bad.yml"
    bad_file.write_text(": : :\n", encoding="utf-8")
    with pytest.raises(DataLoadError):
        data_module._read_yaml(bad_file)


def test_candidate_paths_with_relative(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(data_module, "REPO_ROOT", tmp_path)
    default = tmp_path / "config" / "criteria.yml"
    paths = list(data_module._candidate_paths(None, default))
    assert paths[-1] == default.resolve()
