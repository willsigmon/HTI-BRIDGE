import json
from pathlib import Path

import pytest

from crm_eval import cli


@pytest.fixture
def sample_environment(tmp_path: Path):
    vendors_dir = tmp_path / "vendors"
    vendors_dir.mkdir()
    (vendors_dir / "alpha.yml").write_text(
        """
name: Alpha CRM
scores:
  integrations_apis: 5
  customization_extensibility: 4
  usability_admin: 4
  analytics_ai: 3
  security_compliance: 4
  sales_core: 5
  service: 3
  marketing: 3
  pricing_tco: 4
  data_migration_portability: 3
  support_ecosystem_viability: 4
notes:
  - "Strengths: fast to deploy"
  - "Trade-offs: fewer enterprise controls"
        """.strip(),
        encoding="utf-8",
    )
    (vendors_dir / "beta.yml").write_text(
        """
name: Beta CRM
scores:
  integrations_apis: 4
  customization_extensibility: 4
  usability_admin: 5
  analytics_ai: 4
  security_compliance: 4
  sales_core: 4
  service: 4
  marketing: 4
  pricing_tco: 3
  data_migration_portability: 4
  support_ecosystem_viability: 3
notes:
  - "Strengths: balanced feature set"
  - "Trade-offs: pricing higher"
        """.strip(),
        encoding="utf-8",
    )

    criteria_file = tmp_path / "criteria.yml"
    criteria_file.write_text(
        """
weights:
  integrations_apis: 12
  customization_extensibility: 10
  usability_admin: 10
  analytics_ai: 10
  security_compliance: 10
  sales_core: 15
  service: 7
  marketing: 7
  pricing_tco: 9
  data_migration_portability: 5
  support_ecosystem_viability: 5
scales:
  0: absent
  5: excellent
        """.strip(),
        encoding="utf-8",
    )

    profile_file = tmp_path / "profile.yml"
    profile_file.write_text(
        """
company_size: "50-100"
regions: ["US"]
must_have: ["email_calendar_sync"]
        """.strip(),
        encoding="utf-8",
    )

    return {
        "vendors": vendors_dir,
        "criteria": criteria_file,
        "profile": profile_file,
    }


def test_cli_score_happy_path(sample_environment, tmp_path: Path, capsys):
    json_path = tmp_path / "score.json"
    md_path = tmp_path / "score.md"
    exit_code = cli.main(
        [
            "--vendors-dir",
            str(sample_environment["vendors"]),
            "--criteria",
            str(sample_environment["criteria"]),
            "score",
            "--profile",
            str(sample_environment["profile"]),
            "--out",
            str(json_path),
            "--md",
            str(md_path),
            "--top",
            "1",
        ]
    )
    assert exit_code == 0
    captured = capsys.readouterr()
    assert json_path.exists() and md_path.exists()
    payload = json.loads(json_path.read_text(encoding="utf-8"))
    assert payload["shortlist"][0]["rank"] == 1
    assert "Scorecard generated." in captured.out


def test_cli_score_fetch_ratings_disabled(sample_environment):
    json_path = sample_environment["profile"].parent / "score.json"
    md_path = sample_environment["profile"].parent / "score.md"
    with pytest.raises(SystemExit):
        cli.main(
            [
                "--vendors-dir",
                str(sample_environment["vendors"]),
                "--criteria",
                str(sample_environment["criteria"]),
                "score",
                "--profile",
                str(sample_environment["profile"]),
                "--out",
                str(json_path),
                "--md",
                str(md_path),
                "--fetch-ratings",
            ]
        )
