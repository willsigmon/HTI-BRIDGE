# HTI-BRIDGE Quick Start Guide

## 🚀 Your System is Running!

The HTI-BRIDGE CRM system is now fully operational with both the backend API and frontend dashboard running.

---

## 🌐 Access Points

### **Web Dashboard**
Open in your browser:
```
http://localhost:3000
```

### **Backend API**
```
http://localhost:4000
```

### **API Health Check**
```
http://localhost:4000/healthz
```

---

## 📊 What's Working

### ✅ Backend API (Port 4000)
- **Bootstrap endpoint**: All CRM data in one call
- **Leads management**: Create, read, update, delete leads
- **Pipeline management**: Kanban-style pipelines with stages
- **Automation engine**: Stage-based triggers and follow-ups
- **Grant tracking**: Milestone and compliance monitoring
- **Corporate targets**: Strategic partnership tracking
- **Settings & security**: Role-based permissions, API keys
- **Data ingestion**: Jobs for Reddit, Data.gov, GSA, etc.

### ✅ Frontend Dashboard (Port 3000)
- **Overview Dashboard**: Metrics, charts, and KPIs
- **Lead Desk**: Full lead management with filtering
- **Pipeline View**: Drag-and-drop kanban boards
- **CRM Data Hub**: Unified contact/org management with deduplication
- **Automation Studio**: Build workflow automations
- **Field Ops Map**: Geographic routing with Leaflet
- **Grant Compliance**: Track deliverables and milestones
- **Operations Console**: Monitor ingestion jobs
- **Settings Dashboard**: Configure personas and preferences

### ✅ Python CRM Evaluator
- **Score**: Rank CRM alternatives with weighted criteria
- **Migrate**: Generate phased migration plans
- **Security**: Create compliance checklists
- **Integrate**: Document integration approaches

---

## 🎯 Quick Testing

### 1. Test the Dashboard API
```bash
curl http://localhost:4000/api/dashboard | python3 -m json.tool
```

### 2. View All Leads
```bash
curl http://localhost:4000/api/leads | python3 -m json.tool
```

### 3. Create a New Lead
```bash
curl -X POST http://localhost:4000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Equipment Donation",
    "company": "Tech Company Inc",
    "contact": "Jane Smith",
    "source": "LinkedIn",
    "location": "Raleigh, NC",
    "equipmentType": "Business Laptops",
    "estimatedQuantity": 100,
    "notes": "Quarterly refresh cycle"
  }'
```

### 4. Generate CRM Evaluation Report
```bash
cd "/Users/wsig/GitHub Builds/HTI-BRIDGE"
python3 -m crm_eval.cli score \
  --profile examples/profile_smb.yml \
  --out artifacts/scorecard.json \
  --md artifacts/scorecard.md
```

### 5. Generate Migration Plan
```bash
python3 -m crm_eval.cli migrate \
  --profile examples/profile_smb.yml \
  --out artifacts/migration.md
```

---

## 📁 Key Files & Directories

### Configuration
- `server/.env` - Backend environment variables (optional, has defaults)
- `config/criteria.yml` - CRM evaluation criteria and weights
- `examples/profile_smb.yml` - Sample business profile for CRM eval

### Data
- `server/data/hti.json` - Main LowDB database file
- `data/vendors/*.yml` - CRM vendor definitions (14 vendors)
- `fixtures/bootstrap.json` - Static fallback data for demos

### Generated Artifacts
- `artifacts/scorecard.json` - CRM evaluation scores (JSON)
- `artifacts/scorecard.md` - CRM evaluation report (Markdown)
- `artifacts/migration.md` - Migration planning guide
- `artifacts/security.md` - Security checklist
- `artifacts/integration.md` - Integration notes

---

## 🔧 Common Tasks

### Restart the Backend Server
```bash
cd "/Users/wsig/GitHub Builds/HTI-BRIDGE/server"
npm start
# or for development with auto-reload:
npm run dev
```

### Restart the Frontend Server
```bash
cd "/Users/wsig/GitHub Builds/HTI-BRIDGE"
npx serve -l 3000 .
```

### Reset Database with Sample Data
```bash
cd "/Users/wsig/GitHub Builds/HTI-BRIDGE/server"
npm run seed
```

### Run Backend Tests
```bash
cd "/Users/wsig/GitHub Builds/HTI-BRIDGE/server"
npm test
```

### Run Python Tests
```bash
cd "/Users/wsig/GitHub Builds/HTI-BRIDGE"
python3 -m pytest tests/ -v
```

### Run Python Linting
```bash
cd "/Users/wsig/GitHub Builds/HTI-BRIDGE"
python3 -m ruff check .
python3 -m black --check .
```

---

## 🎨 Dashboard Features

### Navigation Tabs
1. **Overview** - Dashboard with metrics and charts
2. **Lead Desk** - Full lead management table
3. **Pipelines** - Visual kanban boards
4. **Reports** - Generate executive summaries
5. **Settings** - Configure system preferences

### More Workspaces (Dropdown)
- **CRM Data Hub** - Entity management and deduplication
- **Automation Studio** - Build workflow automations
- **Field Ops Map** - Geographic lead routing
- **Grant Compliance** - Track grant deliverables
- **Operations Console** - Monitor ingestion jobs

---

## 🔐 Security & Authentication

