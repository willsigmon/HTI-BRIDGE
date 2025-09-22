'use strict';

const STORAGE_KEY = 'hti-crm-state-v1';
const THEME_KEY = 'hti-crm-theme';
const DEVICE_GOAL = 2000;
const ACTIVE_STATUSES = new Set([
  'New',
  'Researching',
  'Initial Contact',
  'Qualified',
  'Proposal Sent',
  'Negotiating'
]);
const CLOSED_STATUSES = new Set([
  'Committed',
  'Donated',
  'Not Interested',
  'Invalid'
]);
const CORPORATE_PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };
const UPCOMING_THRESHOLD_DAYS = 14;

const htiData = {
  corporateTargets: [
    {
      company: 'SAS Institute',
      location: 'Cary, NC',
      type: 'Technology',
      employees: '14,000+',
      annualGiving: '30M+',
      priority: 'High',
      focus: 'Education outreach',
      status: 'Research',
      notes: 'Deep analytics bench with STEM education funds; pursue analytics academy sponsorship.'
    },
    {
      company: 'Cisco Systems',
      location: 'Research Triangle Park, NC',
      type: 'Technology',
      employees: '1,000+',
      communityGiving: '305K (2023 local)',
      priority: 'High',
      focus: 'Digital inclusion',
      status: 'Discovery Call',
      notes: 'Leverage existing refurbisher alliance and sustainability commitments.'
    },
    {
      company: 'Red Hat',
      location: 'Raleigh, NC',
      type: 'Technology',
      employees: '1,400+',
      partnerships: 'NCCCS existing',
      priority: 'High',
      focus: 'Open source education',
      status: 'Initial Contact',
      notes: 'Offer co-branded open hardware labs; align with diversity in tech goals.'
    },
    {
      company: 'Truist Bank',
      location: 'Charlotte/Triangle, NC',
      type: 'Financial Services',
      communityInvestment: '725M (Western NC)',
      digitalEquity: '10M partnership',
      priority: 'High',
      focus: 'Community development',
      status: 'Research',
      notes: 'Bank foundation funds education equity; pitch workforce re-entry cohort.'
    }
  ],
  sampleLeads: [
    {
      id: 'L001',
      date: '2025-09-22',
      source: 'Reddit (r/sysadmin)',
      title: 'Corporate laptop refresh - 200 ThinkPads',
      company: 'Anonymous IT Company',
      contact: 'ITManager_RTP',
      location: 'Research Triangle Park, NC',
      equipmentType: 'Business Laptops',
      estimatedQuantity: 200,
      priority: 95,
      status: 'New',
      notes: 'Corporate refresh cycle, 3-year-old ThinkPads, NIST data wipe required.',
      timeline: 'Immediate',
      followUpDate: '2025-09-23',
      potentialValue: 'High'
    },
    {
      id: 'L002',
      date: '2025-09-21',
      source: 'LinkedIn',
      title: 'Healthcare system equipment upgrade',
      company: 'Regional Healthcare Network',
      contact: 'Sarah Chen - IT Director',
      location: 'Durham, NC',
      equipmentType: 'Mixed Equipment',
      estimatedQuantity: 150,
      priority: 88,
      status: 'Initial Contact',
      notes: 'Annual refresh cycle, HIPAA compliant destruction needed.',
      timeline: 'Q4 2025',
      followUpDate: '2025-09-25',
      potentialValue: 'High'
    },
    {
      id: 'L003',
      date: '2025-09-20',
      source: 'Professional Referral',
      title: 'Manufacturing company office closure',
      company: 'Triangle Manufacturing Corp',
      contact: 'Mike Rodriguez - Facilities Manager',
      location: 'Raleigh, NC',
      equipmentType: 'Business Laptops',
      estimatedQuantity: 75,
      priority: 82,
      status: 'Qualified',
      notes: 'Office consolidation, immediate pickup needed.',
      timeline: 'Urgent',
      followUpDate: '2025-09-22',
      potentialValue: 'Medium-High'
    }
  ],
  grantMilestones: [
    {
      id: 'G001',
      title: 'Q4 2024 Progress Report',
      dueDate: '2024-12-31',
      status: 'Upcoming',
      description: 'Quarterly progress and expenditure report to NCDIT',
      priority: 'High'
    },
    {
      id: 'G002',
      title: 'Equipment Distribution Milestone',
      dueDate: '2025-03-31',
      status: 'In Progress',
      description: 'Target: 500 additional Chromebook conversions',
      priority: 'High'
    },
    {
      id: 'G003',
      title: 'Annual Compliance Audit',
      dueDate: '2025-08-02',
      status: 'Planned',
      description: 'Annual review of grant compliance and documentation',
      priority: 'Medium'
    }
  ],
  activities: [
    {
      id: 'A001',
      timestamp: '2025-09-22T09:05:00-04:00',
      text: 'New lead from Reddit r/sysadmin - 200 ThinkPads available',
      type: 'lead'
    },
    {
      id: 'A002',
      timestamp: '2025-09-21T15:45:00-04:00',
      text: 'Follow-up scheduled with Regional Healthcare Network',
      type: 'outreach'
    },
    {
      id: 'A003',
      timestamp: '2025-09-20T11:30:00-04:00',
      text: 'Qualified lead from Triangle Manufacturing Corp',
      type: 'lead'
    }
  ],
  analytics: {
    baselineActiveLead: 3,
    baselineEquipment: 425
  }
};

const filters = {
  status: '',
  source: '',
  priority: '',
  search: '',
  sort: 'priority',
  corporatePriority: 'all'
};

let state = loadState() ?? createDefaultState();
let charts = { leadSources: null, equipment: null };
let leadStatusContext = { leadId: null };
let corporateEditIndex = null;
let openModalCount = 0;
let storageAvailable = true;
let topLeadId = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

function initializeApp() {
  setupTabNavigation();
  setupFilters();
  setupCorporateFilters();
  setupThemeToggle();
  bindGlobalHandlers();
  renderAll();
  updateLastRefreshed();
  setTimeout(updateCharts, 250);
}

function renderAll() {
  renderDashboard();
  renderCorporateTargets();
  renderLeadsTable();
  renderGrantMilestones();
  renderGrantRoadmap();
  updateComplianceHealth();
  renderActivities();
}

function bindGlobalHandlers() {
  document.addEventListener('click', handleBackdropClick);
  document.addEventListener('keydown', handleEscapeKey);
  window.addEventListener('storage', handleStorageSync);
  const searchInput = document.getElementById('searchFilter');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      filters.search = event.target.value.trim().toLowerCase();
      renderLeadsTable();
    });
  }
}

function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.nav__tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetTabId = button.getAttribute('data-tab');
      tabButtons.forEach((btn) => {
        btn.classList.toggle('nav__tab--active', btn === button);
        btn.setAttribute('aria-selected', btn === button ? 'true' : 'false');
      });
      tabContents.forEach((content) => {
        content.classList.toggle('tab-content--active', content.id === targetTabId);
      });
    });
  });
}

function setupFilters() {
  const statusFilter = document.getElementById('statusFilter');
  const sourceFilter = document.getElementById('sourceFilter');
  const priorityFilter = document.getElementById('priorityFilter');
  const sortFilter = document.getElementById('sortFilter');

  if (statusFilter) {
    statusFilter.addEventListener('change', (event) => {
      filters.status = event.target.value;
      renderLeadsTable();
    });
  }

  if (sourceFilter) {
    sourceFilter.addEventListener('change', (event) => {
      filters.source = event.target.value;
      renderLeadsTable();
    });
  }

  if (priorityFilter) {
    priorityFilter.addEventListener('change', (event) => {
      filters.priority = event.target.value;
      renderLeadsTable();
    });
  }

  if (sortFilter) {
    sortFilter.addEventListener('change', (event) => {
      filters.sort = event.target.value;
      renderLeadsTable();
    });
  }
}

