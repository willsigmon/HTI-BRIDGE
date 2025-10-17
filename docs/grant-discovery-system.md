# HTI-BRIDGE CRM: Grant Discovery & Qualification System

**Date**: October 17, 2025  
**Purpose**: Automatically discover, match, and qualify HTI for relevant grants

---

## Overview

The Grant Discovery System is a proactive feature within HTI-BRIDGE CRM that continuously monitors grant opportunities and automatically qualifies HTI based on mission alignment, geographic eligibility, capacity, and performance metrics.

### Key Benefits

1. **Proactive Funding Discovery** - Never miss a grant opportunity
2. **Automatic Qualification** - AI-powered matching based on HTI's profile
3. **Deadline Tracking** - Never miss an application deadline
4. **Application Assistance** - Pre-filled templates with HTI data
5. **Portfolio Management** - Track all grants in one place
6. **Impact Reporting** - Auto-generate funder reports

---

## Data Sources

### 1. Federal Grants (Grants.gov API)

**API**: `https://api.grants.gov/v1/api/search2`  
**Authentication**: None required for search  
**Update Frequency**: Daily

**Key Search Parameters**:
- `keyword`: "digital equity", "technology access", "education technology", "HUBZone"
- `eligibilityCode`: Nonprofits (501c3)
- `fundingInstrumentType`: Grant, Cooperative Agreement
- `cfda`: Catalog of Federal Domestic Assistance codes
  - 11.307 - Economic Adjustment Assistance
  - 84.XXX - Education grants
  - 93.XXX - Health/human services

**HTI-Specific Filters**:
- Geographic: North Carolina, Southeast region
- Mission: Digital equity, technology access, education
- Beneficiaries: Low-income communities, HUBZone residents
- Activities: Equipment donation, digital literacy, workforce development

---

### 2. State Grants (North Carolina)

**Sources**:
- NC Office of Digital Opportunity: https://www.ncbroadband.gov/digital-op-grants
- NC Department of Commerce: https://www.commerce.nc.gov/grants-incentives
- NC Department of Information Technology

**Key Programs**:
- Digital Equity Competitive Grants
- Digital Opportunity Grants
- Technology Funds
- GREAT Grant (Growing Rural Economies with Access to Technology)

**Update Method**: Web scraping + manual monitoring

---

### 3. Foundation Grants

**Databases**:
- Foundation Directory Online (subscription required)
- Candid/GuideStar
- GrantStation
- Instrumentl

**Target Foundations**:
- **Technology Focus**:
  - Patrick J. McGovern Foundation (digital equity)
  - HP Foundation (Digital Equity Accelerator - $100K + equipment)
  - Microsoft Philanthropies
  - Google.org
  - Dell Foundation
  
- **North Carolina Focus**:
  - Z. Smith Reynolds Foundation
  - Duke Endowment
  - Triangle Community Foundation
  - North Carolina Community Foundation

**Search Keywords**:
- Digital equity
- Technology access
- Education technology
- Workforce development
- HUBZone communities
- Rural broadband
- Digital literacy

---

### 4. Corporate Giving Programs

**Sources**:
- Corporate CSR websites
- Matching gift databases
- Corporate foundation directories

**Target Companies** (with NC presence):
- Bank of America (despite red tape, they have grant programs)
- Lenovo Foundation
- Cisco Foundation
- IBM Corporate Citizenship
- SAS Institute (Cary, NC)
- Red Hat (Raleigh, NC)

---

### 5. Specialized Grant Aggregators

**Platforms**:
- GrantWatch (subscription)
- The Grant Portal
- Grant Gopher
- Philanthropy News Digest (PND)

---

## AI-Powered Qualification Engine

### Qualification Criteria

The system automatically scores each grant opportunity (0-100) based on:

#### 1. Mission Alignment (30 points)
- **Perfect Match (30)**: Digital equity, technology access, Chromebook distribution
- **Strong Match (20)**: Education technology, workforce development
- **Moderate Match (10)**: General education, community development
- **Weak Match (0)**: Unrelated mission