By default, the system runs **without authentication** for easy development.

To enable authentication:
1. Set `HTI_REQUIRE_AUTH=true` in `server/.env`
2. Set `HTI_AUTH_URL` to your SSO/login endpoint
3. Configure your reverse proxy to add `x-user-id` headers

---

## 📡 Data Ingestion

The system includes scripts to pull data from various sources:

```bash
cd server

# Reddit r/sysadmin and r/ITManagers
npm run sync:reddit

# Data.gov catalog
npm run sync:datagov

# GSA Auctions (requires HTI_GSA_API_KEY)
npm run sync:gsa

# SAM.gov opportunities (requires HTI_SAM_API_KEY)
npm run sync:sam

# GovDeals surplus (requires HTI_GOVDEALS_FEEDS)
npm run sync:govdeals

# Grants.gov (requires HTI_GRANTS_KEYWORDS)
npm run sync:grants

# Corporate refresh monitor
npm run sync:corporate

# USAspending awards
npm run sync:usaspending
```

Configure these in `server/.env` with your API keys and parameters.

---

## 🎓 CRM Evaluation Tool

### Available Commands

#### Score CRMs
```bash
python3 -m crm_eval.cli score \
  --profile examples/profile_smb.yml \
  --out artifacts/scorecard.json \
  --md artifacts/scorecard.md
```

#### Generate Migration Plan
```bash
python3 -m crm_eval.cli migrate \
  --profile examples/profile_smb.yml \
  --out artifacts/migration.md
```

#### Security Checklist
```bash
python3 -m crm_eval.cli security \
  --out artifacts/security.md
```

#### Integration Guide
```bash
python3 -m crm_eval.cli integrate \
  --profile examples/profile_smb.yml \
  --out artifacts/integration.md
```

### Customize Evaluation Criteria

Edit `config/criteria.yml` to adjust scoring weights:
```yaml
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
```

### Add New Vendors

Create a new YAML file in `data/vendors/`:
```yaml
name: "Your CRM"
plan_names: ["Starter", "Pro", "Enterprise"]
hosting: "SaaS"
website: "https://example.com"
core:
  sales_pipeline: true
  service_ticketing: true
  marketing_automation: optional
# ... (see existing vendors for full schema)
```

---

## 🐛 Troubleshooting

### Backend Won't Start
- Check if port 4000 is already in use: `lsof -i :4000`
- Verify dependencies are installed: `cd server && npm install`
- Check for database errors in console output

### Frontend Won't Load
- Check if port 3000 is already in use: `lsof -i :3000`
- Try clearing browser cache
- Check browser console for errors

### API Returns 401/403 Errors
- If `HTI_REQUIRE_AUTH=true`, you need to provide authentication
- For development, set `HTI_REQUIRE_AUTH=false` in `server/.env`

### Database Seems Corrupted
- Backup current: `cp server/data/hti.json server/data/hti.json.bak`
- Reset with sample data: `cd server && npm run seed`

### Python Tool Errors
- Verify installation: `python3 -m pip install -e ".[dev]"`
- Check Python version: `python3 --version` (needs 3.11+)
- Run tests to verify: `python3 -m pytest tests/ -v`

---

## 📝 Next Steps

1. **Explore the Dashboard** at http://localhost:3000
2. **Add Real Leads** and track them through pipelines
3. **Set Up Automations** for follow-ups and notifications
4. **Configure Data Sources** in `server/.env`
5. **Evaluate CRM Alternatives** using the Python tool
6. **Customize Personas** in Settings → Persona Buckets
7. **Deploy to Production** (see README.md for deployment guides)

---

## 💡 Pro Tips

- **Browser localStorage**: The frontend stores API base in localStorage. Clear it if switching environments.
- **PWA Installation**: Visit http://localhost:3000 and click "Install" for offline access
- **Pipeline Probability**: Each stage has a probability (10%-90%) that forecasts equipment totals
- **Persona Auto-Detection**: Leads are automatically tagged with personas based on keywords
- **Lead Scoring**: Priority scores (0-100) calculated from quantity, location, source, etc.
- **Deduplication**: Data Hub automatically detects potential duplicates via email/phone matching

---

## 📚 Documentation

- **Full README**: `/Users/wsig/GitHub Builds/HTI-BRIDGE/README.md`
- **AGENTS.md**: `/Users/wsig/GitHub Builds/HTI-BRIDGE/AGENTS.md`
- **API Docs**: See server/src/server.js for all endpoints
- **CRM Vendor Data**: `data/vendors/*.yml` (14 vendors)

---

## ✨ System Status

**Everything is working!** All components tested and verified:

- ✅ Backend API responding on port 4000
- ✅ Frontend dashboard serving on port 3000
- ✅ Database initialized with sample data
- ✅ Lead creation and management working
- ✅ Pipeline and automation features operational
- ✅ Python CRM evaluator generating reports
- ✅ All tests passing (Node.js and Python)

**Current Data:**
- **4 leads** in the system (3 sample + 1 test lead)
- **4 corporate targets** (Cisco, Red Hat, SAS, Truist)
- **1 active pipeline** with 5 stages
- **14 CRM vendors** configured for evaluation
- **96/170 digital literacy hours** logged for grant compliance

---

**Enjoy using HTI-BRIDGE!** 🎉
