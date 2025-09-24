import pytest

from crm_eval.scoring import DEFAULT_MISSING_SCORE, rank_vendors, score_vendor


def test_score_vendor_defaults_missing(criteria_config, make_vendor_record):
    vendor = make_vendor_record(scores={"sales_core": 5})
    result = score_vendor(vendor, criteria_config.weights)
    assert "integrations_apis" in result.missing_metrics
    expected_default = (DEFAULT_MISSING_SCORE / 5) * criteria_config.weights["integrations_apis"]
    assert result.breakdown["integrations_apis"]["weighted"] == pytest.approx(expected_default)


def test_score_vendor_invalid_value(criteria_config, make_vendor_record):
    vendor = make_vendor_record(scores={"sales_core": "not-a-number"})
    with pytest.raises(ValueError):
        score_vendor(vendor, criteria_config.weights)


def test_rank_vendors_deterministic(criteria_config, make_vendor_record):
    vendor_a = make_vendor_record(name="Alpha CRM")
    vendor_b = make_vendor_record(name="Beta CRM")
    results_one = rank_vendors([vendor_a, vendor_b], criteria_config)
    results_two = rank_vendors([vendor_a, vendor_b], criteria_config)
    assert [r.total for r in results_one] == [r.total for r in results_two]
    assert [r.vendor.name for r in results_one] == [r.vendor.name for r in results_two]


def test_rank_vendors_tiebreaker(criteria_config, make_vendor_record):
    scores = {metric: 4 for metric in criteria_config.weights}
    vendor_a = make_vendor_record(name="Zeta", scores=scores)
    vendor_b = make_vendor_record(name="Alpha", scores=scores)
    ranked = rank_vendors([vendor_a, vendor_b], criteria_config)
    assert [result.vendor.name for result in ranked] == ["Alpha", "Zeta"]


def test_score_vendor_clamps(criteria_config, make_vendor_record):
    vendor = make_vendor_record(scores={"sales_core": 10})
    result = score_vendor(vendor, criteria_config.weights)
    assert result.breakdown["sales_core"]["raw"] == 5.0


def test_score_vendor_invalid_default(criteria_config, make_vendor_record):
    vendor = make_vendor_record()
    with pytest.raises(ValueError):
        score_vendor(vendor, criteria_config.weights, default_missing_score=-1)


def test_score_result_as_dict(criteria_config, make_vendor_record):
    result = score_vendor(make_vendor_record(), criteria_config.weights)
    exported = result.as_dict()
    assert exported["vendor"]["name"] == result.vendor.name