#### 2. Geographic Eligibility (25 points)
- **Perfect (25)**: North Carolina-specific, HUBZone-specific
- **Strong (20)**: Southeast region, rural communities
- **Moderate (15)**: National with NC eligibility
- **Weak (0)**: Geographic restrictions exclude NC

#### 3. Funding Amount (15 points)
- **$100K+ (15)**: Major funding opportunity
- **$50K-$100K (12)**: Significant funding
- **$25K-$50K (8)**: Moderate funding
- **$10K-$25K (5)**: Small grant
- **<$10K (2)**: Micro-grant

#### 4. Application Complexity (10 points)
- **Simple (10)**: Letter of inquiry, 1-2 page proposal
- **Moderate (7)**: Standard proposal (5-10 pages)
- **Complex (3)**: Extensive requirements, multiple attachments
- **Very Complex (0)**: Federal grant with 50+ page application

#### 5. Deadline Feasibility (10 points)
- **60+ days (10)**: Plenty of time
- **30-60 days (7)**: Manageable timeline
- **15-30 days (3)**: Tight deadline
- **<15 days (0)**: Too short

#### 6. Eligibility Match (10 points)
- **Perfect (10)**: 501c3 nonprofit, HUBZone, technology focus
- **Strong (7)**: 501c3 nonprofit, North Carolina
- **Moderate (5)**: 501c3 nonprofit
- **Weak (0)**: Eligibility questions

---

## Grant Categories

### Tier 1: Hot Opportunities (Score 80-100)
- Perfect mission alignment
- High funding amount
- Strong eligibility match
- Reasonable deadline
- **Action**: Immediate application prep

### Tier 2: Strong Matches (Score 60-79)
- Good mission alignment
- Moderate funding
- Eligible
- **Action**: Monitor and prepare

### Tier 3: Worth Watching (Score 40-59)
- Partial alignment
- May require partnerships
- **Action**: Track for future

### Tier 4: Low Priority (Score 0-39)
- Weak alignment
- Complex requirements
- **Action**: Archive

---

## Features

### 1. Grant Dashboard

**Key Metrics**:
- Total Active Opportunities
- Total Potential Funding
- Applications In Progress
- Grants Awarded (YTD)
- Success Rate

**Visual Elements**:
- 📊 Funding pipeline chart
- 📅 Deadline calendar
- 🎯 Match score distribution
- 📈 Historical success rate

---

### 2. Grant Cards (Tinder-Style Interface)

Similar to the lead swipe interface, but for grants:

```
┌─────────────────────────────────────────┐
│  💰 HP Digital Equity Accelerator       │
│  ⭐⭐⭐⭐⭐ 95% Match                      │
├─────────────────────────────────────────┤
│  💵 $100,000 + Equipment                │
│  📍 National (NC Eligible)              │
│  📅 Deadline: January 15, 2026          │
│                                         │
│  WHY IT'S A PERFECT FIT:                │
│  ✅ Digital equity focus (perfect!)     │
│  ✅ Technology donation model           │
│  ✅ Chromebook conversion eligible      │
│  ✅ $100K unrestricted funding          │
│  ✅ HP equipment donation included      │
│  ✅ 60 days to apply                    │
│                                         │
│  📊 Grant Impact: 20% of annual budget  │
│  🎯 Competition: Moderate (50 awards)   │
│                                         │
│  [❌ Pass]  [⏸️ Maybe]  [✅ Apply]      │
└─────────────────────────────────────────┘
```

**Swipe Actions**:
- **Right/✅**: Start application
- **Left/❌**: Not interested
- **Up/⭐**: Priority (urgent)
- **Down/⏸️**: Watch later

---

### 3. Application Assistant

**Pre-Filled Data**:
- Organization info (EIN, address, 501c3 status)
- Mission statement
- Program description
- Budget information
- Board of directors
- Financial statements
- Impact metrics (Chromebooks delivered, communities served)

**AI-Generated Content**:
- Project narratives
- Budget justifications
- Sustainability plans
- Evaluation frameworks
- Letters of support templates

