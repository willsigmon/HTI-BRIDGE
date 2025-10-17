# Contributing to HTI-BRIDGE

Thank you for your interest in contributing to HTI-BRIDGE! This document provides guidelines and instructions for contributing.

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/HTI-BRIDGE.git
   cd HTI-BRIDGE
   ```
3. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Set up the development environment** (see below)
5. **Make your changes**
6. **Test your changes**
7. **Submit a pull request**

## 🛠️ Development Setup

### Backend (Node.js)

```bash
cd server
npm install
cp ../.env.example .env
# Edit .env with your configuration
npm run seed    # Load sample data
npm run dev     # Start development server
```

### Frontend

```bash
# From project root
npx serve -l 3000 .
```

Open http://localhost:3000 in your browser.

### Python CRM Evaluator

```bash
# From project root
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e ".[dev]"
pytest tests/ -v
```

## ✅ Before Submitting a PR

### Run Tests

**Backend:**
```bash
cd server
npm test
```

**Python:**
```bash
pytest tests/ -v
```

### Lint and Format

**Python:**
```bash
ruff check .
black .
```

**Backend:**
```bash
cd server
npm run lint  # If available
```

### Verify Changes Locally

1. Test backend API: `curl http://localhost:4000/healthz`
2. Test frontend loads: Open http://localhost:3000
3. Test CRM eval: `python3 -m crm_eval.cli --help`

## 📝 Commit Message Guidelines

Use clear, descriptive commit messages:

```
feat: Add new lead scoring algorithm
fix: Resolve database connection issue
docs: Update QUICKSTART guide
refactor: Simplify pipeline board logic
test: Add tests for automation engine
```

**Format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Formatting, missing semicolons, etc.
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance tasks

## 🎯 What to Contribute

### High Priority
- Bug fixes
- Performance improvements
- Test coverage improvements
- Documentation improvements
- Accessibility enhancements

### Feature Ideas
- New data ingestion sources
- Additional CRM vendors for evaluation
- Enhanced automation rules
- Improved visualizations
- Mobile-responsive improvements

### Low Priority
- Code cleanup
- Minor UI tweaks
- Dependency updates

## 🏗️ Project Structure

```
HTI-BRIDGE/
├── server/               # Express/LowDB backend
│   ├── src/
│   │   ├── server.js    # Main server
│   │   ├── repositories/ # Data access layer
│   │   └── services/    # Business logic
│   └── scripts/         # Data ingestion jobs
├── web/                 # Frontend modules
│   ├── main.js          # App entry point
│   └── modules/         # Feature modules
├── src/crm_eval/        # Python CRM evaluator
├── data/vendors/        # CRM vendor definitions
├── tests/               # Python tests
└── artifacts/           # Generated reports
```

## 🧪 Testing Guidelines

### Write Tests For
- New API endpoints
- New business logic
- Bug fixes
- Complex calculations (scoring, forecasting)

### Test Coverage Goals
- Backend repositories: >80%
- Python CRM evaluator: >90%
- Critical paths: 100%

### Example Test

```python
def test_lead_scoring():
    lead = {
        "estimatedQuantity": 100,
        "location": "Durham, NC",
        "source": "LinkedIn"
    }
    score = calculate_priority_score(lead)
    assert score >= 0 and score <= 100
    assert isinstance(score, int)
```

## 🔍 Code Review Process

1. **Automated Checks:** All PRs run CI tests automatically
2. **Manual Review:** A maintainer will review your code
3. **Feedback:** Address any requested changes
4. **Approval:** Once approved, your PR will be merged

## 📋 PR Checklist

Before submitting, ensure:

- [ ] Code follows existing style and conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated (if applicable)
- [ ] No console.log statements in production code
- [ ] No commented-out code
- [ ] No secrets or API keys committed
- [ ] .gitignore is updated for new file types
- [ ] Commits are clean and well-organized

## 🐛 Reporting Bugs

When reporting bugs, include:

1. **Description:** Clear description of the issue
2. **Steps to Reproduce:** Detailed steps
3. **Expected Behavior:** What should happen
4. **Actual Behavior:** What actually happens
5. **Environment:** OS, Node version, Python version
6. **Screenshots:** If applicable
7. **Error Messages:** Full stack traces

**Example:**

```markdown
## Bug: Lead scoring returns NaN

**Steps:**
1. Create a lead without `estimatedQuantity`
2. View lead in dashboard
3. Priority shows as "NaN"

**Expected:** Should default to 50 or show "Not Scored"
**Actual:** Shows "NaN"
**Environment:** macOS, Node 22.x, Chrome 120
```

## 💡 Feature Requests

Feature requests should include:

1. **Use Case:** Why is this needed?
2. **Proposed Solution:** How should it work?
3. **Alternatives:** Other approaches considered
4. **Impact:** Who benefits from this?

## 📞 Questions?

- **Issues:** Open a [GitHub Issue](https://github.com/willsigmon/HTI-BRIDGE/issues)
- **Discussions:** Start a [Discussion](https://github.com/willsigmon/HTI-BRIDGE/discussions)
- **Email:** For private inquiries

## 🙏 Recognition

Contributors will be:
- Listed in the project README
- Credited in release notes
- Thanked in commit messages

Thank you for making HTI-BRIDGE better! 🎉