function setupCorporateFilters() {
  const filterButtons = document.querySelectorAll('[data-corporate-filter]');
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      filterButtons.forEach((btn) => btn.classList.remove('chip--active'));
      button.classList.add('chip--active');
      filters.corporatePriority = button.getAttribute('data-corporate-filter');
      renderCorporateTargets();
    });
  });
}

function setupThemeToggle() {
  const button = document.getElementById('themeToggle');
  if (!button) return;

  const savedTheme = getSavedTheme();
  applyTheme(savedTheme);
  updateThemeToggleLabel(button, savedTheme);

  button.addEventListener('click', () => {
    const currentTheme = getSavedTheme();
    const nextTheme = cycleTheme(currentTheme);
    saveTheme(nextTheme);
    applyTheme(nextTheme);
    updateThemeToggleLabel(button, nextTheme);
    createToast('Theme updated', `Switched to ${nextTheme} mode.`, 'info');
  });
}

function applyTheme(theme) {
  const root = document.documentElement;
  const app = document.querySelector('.app');
  const resolvedTheme = theme || 'auto';
  if (app) {
    app.setAttribute('data-color-scheme', resolvedTheme);
  }
  root.setAttribute('data-color-scheme', resolvedTheme);
}

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'auto';
  } catch (error) {
    console.warn('Theme storage unavailable', error);
    return 'auto';
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.warn('Unable to persist theme preference', error);
  }
}

function cycleTheme(theme) {
  const modes = ['light', 'dark', 'auto'];
  const currentIndex = modes.indexOf(theme);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % modes.length;
  return modes[nextIndex];
}

function updateThemeToggleLabel(button, theme) {
  const iconMap = { light: '☀️', dark: '🌙', auto: '🌓' };
  const labelMap = { light: 'Light', dark: 'Dark', auto: 'Auto' };
  const icon = button.querySelector('.theme-toggle__icon');
  const text = button.querySelector('.theme-toggle__label');
  if (icon) icon.textContent = iconMap[theme] || '🌓';
  if (text) text.textContent = `${labelMap[theme] || 'Auto'} theme`;
}

function renderDashboard() {
  const activeLeads = state.leads.filter((lead) => ACTIVE_STATUSES.has(lead.status));
  const totalEquipment = state.leads.reduce((total, lead) => total + (Number(lead.estimatedQuantity) || 0), 0);
  const highPriorityTargets = state.corporateTargets.filter((target) => target.priority === 'High');

  const activeLeadEl = document.getElementById('activeLead');
  const equipmentPipelineEl = document.getElementById('equipmentPipeline');
  const grantProgressEl = document.getElementById('grantProgress');
  const highPriorityTargetsEl = document.getElementById('highPriorityTargets');
  const activeLeadTrendEl = document.getElementById('activeLeadTrend');
  const pipelineProgressBar = document.getElementById('pipelineProgressBar');
  const grantProgressBar = document.getElementById('grantProgressBar');
  const priorityHealthEl = document.getElementById('priorityHealth');
  const activeAlertsEl = document.getElementById('activeAlerts');

  if (activeLeadEl) activeLeadEl.textContent = activeLeads.length;
  if (equipmentPipelineEl) equipmentPipelineEl.textContent = formatNumber(totalEquipment);

  const pipelineProgress = clamp((totalEquipment / DEVICE_GOAL) * 100, 0, 100);
  if (pipelineProgressBar) pipelineProgressBar.style.width = `${pipelineProgress}%`;

  const grantProgress = calculateGrantProgress();
  if (grantProgressEl) grantProgressEl.textContent = `${grantProgress.percent}%`;
  if (grantProgressBar) grantProgressBar.style.width = `${grantProgress.percent}%`;

  if (highPriorityTargetsEl) highPriorityTargetsEl.textContent = highPriorityTargets.length;

  if (activeLeadTrendEl) {
    if (!state.analytics.baselineActiveLead) {
      state.analytics.baselineActiveLead = activeLeads.length;
      persistState(false);
    }
    const diff = activeLeads.length - state.analytics.baselineActiveLead;
    activeLeadTrendEl.textContent = diff === 0
      ? 'On pace with baseline'
      : `${diff > 0 ? '+' : ''}${diff} vs baseline`;
  }

  if (priorityHealthEl) {
    const ratio = state.corporateTargets.length === 0 ? 0 : highPriorityTargets.length / state.corporateTargets.length;
    priorityHealthEl.textContent = ratio >= 0.4 ? 'Healthy mix' : 'Add high-priority targets';
  }

  if (activeAlertsEl) {
    const alerts = calculateActiveAlerts();
    activeAlertsEl.textContent = alerts === 0 ? 'No urgent alerts' : `${alerts} follow-ups due`;
    activeAlertsEl.classList.toggle('meta-chip--info', alerts > 0);
  }

  renderLeadHealth();
  renderConversionSnapshot();
  renderTopOpportunity();
  renderActionCenter();
  updateCharts();
}

function renderLeadHealth() {
  const container = document.getElementById('leadHealth');
  if (!container) return;

  const totalLeads = state.leads.length;
  const activeLeads = state.leads.filter((lead) => ACTIVE_STATUSES.has(lead.status)).length;
  const committed = state.leads.filter((lead) => lead.status === 'Committed').length;
  const donated = state.leads.filter((lead) => lead.status === 'Donated').length;
  const totalEquipment = state.leads.reduce((total, lead) => total + (Number(lead.estimatedQuantity) || 0), 0);
  const avgQuantity = totalLeads === 0 ? 0 : Math.round(totalEquipment / totalLeads);
  const followUpsDue = calculateActiveAlerts();

  container.innerHTML = `
    <span class="health-pill"><span class="health-pill__value">${formatNumber(totalLeads)}</span> total leads</span>
    <span class="health-pill"><span class="health-pill__value">${formatNumber(activeLeads)}</span> active pipeline</span>
    <span class="health-pill"><span class="health-pill__value">${formatNumber(avgQuantity)}</span> avg devices</span>
    <span class="health-pill"><span class="health-pill__value">${formatNumber(followUpsDue)}</span> follow-ups due</span>
    <span class="health-pill"><span class="health-pill__value">${formatNumber(committed + donated)}</span> conversions</span>
  `;
}