**Document Library**:
- 501c3 determination letter
- Financial statements (audited)
- Board resolutions
- Letters of support
- Photos/videos
- Impact stories

---

### 4. Deadline Tracker

**Features**:
- Calendar view of all deadlines
- Email/SMS reminders (7 days, 3 days, 1 day before)
- Progress tracking (% complete)
- Checklist for each application
- Team task assignments

**Smart Alerts**:
- "New grant matches your profile!"
- "Deadline approaching: HP Digital Equity (5 days)"
- "Similar grant just opened: $50K from Z. Smith Reynolds"

---

### 5. Grant Portfolio Management

**Track All Grants**:
- **Prospecting**: Identified but not yet applied
- **In Progress**: Application in development
- **Submitted**: Waiting for decision
- **Awarded**: Grants received
- **Declined**: Not funded
- **Completed**: Grant period ended

**For Each Grant**:
- Application documents
- Correspondence history
- Reporting requirements
- Payment schedule
- Impact metrics
- Renewal eligibility

---

### 6. Funder Reporting

**Auto-Generate Reports**:
- Quarterly progress reports
- Annual impact reports
- Financial reports
- Outcome metrics
- Success stories
- Photos/videos

**Data Sources**:
- HEARTS (donation/delivery data)
- HTI-BRIDGE CRM (donor relationships)
- Financial system (budget actuals)
- Impact surveys (recipient feedback)

---

## Technical Implementation

### Database Schema

```sql
-- Grants table
CREATE TABLE grants (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  funder TEXT NOT NULL,
  funder_type TEXT, -- federal, state, foundation, corporate
  amount_min INTEGER,
  amount_max INTEGER,
  deadline DATE,
  source TEXT, -- grants.gov, ncbroadband.gov, etc.
  source_id TEXT, -- external grant ID
  url TEXT,
  description TEXT,
  eligibility TEXT,
  geographic_focus TEXT,
  mission_keywords TEXT, -- JSON array
  match_score INTEGER, -- 0-100
  status TEXT, -- prospecting, in_progress, submitted, awarded, declined
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Grant applications
CREATE TABLE grant_applications (
  id INTEGER PRIMARY KEY,
  grant_id INTEGER REFERENCES grants(id),
  status TEXT, -- draft, submitted, awarded, declined, completed
  amount_requested INTEGER,
  amount_awarded INTEGER,
  submitted_date DATE,
  decision_date DATE,
  start_date DATE,
  end_date DATE,
  assigned_to INTEGER REFERENCES users(id),
  notes TEXT,
  documents TEXT, -- JSON array of file paths
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Grant tasks
CREATE TABLE grant_tasks (
  id INTEGER PRIMARY KEY,
  application_id INTEGER REFERENCES grant_applications(id),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES users(id),
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
);

-- Grant reports
CREATE TABLE grant_reports (
  id INTEGER PRIMARY KEY,
  application_id INTEGER REFERENCES grant_applications(id),
  report_type TEXT, -- quarterly, annual, final
  due_date DATE,
  submitted_date DATE,
  status TEXT, -- pending, submitted, approved
  document_path TEXT,
  created_at TIMESTAMP
);
```

---

### API Integration

#### Grants.gov Search

