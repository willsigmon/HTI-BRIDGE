from crm_eval.report import build_scorecard_payload, render_markdown_scorecard
from crm_eval.scoring import rank_vendors


def _make_results(criteria_config, make_vendor_record):
    vendor = make_vendor_record(name="Prime CRM")
    vendor_two = make_vendor_record(name="Second CRM")
    results = rank_vendors([vendor, vendor_two], criteria_config)
    return results


def test_build_scorecard_payload_contains_shortlist(criteria_config, make_vendor_record):
    results = _make_results(criteria_config, make_vendor_record)
    profile = {"company_size": "50-100", "regions": ["US"]}
    payload = build_scorecard_payload(profile, results, criteria_config, shortlist_size=1)
    assert payload["schema"] == "crm-eval-scorecard/v1"
    assert len(payload["shortlist"]) == 1
    assert payload["shortlist"][0]["rank"] == 1


def test_render_markdown_contains_table(criteria_config, make_vendor_record):
    results = _make_results(criteria_config, make_vendor_record)
    profile = {"company_size": "50-100", "regions": ["US"]}
    markdown = render_markdown_scorecard(profile, results, criteria_config, shortlist_size=2)
    assert "| Rank | Vendor |" in markdown
    assert "## Profile Snapshot" in markdown
