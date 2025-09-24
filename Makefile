PYTHON := python3
RUFF := $(PYTHON) -m ruff
BLACK := $(PYTHON) -m black
PYTEST := $(PYTHON) -m pytest

check:
	$(RUFF) check . && $(BLACK) --check . && $(PYTEST) -q
fmt:
	$(RUFF) check --fix . && $(BLACK) .
demo:
	crm-eval score --profile examples/profile_smb.yml --out artifacts/scorecard.json --md artifacts/scorecard.md