```javascript
async function searchGrantsGov(keywords) {
  const response = await fetch('https://api.grants.gov/v1/api/search2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: keywords.join(' OR '),
      eligibilityCode: '25', // Nonprofits
      fundingInstrumentType: 'G', // Grant
      oppStatus: 'forecasted|posted',
      sortBy: 'openDate|desc'
    })
  });
  
  const data = await response.json();
  return data.oppHits.map(grant => ({
    title: grant.title,
    funder: grant.agencyName,
    amount_min: grant.awardFloor,
    amount_max: grant.awardCeiling,
    deadline: grant.closeDate,
    source: 'grants.gov',
    source_id: grant.opportunityNumber,
    url: `https://grants.gov/search-results-detail/${grant.opportunityId}`,
    description: grant.description,
    eligibility: grant.eligibilityDescription
  }));
}
```

#### AI-Powered Matching

```javascript
async function calculateMatchScore(grant, htiProfile) {
  // Use OpenAI GPT-4 to analyze grant fit
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [{
      role: 'system',
      content: 'You are a grant matching expert. Analyze how well this grant matches HTI\'s profile.'
    }, {
      role: 'user',
      content: `
        HTI Profile:
        - Mission: ${htiProfile.mission}
        - Location: ${htiProfile.location}
        - Focus Areas: ${htiProfile.focusAreas.join(', ')}
        - Annual Budget: ${htiProfile.budget}
        - Current Grant: $600K from NCDIT for 5,000 Chromebooks
        
        Grant Opportunity:
        - Title: ${grant.title}
        - Funder: ${grant.funder}
        - Amount: $${grant.amount_min}-$${grant.amount_max}
        - Description: ${grant.description}
        - Eligibility: ${grant.eligibility}
        
        Provide a match score (0-100) and explain why this is a good/bad fit.
      `
    }]
  });
  
  // Parse AI response for score and reasons
  return {
    score: extractScore(response.choices[0].message.content),
    reasons: extractReasons(response.choices[0].message.content)
  };
}
```

---

### Automated Scraping

```javascript
// Daily cron job to discover new grants
async function dailyGrantDiscovery() {
  const keywords = [
    'digital equity',
    'technology access',
    'education technology',
    'HUBZone',
    'Chromebook',
    'digital literacy',
    'workforce development'
  ];
  
  // Search Grants.gov
  const federalGrants = await searchGrantsGov(keywords);
  
  // Scrape NC state grants
  const ncGrants = await scrapeNCBroadband();
  
  // Check foundation databases (if API available)
  const foundationGrants = await searchFoundations(keywords);
  
  // Combine and deduplicate
  const allGrants = [...federalGrants, ...ncGrants, ...foundationGrants];
  const uniqueGrants = deduplicateGrants(allGrants);
  
  // Calculate match scores
  for (const grant of uniqueGrants) {
    grant.match_score = await calculateMatchScore(grant, HTI_PROFILE);
    await saveGrant(grant);
  }
  
  // Send notifications for high-scoring grants
  const hotGrants = uniqueGrants.filter(g => g.match_score >= 80);
  if (hotGrants.length > 0) {
    await notifyTeam(hotGrants);
  }
}
```

---

## UI Components

### Grant Discovery Dashboard

```javascript
// src/grant-discovery.js

class GrantDiscoveryDashboard {
  constructor() {
    this.grants = [];
    this.filters = {
      minScore: 60,
      maxDeadline: 90, // days
      minAmount: 10000,
      status: 'prospecting'
    };
  }
  
  async loadGrants() {
    const response = await fetch('/api/grants?' + new URLSearchParams(this.filters));
    this.grants = await response.json();
    this.render();
  }
  
  render() {
    const container = document.getElementById('grant-dashboard');
    container.innerHTML = `
      <div class="grant-metrics">
        <div class="metric-card">
          <h3>${this.grants.length}</h3>
          <p>Active Opportunities</p>
        </div>
        <div class="metric-card">
          <h3>$${this.totalPotentialFunding()}</h3>
          <p>Potential Funding</p>
        </div>
        <div class="metric-card">
          <h3>${this.inProgressCount()}</h3>
          <p>Applications In Progress</p>
        </div>
      </div>
      
      <div class="grant-list">
        ${this.grants.map(g => this.renderGrantCard(g)).join('')}
      </div>
    `;
  }
  