function renderConversionSnapshot() {
  const container = document.getElementById('conversionSnapshot');
  if (!container) return;

  if (!state.leads.length) {
    container.innerHTML = `
      <div class="snapshot-metric">
        <span class="snapshot-metric__label">Pipeline</span>
        <span class="snapshot-metric__value">0</span>
        <span class="snapshot-metric__delta">Add leads to unlock insights</span>
      </div>
    `;
    return;
  }

  const totalLeads = state.leads.length;
  const conversions = state.leads.filter((lead) => lead.status === 'Committed' || lead.status === 'Donated');
  const conversionRate = totalLeads ? Math.round((conversions.length / totalLeads) * 100) : 0;
  const activeLeads = state.leads.filter((lead) => ACTIVE_STATUSES.has(lead.status));
  const avgAge = activeLeads.length ? Math.round(activeLeads.reduce((sum, lead) => sum + leadAgeDays(lead), 0) / activeLeads.length) : 0;
  const newThisWeek = state.leads.filter((lead) => leadWithinDays(lead, 7)).length;

  container.innerHTML = `
    <div class="snapshot-metric">
      <span class="snapshot-metric__label">Conversion rate</span>
      <span class="snapshot-metric__value">${conversionRate}%</span>
      <span class="snapshot-metric__delta">${formatNumber(conversions.length)} of ${formatNumber(totalLeads)} opportunities</span>
    </div>
    <div class="snapshot-metric">
      <span class="snapshot-metric__label">Avg days active</span>
      <span class="snapshot-metric__value">${avgAge}</span>
      <span class="snapshot-metric__delta">Across ${formatNumber(activeLeads.length)} active leads</span>
    </div>
    <div class="snapshot-metric">
      <span class="snapshot-metric__label">Fresh pipeline</span>
      <span class="snapshot-metric__value">${formatNumber(newThisWeek)}</span>
      <span class="snapshot-metric__delta">Captured in the past 7 days</span>
    </div>
  `;
}

function renderTopOpportunity() {
  const container = document.getElementById('topOpportunity');
  if (!container) return;

  const candidates = state.leads
    .filter((lead) => !CLOSED_STATUSES.has(lead.status))
    .sort((a, b) => {
      const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      const quantityDiff = (b.estimatedQuantity || 0) - (a.estimatedQuantity || 0);
      if (quantityDiff !== 0) return quantityDiff;
      return new Date(a.followUpDate || '2100-01-01') - new Date(b.followUpDate || '2100-01-01');
    });

  const topLead = candidates[0];
  topLeadId = topLead ? topLead.id : null;

  if (!topLead) {
    container.innerHTML = `
      <p class="snapshot-feature__description">No active opportunities available. Add or unarchive a lead to feature it here.</p>
    `;
    return;
  }

  container.innerHTML = `
    <h4 class="snapshot-feature__title">${escapeHtml(topLead.title)}</h4>
    <div class="snapshot-feature__meta">
      <span>🏢 ${escapeHtml(topLead.company || 'Unassigned')}</span>
      <span>🎯 ${escapeHtml(topLead.status)}</span>
      <span>🔥 Score ${topLead.priority ?? '—'}</span>
      ${topLead.estimatedQuantity ? `<span>💻 ${formatNumber(topLead.estimatedQuantity)} devices</span>` : ''}
      ${topLead.followUpDate ? `<span>📅 ${formatDate(topLead.followUpDate)}</span>` : ''}
    </div>
    <p class="snapshot-feature__description">${escapeHtml(topLead.notes || 'Capture next steps and stakeholders to keep momentum up.')}</p>
  `;
}

function renderActionCenter() {
  const followUpContainer = document.getElementById('followUpQueue');
  const grantContainer = document.getElementById('grantAlertsList');

  if (followUpContainer) {
    const upcoming = state.leads
      .filter((lead) => lead.followUpDate && !CLOSED_STATUSES.has(lead.status))
      .map((lead) => ({
        lead,
        diff: daysUntil(lead.followUpDate)
      }))
      .filter(({ diff }) => diff <= 14 && diff >= -7)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5);

    if (!upcoming.length) {
      followUpContainer.innerHTML = `
        <li class="action-item">
          <div>
            <p class="action-item__title">All quiet for the next 14 days</p>
            <p class="section-subtitle">New leads will surface here once follow-ups are scheduled.</p>
          </div>
        </li>
      `;
    } else {
      followUpContainer.innerHTML = upcoming
        .map(({ lead, diff }) => {
          const itemClass = diff < 0 ? 'action-item action-item--overdue' : diff <= 2 ? 'action-item action-item--due-soon' : 'action-item';
          const tagClass = diff < 0 ? 'tag tag--danger' : diff <= 2 ? 'tag tag--warning' : 'tag';
          const tagLabel = diff < 0
            ? `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`
            : diff === 0
              ? 'due today'
              : diff === 1
                ? 'due tomorrow'
                : `due in ${diff} days`;
          return `
            <li class="${itemClass}">
              <div>
                <p class="action-item__title">${escapeHtml(lead.title)}</p>
                <div class="action-item__meta">
                  <span>🏢 ${escapeHtml(lead.company || 'Unassigned')}</span>
                  <span>📅 ${formatDate(lead.followUpDate)} (${formatRelativeDate(lead.followUpDate)})</span>
                  <span>🎯 ${escapeHtml(lead.status)}</span>
                  ${lead.estimatedQuantity ? `<span>💻 ${formatNumber(lead.estimatedQuantity)} devices</span>` : ''}
                </div>
              </div>
              <div class="action-item__cta">
                <span class="${tagClass}">${tagLabel}</span>
                <button class="btn btn--outline btn-sm" type="button" onclick="openLeadStatusModal('${escapeQuotes(lead.id)}')">Update</button>
                <button class="btn btn--outline btn-sm" type="button" onclick="viewLead('${escapeQuotes(lead.id)}')">View</button>
                <button class="btn btn--outline btn-sm" type="button" onclick="completeFollowUp('${escapeQuotes(lead.id)}')">Done</button>
              </div>
            </li>
          `;
        })
        .join('');
    }
  }

  if (grantContainer) {
    const alerts = state.grantMilestones
      .map((milestone) => ({
        milestone,
        diff: daysUntil(milestone.dueDate),
        status: getMilestoneStatus(milestone)
      }))
      .filter(({ status, diff }) => status !== 'Completed' && diff >= -30)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5);

    if (!alerts.length) {
      grantContainer.innerHTML = `
        <li class="action-item">
          <div>
            <p class="action-item__title">Grant plan on track</p>
            <p class="section-subtitle">All milestones are completed for now.</p>
          </div>
        </li>
      `;
    } else {
      grantContainer.innerHTML = alerts
        .map(({ milestone, diff, status }) => {
          const itemClass = diff < 0 ? 'action-item action-item--overdue' : diff <= 7 ? 'action-item action-item--due-soon' : 'action-item';
          const tagClass = diff < 0 ? 'tag tag--danger' : diff <= 7 ? 'tag tag--warning' : 'tag';
          const tagLabel = diff < 0
            ? `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`
            : diff === 0
              ? 'due today'
              : diff === 1
                ? 'due tomorrow'
                : `due in ${diff} days`;
          return `
            <li class="${itemClass}">
              <div>
                <p class="action-item__title">${escapeHtml(milestone.title)}</p>
                <div class="action-item__meta">
                  <span>📅 ${formatDate(milestone.dueDate)}</span>
                  <span>📌 ${escapeHtml(status)}</span>
                  ${milestone.priority ? `<span>⭐ ${escapeHtml(milestone.priority)} priority</span>` : ''}
                </div>
              </div>
              <div class="action-item__cta">
                <span class="${tagClass}">${tagLabel}</span>
                <button class="btn btn--outline btn-sm" type="button" onclick="switchToTab('grants')">Open</button>
              </div>
            </li>
          `;
        })
        .join('');
    }
  }
}