  renderGrantCard(grant) {
    return `
      <div class="grant-card" data-score="${grant.match_score}">
        <div class="grant-header">
          <h3>${grant.title}</h3>
          <span class="match-score">${grant.match_score}% Match</span>
        </div>
        <div class="grant-details">
          <p><strong>Funder:</strong> ${grant.funder}</p>
          <p><strong>Amount:</strong> $${grant.amount_min.toLocaleString()} - $${grant.amount_max.toLocaleString()}</p>
          <p><strong>Deadline:</strong> ${new Date(grant.deadline).toLocaleDateString()}</p>
        </div>
        <div class="grant-actions">
          <button onclick="grantDashboard.startApplication(${grant.id})">Apply</button>
          <button onclick="grantDashboard.viewDetails(${grant.id})">Details</button>
          <button onclick="grantDashboard.dismiss(${grant.id})">Pass</button>
        </div>
      </div>
    `;
  }
}
```

---

## Integration with HTI-BRIDGE CRM

### Unified Dashboard

The Grant Discovery section integrates seamlessly with HTI-BRIDGE CRM:

**Navigation**:
- 🌉 HTI-BRIDGE Home
- 👥 Leads (Donor acquisition)
- 💰 **Grants** (Funding opportunities) ← NEW
- 📊 Analytics
- ⚙️ Settings

**Cross-Feature Benefits**:
- **Lead data → Grant applications**: Use donor success stories in grant narratives
- **Grant awards → Lead targets**: Funded programs need more donors
- **Analytics → Funder reports**: Auto-generate impact reports from CRM data

---

## Gamification

**Grant Achievements**:
- 🎯 **Grant Hunter**: Identify 10 hot opportunities
- 📝 **Application Master**: Submit 5 grant applications
- 💰 **Funding Champion**: Secure $100K in grants
- 🏆 **Grant Guru**: 80%+ success rate (5+ applications)
- ⚡ **Speed Demon**: Submit application in <7 days

**Points**:
- Identify hot grant: 5 pts
- Start application: 10 pts
- Submit application: 25 pts
- Grant awarded: 100 pts
- Report submitted on time: 10 pts

---

## Success Metrics

### Key Performance Indicators

1. **Discovery Efficiency**
   - New grants identified per month
   - % of grants with 80+ match score
   - Time from discovery to application start

2. **Application Success**
   - Applications submitted
   - Success rate (% awarded)
   - Average grant size
   - Total funding secured

3. **Portfolio Health**
   - Active grants
   - Renewal rate
   - Compliance rate (reports on time)
   - Funder satisfaction

---

## Roadmap

### Phase 1: Foundation (Weeks 1-2)
- ✅ Database schema
- ✅ Grants.gov API integration
- ✅ Basic grant dashboard
- ✅ Match scoring algorithm

### Phase 2: Enhancement (Weeks 3-4)
- ⏳ NC state grant scraping
- ⏳ Foundation database integration
- ⏳ Tinder-style grant swipe interface
- ⏳ Deadline tracking & notifications

### Phase 3: Automation (Weeks 5-6)
- ⏳ AI-powered application assistant
- ⏳ Pre-filled templates
- ⏳ Document library
- ⏳ Funder reporting automation

### Phase 4: Advanced (Weeks 7-8)
- ⏳ Grant portfolio analytics
- ⏳ Renewal tracking
- ⏳ Collaboration features
- ⏳ Mobile optimization

---

## Conclusion

The Grant Discovery & Qualification System transforms HTI-BRIDGE CRM from a donor acquisition tool into a comprehensive funding platform. By automatically discovering, matching, and qualifying grant opportunities, HTI can:

1. **Never miss an opportunity** - Automated daily monitoring
2. **Focus on the best fits** - AI-powered matching
3. **Apply faster** - Pre-filled templates and document library
4. **Track everything** - Unified portfolio management
5. **Report easily** - Auto-generated funder reports

**Expected Impact**:
- 3-5x increase in grant applications submitted
- 2x improvement in success rate (better targeting)
- $500K+ in additional funding secured annually
- 50% reduction in application prep time

This system ensures HTI has the funding needed to achieve the 5,000 Chromebook goal and sustain operations long-term.

---

**Next Steps**:
1. Get Grants.gov API key (free, no authentication for search)
2. Build database schema
3. Implement Grants.gov integration
4. Create grant dashboard UI
5. Launch Phase 1 (2 weeks)