function updateCharts() {
  if (typeof Chart === 'undefined') return;

  const leadSourceCanvas = document.getElementById('leadSourceChart');
  const equipmentCanvas = document.getElementById('equipmentChart');

  const leadSourceCounts = aggregateBy(state.leads, 'source');
  const equipmentTotals = aggregateEquipmentTotals(state.leads);

  if (leadSourceCanvas) {
    const data = {
      labels: Object.keys(leadSourceCounts),
      datasets: [
        {
          data: Object.values(leadSourceCounts),
          backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#2C6E49', '#6376F4']
        }
      ]
    };

    if (charts.leadSources) {
      charts.leadSources.data = data;
      charts.leadSources.update();
    } else {
      charts.leadSources = new Chart(leadSourceCanvas.getContext('2d'), {
        type: 'doughnut',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  if (equipmentCanvas) {
    const labels = Object.keys(equipmentTotals);
    const values = Object.values(equipmentTotals);
    const data = {
      labels,
      datasets: [
        {
          label: 'Devices in pipeline',
          data: values,
          backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#2C6E49']
        }
      ]
    };

    if (charts.equipment) {
      charts.equipment.data = data;
      charts.equipment.update();
    } else {
      charts.equipment = new Chart(equipmentCanvas.getContext('2d'), {
        type: 'bar',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
  }
}

function renderCorporateTargets() {
  const container = document.getElementById('corporateTargets');
  if (!container) return;

  const filter = filters.corporatePriority;
  const targets = [...state.corporateTargets]
    .filter((target) => filter === 'all' || target.priority === filter)
    .sort((a, b) => {
      const priorityDiff = (CORPORATE_PRIORITY_RANK[b.priority] || 0) - (CORPORATE_PRIORITY_RANK[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return a.company.localeCompare(b.company);
    });

  if (targets.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__title">No companies yet</div>
        <div class="empty-state__body">Log your first corporate target to build the partnership pipeline.</div>
        <button class="btn btn--primary" type="button" onclick="openCorporateModal()">Add corporate target</button>
      </div>
    `;
    return;
  }

  container.innerHTML = targets
    .map((target) => {
      const detailRows = [
        { label: 'Location', value: target.location },
        { label: 'Employees', value: target.employees || target.employeeCount || '—' },
        { label: 'Focus', value: target.focus || '—' },
        { label: 'Status', value: target.status || 'Research' }
      ]
        .map((detail) => `
          <div class="detail-item">
            <span class="detail-label">${escapeHtml(detail.label)}:</span>
            <span class="detail-value">${escapeHtml(detail.value)}</span>
          </div>
        `)
        .join('');

      return `
        <article class="corporate-card">
          <div class="corporate-header">
            <div>
              <h3 class="corporate-name">${escapeHtml(target.company)}</h3>
              <p class="corporate-type">${escapeHtml(target.type || 'Corporate')}</p>
            </div>
            <span class="status status--${getPriorityBadgeClass(target.priority)}">${escapeHtml(target.priority || 'Medium')}</span>
          </div>
          <div class="corporate-details">${detailRows}</div>
          ${target.notes ? `<p class="milestone-description">${escapeHtml(target.notes)}</p>` : ''}
          <div class="corporate-actions">
            <button class="btn btn--primary btn-sm" type="button" onclick="contactCorporate('${escapeQuotes(target.company)}')">Contact</button>
            <button class="btn btn--outline btn-sm" type="button" onclick="editCorporateTarget('${escapeQuotes(target.company)}')">Edit</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderLeadsTable() {
  const container = document.getElementById('leadsTable');
  if (!container) return;

  const leads = filterLeads()
    .sort((a, b) => sortLeads(a, b, filters.sort));

  if (leads.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__title">No leads match your filters</div>
        <div class="empty-state__body">Adjust filters or add a new lead to see data here.</div>
        <button class="btn btn--primary" type="button" onclick="openAddLeadModal()">Add lead</button>
      </div>
    `;
    renderLeadHealth();
    updateCharts();
    return;
  }

  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Lead</th>
          <th>Source</th>
          <th>Equipment</th>
          <th>Quantity</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Follow-up</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${leads
          .map((lead) => `
            <tr data-lead-id="${escapeHtml(lead.id)}">
              <td>
                <div class="lead-title">${escapeHtml(lead.title)}</div>
                <div class="lead-company">${escapeHtml(lead.company)}</div>
              </td>
              <td>${escapeHtml(lead.source || 'N/A')}</td>
              <td>${escapeHtml(lead.equipmentType || 'N/A')}</td>
              <td>${lead.estimatedQuantity ? formatNumber(lead.estimatedQuantity) : 'N/A'}</td>
              <td>
                <span class="priority-badge priority-${getPriorityClass(lead.priority)}">${lead.priority ?? '—'}</span>
              </td>
              <td><span class="status status--${getStatusClass(lead.status)}">${escapeHtml(lead.status)}</span></td>
              <td>${formatFollowUp(lead.followUpDate)}</td>
            <td>
              <div class="lead-actions">
                <button class="btn btn--primary btn-sm" type="button" onclick="openLeadStatusModal('${escapeQuotes(lead.id)}')">Update</button>
                <button class="btn btn--outline btn-sm" type="button" onclick="viewLead('${escapeQuotes(lead.id)}')">View</button>
                <button class="btn btn--outline btn-sm" type="button" onclick="archiveLead('${escapeQuotes(lead.id)}')">Archive</button>
              </div>
            </td>
          </tr>
        `)
        .join('')}
      </tbody>
    </table>
  `;

  renderLeadHealth();
  updateCharts();
}

function renderGrantMilestones() {
  const container = document.getElementById('grantMilestones');
  if (!container) return;

  const milestones = [...state.grantMilestones]
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  container.innerHTML = milestones
    .map((milestone) => {
      const dueLabel = formatDueLabel(milestone.dueDate);
      const statusClass = getStatusClass(getMilestoneStatus(milestone));
      return `
        <article class="milestone-card">
          <div class="milestone-header">
            <div>
              <h3 class="milestone-title">${escapeHtml(milestone.title)}</h3>
              <p class="milestone-due">Due: ${formatDate(milestone.dueDate)}${dueLabel ? ` · ${dueLabel}` : ''}</p>
            </div>
            <span class="status status--${statusClass}">${escapeHtml(getMilestoneStatus(milestone))}</span>
          </div>
          <p class="milestone-description">${escapeHtml(milestone.description)}</p>
        </article>
      `;
    })
    .join('');
}

function renderGrantRoadmap() {
  const roadmap = document.getElementById('grantRoadmap');
  if (!roadmap) return;

  const milestones = [...state.grantMilestones]
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4);

  if (milestones.length === 0) {
    roadmap.innerHTML = '<li>No milestones logged</li>';
    return;
  }

  roadmap.innerHTML = milestones
    .map((milestone) => `
      <li>
        <span>${escapeHtml(milestone.title)}</span>
        <span>${formatDate(milestone.dueDate)} (${formatRelativeDate(milestone.dueDate)})</span>
      </li>
    `)
    .join('');
}

function updateComplianceHealth() {
  const container = document.getElementById('complianceHealth');
  if (!container) return;

  const milestones = state.grantMilestones;
  if (!milestones.length) {
    container.innerHTML = '<li>No milestones configured</li>';
    return;
  }

  const completed = milestones.filter((milestone) => getMilestoneStatus(milestone) === 'Completed').length;
  const inProgress = milestones.filter((milestone) => getMilestoneStatus(milestone) === 'In Progress').length;
  const upcomingSoon = milestones.filter((milestone) => daysUntil(milestone.dueDate) >= 0 && daysUntil(milestone.dueDate) <= UPCOMING_THRESHOLD_DAYS).length;
  const overdue = milestones.filter((milestone) => daysUntil(milestone.dueDate) < 0 && getMilestoneStatus(milestone) !== 'Completed').length;

  container.innerHTML = `
    <li><span>Milestones completed</span><span class="compliance-health__value">${completed}</span></li>
    <li><span>Active deliverables</span><span class="compliance-health__value">${inProgress}</span></li>
    <li><span>Due within 14 days</span><span class="compliance-health__value">${upcomingSoon}</span></li>
    <li><span>Overdue items</span><span class="compliance-health__value">${overdue}</span></li>
  `;
}

function renderActivities() {
  const container = document.getElementById('activityList');
  if (!container) return;

  const activities = [...state.activities]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 6);

  if (activities.length === 0) {
    container.innerHTML = '<p>No recent activity logged.</p>';
    return;
  }

  container.innerHTML = activities
    .map((activity) => `
      <div class="activity-item">
        <span class="activity-date">${formatActivityDate(activity.timestamp)}</span>
        <span class="activity-text">${escapeHtml(activity.text)}</span>
      </div>
    `)
    .join('');
}

function filterLeads() {
  return state.leads.filter((lead) => {
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.source && lead.source !== filters.source) return false;

    if (filters.priority) {
      const priority = lead.priority ?? 0;
      if (filters.priority === 'high' && priority < 80) return false;
      if (filters.priority === 'medium' && (priority < 60 || priority >= 80)) return false;
      if (filters.priority === 'low' && priority >= 60) return false;
    }

    if (filters.search) {
      const terms = [lead.title, lead.company, lead.contact]
        .join(' ')
        .toLowerCase();
      if (!terms.includes(filters.search)) return false;
    }

    return true;
  });
}

function sortLeads(a, b, sortKey) {
  switch (sortKey) {
    case 'date':
      return new Date(b.date) - new Date(a.date);
    case 'followUpDate':
      return new Date(a.followUpDate || '2100-01-01') - new Date(b.followUpDate || '2100-01-01');
    case 'quantity':
      return (Number(b.estimatedQuantity) || 0) - (Number(a.estimatedQuantity) || 0);
    case 'priority':
    default:
      return (b.priority ?? 0) - (a.priority ?? 0);
  }
}

function openAddLeadModal() {
  const modal = document.getElementById('addLeadModal');
  const form = document.getElementById('addLeadForm');
  if (!modal || !form) return;

  form.reset();
  const followUpInput = document.getElementById('leadFollowUp');
  if (followUpInput) {
    followUpInput.value = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
  }

  modal.classList.remove('hidden');
  lockModal();
  requestAnimationFrame(() => {
    const firstInput = form.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
  });
}

function closeAddLeadModal() {
  const modal = document.getElementById('addLeadModal');
  const form = document.getElementById('addLeadForm');
  if (modal) modal.classList.add('hidden');
  if (form) form.reset();
  unlockModal();
}

function addLead() {
  const title = getInputValue('leadTitle');
  const company = getInputValue('leadCompany');
  const source = getInputValue('leadSource');

  if (!title || !company || !source) {
    createToast('Missing fields', 'Please complete Title, Company, and Source.', 'warning');
    return;
  }

  const newLead = {
    id: generateLeadId(),
    date: new Date().toISOString().split('T')[0],
    title,
    company,
    contact: getInputValue('leadContact'),
    location: getInputValue('leadLocation'),
    source,
    equipmentType: getInputValue('leadEquipmentType'),
    estimatedQuantity: parseInt(getInputValue('leadQuantity'), 10) || 0,
    status: 'New',
    notes: getInputValue('leadNotes'),
    timeline: 'TBD',
    followUpDate: getInputValue('leadFollowUp') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    potentialValue: 'Medium'
  };

  newLead.priority = calculatePriorityScore(newLead);

  state.leads.unshift(newLead);
  addActivity({ text: `Lead logged: ${newLead.title} (${newLead.company})`, type: 'lead' });
  persistState();

  renderLeadsTable();
  renderDashboard();
  closeAddLeadModal();
  createToast('Lead added', `${newLead.title} captured successfully.`, 'success');
}

function generateLeadId() {
  const numericIds = state.leads
    .map((lead) => parseInt(String(lead.id || '').replace(/[^0-9]/g, ''), 10))
    .filter((value) => !Number.isNaN(value));
  const maxId = numericIds.length ? Math.max(...numericIds) : 0;
  return `L${String(maxId + 1).padStart(3, '0')}`;
}

function openLeadStatusModal(leadId) {
  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) {
    createToast('Lead not found', 'Unable to locate that lead record.', 'error');
    return;
  }

  const modal = document.getElementById('leadStatusModal');
  if (!modal) return;

  leadStatusContext.leadId = leadId;

  const statusSelect = document.getElementById('leadStatusSelect');
  const priorityInput = document.getElementById('leadPriorityInput');
  const followUpInput = document.getElementById('leadFollowUpInput');
  const notesInput = document.getElementById('leadNotesInput');

  if (statusSelect) statusSelect.value = lead.status;
  if (priorityInput) priorityInput.value = lead.priority ?? '';
  if (followUpInput) followUpInput.value = lead.followUpDate ?? '';
  if (notesInput) notesInput.value = lead.notes ?? '';

  modal.classList.remove('hidden');
  lockModal();
  requestAnimationFrame(() => {
    if (statusSelect) statusSelect.focus();
  });
}

function openLeadStatusModalFromDrawer() {
  const drawer = document.getElementById('leadDrawer');
  if (!drawer) return;
  const leadId = drawer.getAttribute('data-lead-id');
  if (leadId) {
    openLeadStatusModal(leadId);
  }
}

function closeLeadStatusModal() {
  const modal = document.getElementById('leadStatusModal');
  if (modal) modal.classList.add('hidden');
  unlockModal();
  leadStatusContext.leadId = null;
}

function submitLeadStatusForm() {
  const leadId = leadStatusContext.leadId;
  if (!leadId) return;

  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) {
    createToast('Lead not found', 'Unable to locate that lead record.', 'error');
    return;
  }

  const status = getInputValue('leadStatusSelect') || lead.status;
  const priority = parseInt(getInputValue('leadPriorityInput'), 10);
  const followUpDate = getInputValue('leadFollowUpInput');
  const notes = getInputValue('leadNotesInput');

  lead.status = status;
  lead.priority = Number.isNaN(priority) ? calculatePriorityScore(lead) : clamp(priority, 0, 100);
  lead.followUpDate = followUpDate || lead.followUpDate;
  lead.notes = notes;

  if (CLOSED_STATUSES.has(status)) {
    lead.timeline = 'Closed';
  }

  addActivity({ text: `Status updated to ${status} for ${lead.title}`, type: 'update' });
  persistState();
  closeLeadStatusModal();
  renderLeadsTable();
  renderDashboard();
  createToast('Lead updated', `${lead.title} marked as ${status}.`, 'success');
}

function viewLead(leadId) {
  const lead = state.leads.find((item) => item.id === leadId);
  const drawer = document.getElementById('leadDrawer');
  const drawerTitle = document.getElementById('leadDrawerTitle');
  const drawerSubtitle = document.getElementById('leadDrawerSubtitle');
  const drawerBody = document.getElementById('leadDrawerBody');

  if (!lead || !drawer || !drawerBody) {
    createToast('Lead not found', 'Unable to load lead details.', 'error');
    return;
  }

  drawer.setAttribute('data-lead-id', leadId);

  if (drawerTitle) drawerTitle.textContent = lead.title;
  if (drawerSubtitle) drawerSubtitle.textContent = `${lead.company} · ${lead.source}`;

  const details = [
    { label: 'Status', value: lead.status },
    { label: 'Priority', value: lead.priority },
    { label: 'Estimated Quantity', value: lead.estimatedQuantity ? formatNumber(lead.estimatedQuantity) : 'N/A' },
    { label: 'Follow-up', value: formatDate(lead.followUpDate) },
    { label: 'Timeline', value: lead.timeline || 'TBD' },
    { label: 'Potential Value', value: lead.potentialValue || 'TBD' },
    { label: 'Contact', value: lead.contact || 'N/A' },
    { label: 'Location', value: lead.location || 'N/A' },
    { label: 'Source', value: lead.source || 'N/A' }
  ];

  drawerBody.innerHTML = `
    <ul class="lead-detail-list">
      ${details
        .map((detail) => `
          <li>
            <span class="lead-detail-label">${escapeHtml(detail.label)}</span>
            <span class="lead-detail-value">${escapeHtml(detail.value)}</span>
          </li>
        `)
        .join('')}
    </ul>
    ${lead.notes ? `<p>${escapeHtml(lead.notes)}</p>` : ''}
  `;

  drawer.classList.remove('hidden');
  lockDrawer();
}

function closeLeadDrawer() {
  const drawer = document.getElementById('leadDrawer');
  if (drawer) {
    drawer.classList.add('hidden');
    drawer.removeAttribute('data-lead-id');
  }
  unlockDrawer();
}

function viewTopLead() {
  if (!topLeadId) {
    createToast('No featured lead', 'Once you add an active lead it will surface here.', 'info');
    return;
  }
  viewLead(topLeadId);
}

function archiveLead(leadId) {
  const index = state.leads.findIndex((lead) => lead.id === leadId);
  if (index === -1) {
    createToast('Lead not found', 'Unable to archive this record.', 'error');
    return;
  }

  const lead = state.leads[index];
  const confirmed = window.confirm(`Archive "${lead.title}" from the active pipeline?`);
  if (!confirmed) return;

  state.leads.splice(index, 1);
  addActivity({ text: `Lead archived: ${lead.title}`, type: 'archive' });
  persistState();
  renderLeadsTable();
  renderDashboard();
  createToast('Lead archived', `${lead.title} removed from active pipeline.`, 'info');
}

function completeFollowUp(leadId) {
  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) {
    createToast('Lead not found', 'Unable to update follow-up.', 'error');
    return;
  }

  const nextDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  lead.followUpDate = nextDate;
  addActivity({ text: `Follow-up completed for ${lead.title}`, type: 'update' });
  persistState();
  renderDashboard();
  createToast('Follow-up rescheduled', `Next touchpoint set for ${formatDate(nextDate)}.`, 'success');
}

function openCorporateModal(companyName) {
  const modal = document.getElementById('corporateModal');
  const form = document.getElementById('corporateForm');
  if (!modal || !form) return;

  const titleEl = document.getElementById('corporateModalTitle');
  const submitButton = modal.querySelector('.modal-footer .btn.btn--primary');

  if (companyName) {
    corporateEditIndex = state.corporateTargets.findIndex((target) => target.company === companyName);
    if (corporateEditIndex === -1) {
      createToast('Not found', 'Unable to locate that corporate record.', 'error');
      return;
    }
    const target = state.corporateTargets[corporateEditIndex];
    setInputValue('corporateName', target.company);
    setInputValue('corporateLocation', target.location);
    setInputValue('corporateType', target.type);
    setInputValue('corporateEmployees', target.employees || target.employeeCount || '');
    setInputValue('corporateStatus', target.status || 'Research');
    setInputValue('corporatePriority', target.priority || 'Medium');
    setInputValue('corporateFocus', target.focus || '');
    setInputValue('corporateNotes', target.notes || '');
    if (titleEl) titleEl.textContent = 'Edit Corporate Target';
    if (submitButton) submitButton.textContent = 'Save Changes';
  } else {
    corporateEditIndex = null;
    form.reset();
    setInputValue('corporatePriority', 'Medium');
    setInputValue('corporateStatus', 'Research');
    if (titleEl) titleEl.textContent = 'Add Corporate Target';
    if (submitButton) submitButton.textContent = 'Add Company';
  }

  modal.classList.remove('hidden');
  lockModal();
  requestAnimationFrame(() => {
    const firstField = form.querySelector('input, select, textarea');
    if (firstField) firstField.focus();
  });
}

function closeCorporateModal() {
  const modal = document.getElementById('corporateModal');
  const form = document.getElementById('corporateForm');
  if (form) form.reset();
  if (modal) modal.classList.add('hidden');
  corporateEditIndex = null;
  unlockModal();
}

function submitCorporateForm() {
  const name = getInputValue('corporateName');
  if (!name) {
    createToast('Missing company name', 'Please provide the company name.', 'warning');
    return;
  }

  const targetData = {
    company: name,
    location: getInputValue('corporateLocation'),
    type: getInputValue('corporateType'),
    employees: getInputValue('corporateEmployees'),
    status: getInputValue('corporateStatus') || 'Research',
    priority: getInputValue('corporatePriority') || 'Medium',
    focus: getInputValue('corporateFocus'),
    notes: getInputValue('corporateNotes')
  };

  if (corporateEditIndex !== null) {
    state.corporateTargets[corporateEditIndex] = {
      ...state.corporateTargets[corporateEditIndex],
      ...targetData
    };
    addActivity({ text: `Corporate target updated: ${targetData.company}`, type: 'corporate' });
    createToast('Company updated', `${targetData.company} saved.`, 'success');
  } else {
    state.corporateTargets.push({ ...targetData });
    addActivity({ text: `Corporate target added: ${targetData.company}`, type: 'corporate' });
    createToast('Company added', `${targetData.company} added to pipeline.`, 'success');
  }

  persistState();
  renderCorporateTargets();
  renderDashboard();
  closeCorporateModal();
}

function editCorporateTarget(companyName) {
  openCorporateModal(companyName);
}

function contactCorporate(companyName) {
  createToast('Outreach queued', `Kick off outreach workflow for ${companyName}.`, 'info');
}

function generateReport(reportType = 'executive') {
  const preview = document.getElementById('reportPreview');
  if (!preview) return;

  const templates = {
    pipeline: {
      title: 'Pipeline Health Report',
      summary: 'Snapshot of prospects, stages, and potential device inflow.'
    },
    leadSources: {
      title: 'Lead Source Analysis',
      summary: 'Channel performance across corporate outreach touchpoints.'
    },
    grant: {
      title: 'Grant Compliance Status',
      summary: 'Milestone readiness and funding utilization for Digital Champion Grant.'
    },
    stakeholder: {
      title: 'Stakeholder Update',
      summary: 'Executive-ready talking points for board and partner briefings.'
    },
    executive: {
      title: 'HTI Business Development Report',
      summary: 'Cross-functional update spanning partnerships, pipeline, and grants.'
    }
  };

  const template = templates[reportType] || templates.executive;
  const totalLeads = state.leads.length;
  const activeLeads = state.leads.filter((lead) => ACTIVE_STATUSES.has(lead.status)).length;
  const totalEquipment = state.leads.reduce((acc, lead) => acc + (Number(lead.estimatedQuantity) || 0), 0);
  const highPriorityLeads = state.leads.filter((lead) => (lead.priority ?? 0) >= 80);
  const highPriorityTargets = state.corporateTargets.filter((target) => target.priority === 'High');
  const grantProgress = calculateGrantProgress();

  preview.innerHTML = `
    <h3>${escapeHtml(template.title)}</h3>
    <section>
      <h4>Executive Summary</h4>
      <p>${escapeHtml(template.summary)}</p>
      <p><strong>Report Date:</strong> ${formatDate(new Date())}</p>
      <p><strong>Total Leads:</strong> ${formatNumber(totalLeads)}</p>
      <p><strong>Active Leads:</strong> ${formatNumber(activeLeads)}</p>
      <p><strong>Equipment Pipeline:</strong> ${formatNumber(totalEquipment)} devices</p>
      <p><strong>High Priority Targets:</strong> ${formatNumber(highPriorityTargets.length)}</p>
      <p><strong>Grant Progress:</strong> ${grantProgress.percent}% complete</p>
    </section>
    <section>
      <h4>High Priority Opportunities</h4>
      ${highPriorityLeads.length
        ? `<ul>${highPriorityLeads
            .map((lead) => `<li>${escapeHtml(lead.title)} · ${lead.estimatedQuantity ? formatNumber(lead.estimatedQuantity) : 'TBD'} devices (${escapeHtml(lead.status)})</li>`)
            .join('')}</ul>`
        : '<p>No high priority leads currently flagged.</p>'}
    </section>
    <section>
      <h4>Corporate Pipeline Status</h4>
      <ul>
        ${state.corporateTargets
          .map((target) => `<li>${escapeHtml(target.company)} · ${escapeHtml(target.status || 'Research')} (${escapeHtml(target.priority)} priority)</li>`)
          .join('')}
      </ul>
    </section>
    <section>
      <h4>Grant Milestones</h4>
      <ul>
        ${state.grantMilestones
          .map((milestone) => `<li>${escapeHtml(milestone.title)} · ${escapeHtml(getMilestoneStatus(milestone))} (Due: ${formatDate(milestone.dueDate)})</li>`)
          .join('')}
      </ul>
    </section>
  `;

  preview.hidden = false;
  preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  createToast('Report ready', `${template.title} generated.`, 'success');
}

function exportLeads() {
  if (!state.leads.length) {
    createToast('No data', 'There are no leads to export yet.', 'info');
    return;
  }

  const headers = ['ID', 'Title', 'Company', 'Contact', 'Source', 'Status', 'Priority', 'Quantity', 'Follow-up Date', 'Notes'];
  const rows = state.leads.map((lead) => [
    lead.id,
    lead.title,
    lead.company,
    lead.contact,
    lead.source,
    lead.status,
    lead.priority,
    lead.estimatedQuantity,
    lead.followUpDate,
    lead.notes
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map(toCsvValue).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hti-leads-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  createToast('Export complete', 'Leads exported as CSV.', 'success');
}

function downloadReportPDF() {
  const preview = document.getElementById('reportPreview');
  if (!preview) return;

  if (preview.hidden || !preview.innerHTML.trim()) {
    generateReport('executive');
  }

  const reportHtml = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>HTI Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #1f2121; }
          h3, h4 { margin: 0 0 8px 0; }
          section { margin-bottom: 20px; }
          ul { padding-left: 20px; }
        </style>
      </head>
      <body>${preview.innerHTML}</body>
    </html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    createToast('Popup blocked', 'Allow popups to print or save the report.', 'error');
    return;
  }

  printWindow.document.write(reportHtml);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  createToast('Print dialog opened', 'Use the browser print dialog to save as PDF.', 'info', 6000);
}

function logSampleActivity() {
  const samples = [
    'Introduced HTI mission to SAS corporate philanthropy team',
    'Scheduled discovery call with Cisco CSR program manager',
    'Uploaded compliance receipts for Q3 equipment conversions',
    'Coordinated logistics with Triangle Manufacturing Corp for asset pickup',
    'Drafted stakeholder update for Digital Champion Grant committee'
  ];
  const text = samples[Math.floor(Math.random() * samples.length)];
  addActivity({ text, type: 'note' });
  persistState();
  renderActivities();
  createToast('Activity logged', text, 'success');
}

function switchToTab(tabId) {
  const button = document.querySelector(`.nav__tab[data-tab="${tabId}"]`);
  if (button) button.click();
}

function handleBackdropClick(event) {
  const modals = document.querySelectorAll('.modal');
  modals.forEach((modal) => {
    if (event.target === modal) {
      if (modal.id === 'addLeadModal') closeAddLeadModal();
      if (modal.id === 'leadStatusModal') closeLeadStatusModal();
      if (modal.id === 'corporateModal') closeCorporateModal();
    }
  });

  const drawer = document.getElementById('leadDrawer');
  if (drawer && event.target === drawer) {
    closeLeadDrawer();
  }
}

function handleEscapeKey(event) {
  if (event.key !== 'Escape') return;

  const openModals = document.querySelectorAll('.modal:not(.hidden)');
  if (openModals.length) {
    const topModal = openModals[openModals.length - 1];
    if (topModal.id === 'addLeadModal') closeAddLeadModal();
    if (topModal.id === 'leadStatusModal') closeLeadStatusModal();
    if (topModal.id === 'corporateModal') closeCorporateModal();
    return;
  }

  const drawer = document.getElementById('leadDrawer');
  if (drawer && !drawer.classList.contains('hidden')) {
    closeLeadDrawer();
  }
}

function handleStorageSync(event) {
  if (event.key !== STORAGE_KEY) return;
  const newState = loadState();
  if (newState) {
    state = newState;
    renderAll();
  }
}

function calculateGrantProgress() {
  if (!state.grantMilestones.length) return { percent: 0 };
  let score = 0;
  state.grantMilestones.forEach((milestone) => {
    const status = getMilestoneStatus(milestone);
    if (status === 'Completed') score += 1;
    else if (status === 'In Progress') score += 0.5;
  });
  const percent = Math.round((score / state.grantMilestones.length) * 100);
  return { percent }; 
}

function calculateActiveAlerts() {
  const today = new Date();
  return state.leads.filter((lead) => {
    if (!lead.followUpDate) return false;
    if (CLOSED_STATUSES.has(lead.status)) return false;
    const diff = Math.floor((new Date(lead.followUpDate) - today) / (24 * 60 * 60 * 1000));
    return diff <= 2;
  }).length;
}

function leadAgeDays(lead) {
  if (!lead || !lead.date) return 0;
  const created = new Date(lead.date);
  if (Number.isNaN(created.getTime())) return 0;
  const diff = (Date.now() - created.getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(Math.round(diff), 0);
}

function leadWithinDays(lead, windowDays) {
  if (!lead || !lead.date) return false;
  const created = new Date(lead.date);
  if (Number.isNaN(created.getTime())) return false;
  const diff = (Date.now() - created.getTime()) / (24 * 60 * 60 * 1000);
  return diff >= 0 && diff <= windowDays;
}

function calculatePriorityScore(lead) {
  let score = 50;
  const quantity = Number(lead.estimatedQuantity) || 0;
  score += Math.min(Math.round(quantity / 10), 25);

  const sourceWeights = {
    'LinkedIn': 8,
    'Professional Referral': 12,
    'Reddit (r/sysadmin)': 10,
    'Reddit (r/ITManagers)': 10
  };
  score += sourceWeights[lead.source] || 5;

  if (lead.timeline && lead.timeline.toLowerCase().includes('urgent')) score += 10;
  if (lead.timeline && lead.timeline.toLowerCase().includes('immediate')) score += 12;

  return clamp(Math.round(score), 10, 100);
}

function addActivity({ text, type = 'note', timestamp = new Date().toISOString() }) {
  state.activities.unshift({
    id: `A${Date.now()}`,
    text,
    type,
    timestamp
  });
  state.activities = state.activities.slice(0, 20);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      leads: Array.isArray(parsed.leads) ? parsed.leads : clone(htiData.sampleLeads),
      corporateTargets: Array.isArray(parsed.corporateTargets) ? parsed.corporateTargets : clone(htiData.corporateTargets),
      grantMilestones: Array.isArray(parsed.grantMilestones) ? parsed.grantMilestones : clone(htiData.grantMilestones),
      activities: Array.isArray(parsed.activities) ? parsed.activities : clone(htiData.activities),
      analytics: {
        baselineActiveLead: parsed.analytics?.baselineActiveLead ?? htiData.analytics.baselineActiveLead,
        baselineEquipment: parsed.analytics?.baselineEquipment ?? htiData.analytics.baselineEquipment,
        lastUpdatedAt: parsed.analytics?.lastUpdatedAt ?? new Date().toISOString()
      }
    };
  } catch (error) {
    console.warn('Failed to load saved state', error);
    storageAvailable = false;
    return null;
  }
}

function createDefaultState() {
  return {
    leads: clone(htiData.sampleLeads),
    corporateTargets: clone(htiData.corporateTargets),
    grantMilestones: clone(htiData.grantMilestones),
    activities: clone(htiData.activities),
    analytics: {
      baselineActiveLead: htiData.analytics.baselineActiveLead,
      baselineEquipment: htiData.analytics.baselineEquipment,
      lastUpdatedAt: new Date().toISOString()
    }
  };
}

function persistState(updateTimestamp = true) {
  if (!storageAvailable) return;
  try {
    if (updateTimestamp) {
      state.analytics.lastUpdatedAt = new Date().toISOString();
      updateLastRefreshed();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to persist state', error);
    storageAvailable = false;
  }
}

function resetState() {
  const confirmed = window.confirm('Reset demo data and reload sample pipeline?');
  if (!confirmed) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear storage key', error);
  }

  state = createDefaultState();
  storageAvailable = true;
  renderAll();
  persistState();
  createToast('Sample data restored', 'Dashboard reset to the seeded CRM snapshot.', 'success');
}

function updateLastRefreshed() {
  const element = document.getElementById('lastRefreshed');
  if (!element) return;
  const iso = state.analytics?.lastUpdatedAt;
  if (!iso) {
    element.textContent = 'Tracking in realtime';
    return;
  }
  const timestamp = new Date(iso);
  const formatted = timestamp.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  element.textContent = `Updated ${formatted}`;
}

function getInputValue(id) {
  const input = document.getElementById(id);
  return input ? input.value.trim() : '';
}

function setInputValue(id, value) {
  const input = document.getElementById(id);
  if (input !== null && input !== undefined) {
    input.value = value ?? '';
  }
}

function getPriorityClass(priority) {
  if (priority >= 80) return 'high';
  if (priority >= 60) return 'medium';
  return 'low';
}

function getPriorityBadgeClass(priority) {
  const map = { High: 'error', Medium: 'warning', Low: 'info' };
  return map[priority] || 'info';
}

function getStatusClass(status) {
  const map = {
    'New': 'info',
    'Researching': 'info',
    'Initial Contact': 'info',
    'Qualified': 'success',
    'Proposal Sent': 'warning',
    'Negotiating': 'warning',
    'Committed': 'success',
    'Donated': 'success',
    'Not Interested': 'error',
    'Invalid': 'error',
    'Upcoming': 'warning',
    'In Progress': 'info',
    'Completed': 'success',
    'Overdue': 'error',
    'Planned': 'info',
    'Discovery Call': 'info',
    'Strategic Partner': 'success'
  };
  return map[status] || 'info';
}

function getMilestoneStatus(milestone) {
  const baseStatus = milestone.status || 'Upcoming';
  const dueDiff = daysUntil(milestone.dueDate);
  if (baseStatus === 'Completed') return 'Completed';
  if (dueDiff < 0) return 'Overdue';
  if (dueDiff <= UPCOMING_THRESHOLD_DAYS && baseStatus !== 'In Progress') return 'Upcoming';
  return baseStatus;
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFollowUp(dateString) {
  if (!dateString) return 'N/A';
  const relative = formatRelativeDate(dateString);
  return `${formatDate(dateString)}${relative ? ` (${relative})` : ''}`;
}

function formatRelativeDate(dateString) {
  if (!dateString) return '';
  const today = new Date();
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return '';
  const diffDays = Math.round((target - today) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays > 1) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

function formatDueLabel(dateString) {
  const diff = daysUntil(dateString);
  if (Number.isNaN(diff)) return '';
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff === 0) return 'due today';
  if (diff === 1) return 'due tomorrow';
  if (diff <= UPCOMING_THRESHOLD_DAYS) return `due in ${diff} days`;
  return '';
}

function daysUntil(dateString) {
  if (!dateString) return NaN;
  const today = new Date();
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return NaN;
  const diffMs = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

function formatActivityDate(timestamp) {
  if (!timestamp) return '—';
  const diff = daysUntil(timestamp);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  return formatDate(timestamp);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function aggregateBy(collection, key) {
  if (!collection.length) return { 'No Data': 1 };
  return collection.reduce((acc, item) => {
    const value = item[key] || 'Other';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function aggregateEquipmentTotals(leadsCollection) {
  if (!leadsCollection.length) return { 'No Data': 1 };

  const totals = leadsCollection.reduce((acc, lead) => {
    const type = lead.equipmentType || 'Other';
    const quantity = Number(lead.estimatedQuantity) || 0;
    acc[type] = (acc[type] || 0) + quantity;
    return acc;
  }, {});

  const totalQuantity = Object.values(totals).reduce((sum, value) => sum + value, 0);
  if (totalQuantity === 0) {
    return { 'No Data': 1 };
  }

  return totals;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeQuotes(value) {
  return String(value ?? '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function createToast(title, message, variant = 'info', timeout = 4000) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${variant}`;
  toast.innerHTML = `
    <div class="toast__icon">${variantIcon(variant)}</div>
    <div class="toast__body">
      <div class="toast__title">${escapeHtml(title)}</div>
      ${message ? `<div>${escapeHtml(message)}</div>` : ''}
    </div>
  `;
  toast.addEventListener('click', () => {
    toast.remove();
  });
  stack.appendChild(toast);
  if (timeout > 0) {
    setTimeout(() => {
      toast.remove();
    }, timeout);
  }
}

function variantIcon(variant) {
  switch (variant) {
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '⛔️';
    default:
      return 'ℹ️';
  }
}

function lockModal() {
  openModalCount += 1;
  document.body.classList.add('is-modal-open');
}

function unlockModal() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.classList.remove('is-modal-open');
  }
}

function lockDrawer() {
  document.body.classList.add('is-drawer-open');
}

function unlockDrawer() {
  document.body.classList.remove('is-drawer-open');
}

Object.assign(window, {
  openAddLeadModal,
  closeAddLeadModal,
  addLead,
  openLeadStatusModal,
  openLeadStatusModalFromDrawer,
  closeLeadStatusModal,
  submitLeadStatusForm,
  viewLead,
  closeLeadDrawer,
  viewTopLead,
  archiveLead,
  completeFollowUp,
  openCorporateModal,
  closeCorporateModal,
  submitCorporateForm,
  editCorporateTarget,
  contactCorporate,
  generateReport,
  exportLeads,
  downloadReportPDF,
  logSampleActivity,
  switchToTab,
  resetState
});
