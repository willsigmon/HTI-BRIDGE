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
const PERSONA_BUCKETS = [
  'Corporate IT Partner',
  'Tech Refresh Donor',
  'Government Surplus',
  'Government Procurement',
  'Healthcare System',
  'Education Partner',
  'Logistics Hotshot'
];
const PERSONA_TAG_DEFINITIONS = {
  'Corporate IT Partner': ['corporate', 'it'],
  'Tech Refresh Donor': ['technology', 'refresh'],
  'Government Surplus': ['public-sector', 'surplus'],
  'Government Procurement': ['public-sector', 'procurement'],
  'Healthcare System': ['healthcare'],
  'Education Partner': ['education', 'community'],
  'Logistics Hotshot': ['logistics', 'fast-turn']
};
const DEFAULT_SETTINGS = {
  personas: {
    enabled: {
      'Corporate IT Partner': true,
      'Tech Refresh Donor': true,
      'Government Surplus': true,
      'Government Procurement': true,
      'Healthcare System': true,
      'Education Partner': true,
      'Logistics Hotshot': true
    },
    weights: {
      'Corporate IT Partner': 1,
      'Tech Refresh Donor': 1,
      'Government Surplus': 1,
      'Government Procurement': 1,
      'Healthcare System': 1,
      'Education Partner': 1,
      'Logistics Hotshot': 1
    }
  },
  assignment: {
    defaultOwnerId: 'hti-outreach'
  },
  preferences: {
    enableMap: true,
    enableAutomations: true
  }
};
const USER_DIRECTORY = {
  'hti-admin': 'HTI Admin',
  'hti-outreach': 'Outreach Lead',
  'hti-fellow': 'HUBZone Fellow'
};
const UPCOMING_THRESHOLD_DAYS = 14;

const API_BASE_URL = window.__HTI_API_BASE__ || '/api';
const API_TIMEOUT_MS = 8000;

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
      potentialValue: 'High',
      persona: 'Tech Refresh Donor',
      personaTags: ['technology', 'refresh', 'urgent', 'persona:tech-refresh-donor']
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
      potentialValue: 'High',
      persona: 'Healthcare System',
      personaTags: ['healthcare', 'persona:healthcare-system']
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
      potentialValue: 'Medium-High',
      persona: 'Logistics Hotshot',
      personaTags: ['logistics', 'urgent', 'persona:logistics-hotshot']
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
    baselineEquipment: 425,
    personaBreakdown: {
      'Tech Refresh Donor': 1,
      'Healthcare System': 1,
      'Logistics Hotshot': 1
    }
  }
};

const filters = {
  status: '',
  source: '',
  priority: '',
  persona: '',
  search: '',
  sort: 'priority',
  corporatePriority: 'all'
};

let apiAvailable = false;
let state = createDefaultState();
let charts = { leadSources: null, equipment: null };
let leadStatusContext = { leadId: null };
let corporateEditIndex = null;
let openModalCount = 0;
let storageAvailable = true;
let topLeadId = null;
let refreshTimer = null;
let uiState = {
  selectedPipelineId: null,
  selectedEntityId: null,
  selectedAutomationPipelineId: null,
  selectedAutomationStageId: null,
  entityQuery: ''
};
let mapInstance = null;
let mapMarkers = [];
let mapReady = false;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

async function startApp() {
  await bootstrapData();
  initializeApp();
  registerServiceWorker();
}

function initializeApp() {
  setupTabNavigation();
  setupFilters();
  setupCorporateFilters();
  setupThemeToggle();
  bindGlobalHandlers();
  setupDataHubControls();
  setupAutomationControls();
  setupOperationsConsoleControls();
  setupSettingsControls();
  renderAll();
  updateLastRefreshed();
  setTimeout(updateCharts, 250);

  if (apiAvailable && !refreshTimer) {
    refreshTimer = setInterval(() => {
      if (apiAvailable) {
        refreshFromApi();
      }
    }, 5 * 60 * 1000);
  }
}

function renderAll() {
  populatePersonaFilter();
  renderDashboard();
  renderCorporateTargets();
  renderLeadsTable();
  renderDataHub();
  renderAutomationStudio();
  renderMapView();
  renderOperationsConsole();
  renderSettingsPanel();
  renderGrantMilestones();
  renderGrantRoadmap();
  updateComplianceHealth();
  renderActivities();
}

async function bootstrapData() {
  try {
    const response = await apiRequest('/bootstrap', { method: 'GET' });
    const payload = await response.json();
    hydrateStateFromBootstrap(payload);
    apiAvailable = true;
  } catch (error) {
    console.warn('API bootstrap unavailable, falling back to local dataset.', error);
    apiAvailable = false;
    state = loadState() ?? createDefaultState();
  }
}

async function refreshFromApi() {
  if (!apiAvailable) return;
  try {
    const response = await apiRequest('/bootstrap', { method: 'GET' });
    const payload = await response.json();
    hydrateStateFromBootstrap(payload);
    apiAvailable = true;
    renderAll();
    updateLastRefreshed();
  } catch (error) {
    console.warn('Unable to refresh from API, retaining current client state.', error);
  }
}

async function refreshDedupes() {
  if (!apiAvailable) return;
  try {
    const response = await apiRequest('/entities/dedupe', { method: 'GET' });
    const payload = await response.json();
    state.dedupeMatches = payload.duplicates || [];
    renderDataHub();
  } catch (error) {
    console.warn('Unable to refresh dedupe index', error);
  }
}

async function refreshInteractions(limit = 150) {
  if (!apiAvailable) return;
  try {
    const response = await apiRequest(`/interactions?limit=${limit}`, { method: 'GET' });
    const payload = await response.json();
    state.interactions = Array.isArray(payload) ? payload : payload.interactions || [];
    renderDataHub();
  } catch (error) {
    console.warn('Unable to refresh interactions', error);
  }
}

function hydrateStateFromBootstrap(payload = {}) {
  const leadsData = payload.leads ?? [];
  const corporateData = payload.corporateTargets ?? payload.corporate_targets ?? [];
  const milestonesData = payload.grantMilestones ?? payload.grant_milestones ?? [];
  const activitiesData = payload.activities ?? [];
  const dashboard = payload.dashboard ?? {};
  const syncLog = payload.syncLog ?? payload.sync_log ?? [];
  const entitiesData = payload.entities ?? [];
  const pipelinesData = payload.pipelines ?? [];
  const automationsData = payload.automations ?? [];
  const tasksData = payload.tasks ?? [];
  const ingestionJobsData = payload.ingestionJobs ?? [];
  const connectorsData = payload.connectors ?? [];
  const formsData = payload.forms ?? [];
  const apiKeysData = payload.apiKeys ?? [];
  const auditData = payload.audit ?? [];
  const analyticsPayload = payload.analytics ?? {};
  const mapPoints = payload.map?.points ?? payload.mapPoints ?? [];
  const interactionsData = payload.interactions ?? [];
  const settingsData = payload.settings ?? null;

  const totalEquipment = leadsData.reduce((sum, lead) => sum + (lead.estimatedQuantity ?? lead.estimated_quantity ?? 0), 0);

  const existingDedupes = state?.dedupeMatches ?? [];

  state = {
    leads: leadsData,
    corporateTargets: corporateData,
    grantMilestones: milestonesData,
    activities: activitiesData,
    syncLog,
    entities: entitiesData,
    pipelines: pipelinesData,
    automations: automationsData,
    tasks: tasksData,
    ingestionJobs: ingestionJobsData,
    connectors: connectorsData,
    forms: formsData,
    apiKeys: apiKeysData,
    audit: auditData,
    mapPoints,
    dedupeMatches: existingDedupes,
    interactions: interactionsData,
    analytics: {
      baselineActiveLead: dashboard.metrics?.activeLeads ?? dashboard.metrics?.active_leads ?? leadsData.length,
      baselineEquipment: dashboard.metrics?.totalEquipment ?? dashboard.metrics?.total_equipment ?? totalEquipment,
      forecastEquipment: analyticsPayload.leads?.forecastEquipment ?? 0,
      avgStageDuration: analyticsPayload.leads?.avgStageDuration ?? 0,
      pipelineBreakdown: analyticsPayload.pipeline ?? {},
      personaBreakdown: analyticsPayload.leads?.personaBreakdown || {},
      topPersona: analyticsPayload.leads?.topPersona || null,
      lastUpdatedAt: new Date().toISOString()
    },
    settings: settingsData ? mergeSettings(clone(DEFAULT_SETTINGS), settingsData) : state.settings || clone(DEFAULT_SETTINGS),
    serverAnalytics: analyticsPayload,
    dashboard
  };

  state.leads.forEach(assignPersonaMetadata);

  const personaBreakdown = buildPersonaBreakdown(state.leads);
  state.analytics.personaBreakdown = Object.keys(state.analytics.personaBreakdown || {}).length
    ? state.analytics.personaBreakdown
    : personaBreakdown;
  const topPersonaEntry = getTopPersona(state.analytics.personaBreakdown);
  state.analytics.topPersona = state.analytics.topPersona || (topPersonaEntry ? { name: topPersonaEntry[0], count: topPersonaEntry[1] } : null);

  state.dashboard = state.dashboard || {};
  state.dashboard.personaBreakdown = dashboard.personaBreakdown || personaBreakdown;
  state.dashboard.topPersona = dashboard.topPersona || state.analytics.topPersona;

  if (Array.isArray(state.mapPoints) && state.mapPoints.length) {
    const personaMap = new Map(state.leads.map((lead) => [lead.id, lead.persona]));
    state.mapPoints = state.mapPoints.map((point) => ({
      ...point,
      persona: point.persona || personaMap.get(point.id) || null
    }));
  }

  if (!uiState.selectedPipelineId && pipelinesData.length) {
    uiState.selectedPipelineId = pipelinesData[0].id;
  }

  populatePersonaFilter();
}

async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const headers = new Headers(options.headers || {});
  let body = options.body;

  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const message = await safeParseError(response);
      throw new Error(`API ${response.status}: ${message}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('API request timed out');
    }
    throw error;
  }
}

async function safeParseError(response) {
  try {
    const data = await response.json();
    return data.error || JSON.stringify(data);
  } catch (parseError) {
    return response.statusText || 'Unknown error';
  }
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
      if (targetTabId === 'map') {
        setTimeout(renderMapView, 100);
      }
      if (targetTabId === 'dataHub') {
        renderDataHub();
      }
      if (targetTabId === 'automation') {
        renderAutomationStudio();
      }
      if (targetTabId === 'admin') {
        renderOperationsConsole();
      }
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

  const personaFilter = document.getElementById('personaFilter');
  if (personaFilter) {
    personaFilter.addEventListener('change', (event) => {
      filters.persona = event.target.value;
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

function populatePersonaFilter() {
  const personaFilter = document.getElementById('personaFilter');
  if (!personaFilter) return;

  const personas = new Set(PERSONA_BUCKETS);
  (state.leads || []).forEach((lead) => {
    if (!lead.persona) assignPersonaMetadata(lead);
    if (lead.persona) personas.add(lead.persona);
  });

  const personaOptions = Array.from(personas)
    .filter((persona) => state.settings?.personas?.enabled?.[persona] !== false)
    .sort((a, b) => a.localeCompare(b));
  const previousValue = filters.persona;

  personaFilter.innerHTML = [
    '<option value="">All Personas</option>',
    ...personaOptions.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
  ].join('');

  if (previousValue && personaOptions.includes(previousValue)) {
    personaFilter.value = previousValue;
  } else {
    personaFilter.value = '';
    if (previousValue) {
      filters.persona = '';
    }
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

function setupDataHubControls() {
  const search = document.getElementById('dataHubSearch');
  if (search) {
    search.addEventListener('input', (event) => {
      uiState.entityQuery = event.target.value.trim().toLowerCase();
      renderDataHub();
    });
  }

  if (apiAvailable) {
    refreshDedupes();
    refreshInteractions(200);
  }
}

function setupAutomationControls() {
  const form = document.getElementById('automationForm');
  if (form) {
    form.addEventListener('submit', handleAutomationSubmit);
  }

  if (apiAvailable) {
    refreshAutomations();
    refreshTasks();
  }
}

function setupOperationsConsoleControls() {
  const connectorForm = document.getElementById('connectorForm');
  if (connectorForm) {
    connectorForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitConnectorForm();
    });
  }

  const apiKeyForm = document.getElementById('apiKeyForm');
  if (apiKeyForm) {
    apiKeyForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submitApiKeyForm();
    });
  }

  if (apiAvailable) {
    refreshOperationsConsole();
  } else {
    renderOperationsConsole();
  }
}

function setupSettingsControls() {
  const personaForm = document.getElementById('personaSettingsForm');
  if (personaForm) {
    personaForm.addEventListener('submit', (event) => event.preventDefault());
  }
  const preferencesForm = document.getElementById('preferencesForm');
  if (preferencesForm) {
    preferencesForm.addEventListener('submit', (event) => event.preventDefault());
  }
  const apiBaseForm = document.getElementById('apiBaseForm');
  if (apiBaseForm) {
    apiBaseForm.addEventListener('submit', (event) => event.preventDefault());
  }
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
  state.dashboard = state.dashboard || {};
  state.dashboard.metrics = state.dashboard.metrics || {};
  const dashboardMetrics = state.dashboard?.metrics || {};
  const grantProgressPercent = state.dashboard?.grantProgressPercent;

  const activeLeads = state.leads.filter((lead) => ACTIVE_STATUSES.has(lead.status));
  const totalEquipment = dashboardMetrics.totalEquipment ?? state.leads.reduce((total, lead) => total + (Number(lead.estimatedQuantity) || 0), 0);
  const highPriorityTargets = state.corporateTargets.filter((target) => (target.priority || '').toLowerCase() === 'high');
  const personaBreakdown = state.dashboard?.personaBreakdown || buildPersonaBreakdown(state.leads);
  const topPersonaEntry = state.dashboard?.topPersona?.name
    ? [state.dashboard.topPersona.name, state.dashboard.topPersona.count ?? personaBreakdown[state.dashboard.topPersona.name] ?? 0]
    : getTopPersona(personaBreakdown);
  const topPersonaName = topPersonaEntry ? topPersonaEntry[0] : null;

  state.dashboard.personaBreakdown = personaBreakdown;
  state.dashboard.topPersona = topPersonaEntry
    ? { name: topPersonaEntry[0], count: topPersonaEntry[1] }
    : null;

  const activeLeadEl = document.getElementById('activeLead');
  const equipmentPipelineEl = document.getElementById('equipmentPipeline');
  const grantProgressEl = document.getElementById('grantProgress');
  const highPriorityTargetsEl = document.getElementById('highPriorityTargets');
  const activeLeadTrendEl = document.getElementById('activeLeadTrend');
  const pipelineProgressBar = document.getElementById('pipelineProgressBar');
  const grantProgressBar = document.getElementById('grantProgressBar');
  const priorityHealthEl = document.getElementById('priorityHealth');
  const activeAlertsEl = document.getElementById('activeAlerts');
  const topPersonaChip = document.getElementById('topPersonaChip');

  const activeLeadCount = dashboardMetrics.activeLeads ?? activeLeads.length;
  if (activeLeadEl) activeLeadEl.textContent = activeLeadCount;
  if (equipmentPipelineEl) equipmentPipelineEl.textContent = formatNumber(totalEquipment);

  const pipelineProgress = clamp((totalEquipment / DEVICE_GOAL) * 100, 0, 100);
  if (pipelineProgressBar) pipelineProgressBar.style.width = `${pipelineProgress}%`;

  const grantProgress = Number.isFinite(grantProgressPercent)
    ? grantProgressPercent
    : calculateGrantProgress().percent;
  if (grantProgressEl) grantProgressEl.textContent = `${grantProgress}%`;
  if (grantProgressBar) grantProgressBar.style.width = `${grantProgress}%`;

  if (highPriorityTargetsEl) highPriorityTargetsEl.textContent = dashboardMetrics.highPriorityTargets ?? highPriorityTargets.length;

  if (activeLeadTrendEl) {
    if (!state.analytics.baselineActiveLead) {
      state.analytics.baselineActiveLead = activeLeadCount;
      persistState(false);
    }
    const diff = activeLeadCount - state.analytics.baselineActiveLead;
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

  if (topPersonaChip) {
    if (topPersonaName) {
      topPersonaChip.textContent = `Top Persona: ${topPersonaName}`;
      topPersonaChip.style.display = 'inline-flex';
    } else {
      topPersonaChip.style.display = 'none';
    }
  }

  renderLeadHealth();
  renderConversionSnapshot();
  renderTopOpportunity();
  renderPersonaSnapshot(personaBreakdown);
  renderActionCenter();
  updateCharts();
}

function renderLeadHealth() {
  const container = document.getElementById('leadHealth');
  if (!container) return;

  const dashboardMetrics = state.dashboard?.metrics || {};
  const totalLeads = dashboardMetrics.totalLeads ?? state.leads.length;
  const activeLeads = dashboardMetrics.activeLeads ?? state.leads.filter((lead) => ACTIVE_STATUSES.has(lead.status)).length;
  const conversions = dashboardMetrics.conversions ?? state.leads.filter((lead) => ['Committed', 'Donated'].includes(lead.status)).length;
  const totalEquipment = dashboardMetrics.totalEquipment ?? state.leads.reduce((total, lead) => total + (Number(lead.estimatedQuantity) || 0), 0);
  const avgQuantity = totalLeads === 0 ? 0 : Math.round(totalEquipment / totalLeads);
  const followUpsDue = calculateActiveAlerts();
  const personaBreakdown = state.dashboard?.personaBreakdown || buildPersonaBreakdown(state.leads);
  state.analytics.personaBreakdown = personaBreakdown;
  const topPersonaEntry = getTopPersona(personaBreakdown);
  state.analytics.topPersona = topPersonaEntry
    ? { name: topPersonaEntry[0], count: topPersonaEntry[1] }
    : null;
  state.dashboard = state.dashboard || {};
  state.dashboard.personaBreakdown = personaBreakdown;
  state.dashboard.topPersona = state.analytics.topPersona;

  container.innerHTML = `
    <span class="health-pill"><span class="health-pill__value">${formatNumber(totalLeads)}</span> total leads</span>
    <span class="health-pill"><span class="health-pill__value">${formatNumber(activeLeads)}</span> active pipeline</span>
    <span class="health-pill"><span class="health-pill__value">${formatNumber(avgQuantity)}</span> avg devices</span>
    <span class="health-pill"><span class="health-pill__value">${formatNumber(followUpsDue)}</span> follow-ups due</span>
    <span class="health-pill"><span class="health-pill__value">${formatNumber(conversions)}</span> conversions</span>
    ${topPersonaEntry ? `<span class="health-pill"><span class="health-pill__value">${escapeHtml(topPersonaEntry[0])}</span> lead persona</span>` : ''}
  `;
}

function renderConversionSnapshot() {
  const container = document.getElementById('conversionSnapshot');
  if (!container) return;

  const dashboardMetrics = state.dashboard?.metrics || {};
  const totalLeads = dashboardMetrics.totalLeads ?? state.leads.length;
  const conversions = dashboardMetrics.conversions ?? state.leads.filter((lead) => ['Committed', 'Donated'].includes(lead.status)).length;
  const conversionRate = dashboardMetrics.conversionRate ?? (totalLeads ? Math.round((conversions / totalLeads) * 100) : 0);
  const activeLeads = state.leads.filter((lead) => ACTIVE_STATUSES.has(lead.status));
  const avgAge = dashboardMetrics.avgLeadAge ?? (activeLeads.length ? Math.round(activeLeads.reduce((sum, lead) => sum + leadAgeDays(lead), 0) / activeLeads.length) : 0);
  const newThisWeek = dashboardMetrics.newLeadsThisWeek ?? state.leads.filter((lead) => leadWithinDays(lead, 7)).length;

  if (!totalLeads) {
    container.innerHTML = `
      <div class="snapshot-metric">
        <span class="snapshot-metric__label">Pipeline</span>
        <span class="snapshot-metric__value">0</span>
        <span class="snapshot-metric__delta">Add leads to unlock insights</span>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="snapshot-metric">
      <span class="snapshot-metric__label">Conversion rate</span>
      <span class="snapshot-metric__value">${conversionRate}%</span>
      <span class="snapshot-metric__delta">${formatNumber(conversions)} of ${formatNumber(totalLeads)} opportunities</span>
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

  assignPersonaMetadata(topLead);

  container.innerHTML = `
    <h4 class="snapshot-feature__title">${escapeHtml(topLead.title)}</h4>
    <div class="snapshot-feature__meta">
      <span>🏢 ${escapeHtml(topLead.company || 'Unassigned')}</span>
      <span>🎯 ${escapeHtml(topLead.status)}</span>
      <span>🔥 Score ${topLead.priority ?? '—'}</span>
      ${topLead.estimatedQuantity ? `<span>💻 ${formatNumber(topLead.estimatedQuantity)} devices</span>` : ''}
      ${topLead.followUpDate ? `<span>📅 ${formatDate(topLead.followUpDate)}</span>` : ''}
    </div>
    <div class="snapshot-feature__persona">${renderPersonaBadge(topLead)}</div>
    <p class="snapshot-feature__description">${escapeHtml(topLead.notes || 'Capture next steps and stakeholders to keep momentum up.')}</p>
  `;
}

function renderPersonaSnapshot(breakdown = {}) {
  const container = document.getElementById('personaSnapshot');
  if (!container) return;

  const entries = Object.entries(breakdown)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 4);
  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  if (!entries.length || total === 0) {
    container.innerHTML = '<li class="persona-list__item persona-list__item--empty">No persona data yet.</li>';
    return;
  }

  container.innerHTML = entries
    .map(([name, count]) => {
      const pct = Math.round((count / total) * 100);
      return `
        <li class="persona-list__item">
          <div class="persona-list__heading">
            <span class="persona-list__label">${escapeHtml(name)}</span>
            <span class="persona-list__count">${formatNumber(count)} · ${pct}%</span>
          </div>
          <div class="persona-list__bar">
            <span style="width:${Math.min(100, pct)}%"></span>
          </div>
        </li>
      `;
    })
    .join('');
}

function renderActionCenter() {
  const followUpContainer = document.getElementById('followUpQueue');
  const grantContainer = document.getElementById('grantAlertsList');
  const syncContainer = document.getElementById('syncLogList');

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

  if (syncContainer) {
    const entries = (state.syncLog || []).slice(0, 5);
    if (!entries.length) {
      syncContainer.innerHTML = `
        <li class="action-item">
          <div>
            <p class="action-item__title">No syncs recorded yet</p>
            <p class="section-subtitle">Run one of the ingestion scripts to populate this timeline.</p>
          </div>
        </li>
      `;
    } else {
      syncContainer.innerHTML = entries
        .map((entry) => {
          const statusClass = entry.success ? 'action-item' : 'action-item action-item--overdue';
          const tagClass = entry.success ? 'tag' : 'tag tag--danger';
          const runEnded = entry.run_completed_at ? formatDate(entry.run_completed_at) : 'In progress';
          return `
            <li class="${statusClass}">
              <div>
                <p class="action-item__title">${escapeHtml(entry.source || 'Sync')}</p>
                <div class="action-item__meta">
                  <span>📅 ${formatDate(entry.run_started_at)}</span>
                  <span>🕒 ${escapeHtml(runEnded)}</span>
                  <span>📦 ${formatNumber(entry.item_count || 0)} items</span>
                </div>
                ${entry.notes ? `<p class="snapshot-feature__description">${escapeHtml(entry.notes)}</p>` : ''}
              </div>
              <div class="action-item__cta">
                <span class="${tagClass}">${entry.success ? 'success' : 'error'}</span>
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

  const leadSourceCounts = state.dashboard?.leadSources || aggregateBy(state.leads, 'source');
  const equipmentTotals = state.dashboard?.equipmentByType || aggregateEquipmentTotals(state.leads);

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
  renderPipelineBoard();
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

function renderDataHub() {
  const listEl = document.getElementById('entityList');
  const detailEl = document.getElementById('entityDetail');
  const dedupeEl = document.getElementById('dedupeList');
  if (!listEl || !detailEl) return;

  const records = state.entities ?? [];
  if (!records.length) {
    listEl.innerHTML = `<div class="empty-state"><p>No contacts synced yet. Connect Gmail, Outlook, or import a CSV to populate the hub.</p></div>`;
    detailEl.innerHTML = `<div class="empty-state"><h3>Bring your relationships together</h3><p>Once data sync completes you will see household, company, and interaction timelines here.</p></div>`;
    if (dedupeEl) {
      dedupeEl.innerHTML = '<div class="empty-state"><p>No duplicates flagged.</p></div>';
    }
    return;
  }

  const query = uiState.entityQuery || '';
  const filtered = records
    .filter((record) => {
      if (!query) return true;
      const haystack = [record.name, record.displayName, record.organizationName, record.householdName, ...(record.emails || []), ...(record.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state"><p>No records found. Try adjusting your search.</p></div>`;
    detailEl.innerHTML = `<div class="empty-state"><h3>No match</h3><p>Search returned no contacts or organizations.</p></div>`;
    return;
  }

  if (!uiState.selectedEntityId || !filtered.some((record) => record.id === uiState.selectedEntityId)) {
    uiState.selectedEntityId = filtered[0].id;
  }

  listEl.innerHTML = filtered
    .slice(0, 60)
    .map((record) => {
      const typeLabel = record.recordType === 'organization' ? 'Organization' : record.recordType === 'household' ? 'Household' : 'Contact';
      const subtitle = record.recordType === 'contact'
        ? record.organizationName || record.emails?.[0] || 'Unassigned'
        : record.recordType === 'organization'
          ? `${record.contactCount || 0} linked contacts`
          : `${record.contactIds?.length || 0} contacts`;
      return `
        <button type="button" class="data-hub__list-item" data-entity-id="${escapeHtml(record.id)}" data-active="${record.id === uiState.selectedEntityId}">
          <div class="data-hub__title">${escapeHtml(record.name || record.displayName || 'Record')}</div>
          <div class="data-hub__meta">
            <span>${escapeHtml(typeLabel)}</span>
            <span>${escapeHtml(subtitle)}</span>
          </div>
        </button>
      `;
    })
    .join('');

  listEl.querySelectorAll('.data-hub__list-item').forEach((button) => {
    button.addEventListener('click', () => {
      uiState.selectedEntityId = button.getAttribute('data-entity-id');
      renderDataHub();
    });
  });

  const selectedRecord = filtered.find((record) => record.id === uiState.selectedEntityId) || filtered[0];
  detailEl.innerHTML = buildEntityDetail(selectedRecord);

  if (dedupeEl) {
    renderDedupePanel(dedupeEl);
  }
}

function buildEntityDetail(record) {
  if (!record) {
    return `<div class="empty-state"><h3>Select a record</h3><p>Review contact timelines, linked leads, and grant activity.</p></div>`;
  }

  const typeLabel = record.recordType === 'organization' ? 'Organization' : record.recordType === 'household' ? 'Household' : 'Contact';
  const leadChips = (record.leadIds || [])
    .map((leadId) => {
      const lead = state.leads.find((item) => item.id === leadId);
      if (!lead) return '';
      return `<button class="chip" type="button" onclick="viewLead('${escapeQuotes(lead.id)}')">${escapeHtml(lead.title)}</button>`;
    })
    .filter(Boolean)
    .join('');

  const metadata = [
    { label: 'Record Type', value: typeLabel },
    { label: 'Organization', value: record.organizationName || '—' },
    { label: 'Household', value: record.householdName || '—' },
    { label: 'Emails', value: (record.emails || []).join(', ') || '—' },
    { label: 'Phones', value: (record.phones || []).join(', ') || '—' },
    { label: 'Updated', value: formatRelativeTime(record.updatedAt || record.createdAt) }
  ]
    .map((entry) => `
      <div class="detail-item">
        <span class="detail-label">${escapeHtml(entry.label)}:</span>
        <span class="detail-value">${escapeHtml(entry.value)}</span>
      </div>
    `)
    .join('');

  const timeline = buildEntityTimeline(record);

  return `
    <header class="entity-header">
      <div>
        <h3>${escapeHtml(record.name || record.displayName || 'Record')}</h3>
        <p class="section-subtitle">${escapeHtml(typeLabel)} record with ${record.leadIds?.length || 0} linked leads.</p>
      </div>
      <div class="entity-tags">${(record.tags || []).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('')}</div>
    </header>
    <section class="entity-metadata">${metadata}</section>
    <section>
      <h4>Linked Leads</h4>
      <div class="chip-group">${leadChips || '<span class="detail-value">No leads linked yet.</span>'}</div>
    </section>
    <section>
      <h4>Interaction Timeline</h4>
      <div class="timeline">${timeline}</div>
    </section>
  `;
}

function buildEntityTimeline(record) {
  const interactions = (state.interactions || [])
    .filter((event) => event.entityId === record.id || event.leadId && (record.leadIds || []).includes(event.leadId))
    .sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0));

  if (!interactions.length) {
    return '<div class="empty-state"><p>No interactions synced yet.</p></div>';
  }

  return interactions
    .slice(0, 15)
    .map((event) => {
      const when = formatRelativeTime(event.occurredAt);
      return `
        <article class="activity-item">
          <div class="activity-date">${escapeHtml(when)}</div>
          <div>
            <div class="activity-text">${escapeHtml(event.summary || 'Interaction captured')}</div>
            <div class="activity-meta">${escapeHtml(event.type || 'note')} · ${escapeHtml(event.direction || '')}</div>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderDedupePanel(container) {
  if (!container) return;
  const matches = state.dedupeMatches ?? [];
  if (!matches.length) {
    container.innerHTML = '<div class="empty-state"><p>No duplicates flagged.</p></div>';
    return;
  }

  container.innerHTML = matches
    .slice(0, 8)
    .map((match) => {
      const [primaryId, duplicateId] = match.ids || [];
      const primary = state.entities.find((entity) => entity.id === primaryId);
      const duplicate = state.entities.find((entity) => entity.id === duplicateId);
      if (!primary || !duplicate) return '';
      return `
        <div class="dedupe-card">
          <div>
            <div class="detail-label">${escapeHtml(match.key)}</div>
            <div class="detail-value">${escapeHtml(primary.name || primary.displayName || primaryId)} ↔ ${escapeHtml(duplicate.name || duplicate.displayName || duplicateId)}</div>
          </div>
          <button class="btn btn--outline btn-sm" type="button" onclick="mergeDuplicate('${escapeQuotes(primaryId)}','${escapeQuotes(duplicateId)}')">Merge</button>
        </div>
      `;
    })
    .filter(Boolean)
    .join('');
}

async function mergeDuplicate(primaryId, duplicateId) {
  if (!apiAvailable) {
    createToast('Offline mode', 'Merging records requires the live API.', 'warning');
    return;
  }
  try {
    await apiRequest(`/entities/${primaryId}/merge`, {
      method: 'POST',
      body: { duplicateId }
    });
    createToast('Records merged', 'Duplicate contacts consolidated.', 'success');
    await refreshFromApi();
    await refreshDedupes();
  } catch (error) {
    console.error('Failed to merge contacts', error);
    createToast('Merge failed', error.message || 'Unable to merge contacts', 'error');
  }
}

function renderAutomationStudio() {
  const listEl = document.getElementById('automationList');
  const tasksEl = document.getElementById('taskQueue');
  const pipelineSelect = document.getElementById('automationPipeline');
  const stageSelect = document.getElementById('automationStage');
  const followUpInput = document.getElementById('automationFollowupDays');
  if (!listEl || !tasksEl || !pipelineSelect || !stageSelect || !followUpInput) return;

  if (state.settings?.preferences?.enableAutomations === false) {
    listEl.innerHTML = '<div class="empty-state"><p>Automation Studio is disabled in settings.</p></div>';
    tasksEl.innerHTML = '<div class="empty-state"><p>Enable automations in Settings to manage follow-up flows.</p></div>';
    pipelineSelect.disabled = true;
    stageSelect.disabled = true;
    followUpInput.disabled = true;
    return;
  }

  pipelineSelect.disabled = false;
  stageSelect.disabled = false;
  followUpInput.disabled = false;

  const pipelines = state.pipelines ?? [];
  if (!pipelines.length) {
    pipelineSelect.innerHTML = '<option value="" disabled selected>No pipelines configured</option>';
    stageSelect.innerHTML = '<option value="" disabled selected>---</option>';
    listEl.innerHTML = '<div class="empty-state"><p>Create a pipeline to start designing automations.</p></div>';
    tasksEl.innerHTML = '<div class="empty-state"><p>No tasks in queue.</p></div>';
    return;
  }

  if (!uiState.selectedAutomationPipelineId || !pipelines.some((pipeline) => pipeline.id === uiState.selectedAutomationPipelineId)) {
    uiState.selectedAutomationPipelineId = pipelines[0].id;
  }

  const pipelineOptions = pipelines
    .map((pipeline) => `<option value="${escapeHtml(pipeline.id)}" ${pipeline.id === uiState.selectedAutomationPipelineId ? 'selected' : ''}>${escapeHtml(pipeline.name)}</option>`)
    .join('');
  pipelineSelect.innerHTML = pipelineOptions;

  const selectedPipeline = pipelines.find((pipeline) => pipeline.id === uiState.selectedAutomationPipelineId) || pipelines[0];
  const stageOptions = (selectedPipeline?.stages || [])
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
    .map((stage, index) => {
      const selected = uiState.selectedAutomationStageId
        ? stage.id === uiState.selectedAutomationStageId
        : index === 0;
      if (selected) {
        uiState.selectedAutomationStageId = stage.id;
      }
      return `<option value="${escapeHtml(stage.id)}" ${selected ? 'selected' : ''}>${escapeHtml(stage.name)}</option>`;
    })
    .join('');
  stageSelect.innerHTML = stageOptions || '<option value="" disabled selected>No stages configured</option>';
  stageSelect.disabled = !stageOptions;

  pipelineSelect.addEventListener('change', (event) => {
    uiState.selectedAutomationPipelineId = event.target.value;
    uiState.selectedAutomationStageId = null;
    renderAutomationStudio();
  });

  stageSelect.addEventListener('change', (event) => {
    uiState.selectedAutomationStageId = event.target.value;
  });

  const automations = state.automations ?? [];
  if (!automations.length) {
    listEl.innerHTML = '<div class="empty-state"><p>No automations yet. Use the designer to schedule follow-ups automatically.</p></div>';
  } else {
    listEl.innerHTML = automations
      .map((automation) => {
        const stageNames = (automation.trigger?.stageIds || [])
          .map((id) => {
            const stage = selectedPipeline?.stages?.find((item) => item.id === id) || state.pipelines.flatMap((pipe) => pipe.stages || []).find((item) => item.id === id);
            return stage ? stage.name : 'Stage';
          })
          .join(', ');
        const actions = (automation.actions || []).map((action) => action.type.replace(/_/g, ' ')).join(', ');
        return `
          <article class="automation-card" data-automation-id="${escapeHtml(automation.id)}">
            <div class="kanban-card__title">${escapeHtml(automation.name)}</div>
            <div class="automation-pill">${escapeHtml(automation.status || 'active')}</div>
            <p class="detail-value">When ${stageNames || 'pipeline updates'} &middot; Actions: ${escapeHtml(actions || 'N/A')}</p>
            <div class="lead-actions">
              <button class="btn btn--outline btn-sm" type="button" onclick="toggleAutomationStatus('${escapeQuotes(automation.id)}','${escapeQuotes(automation.status || 'active')}')">${automation.status === 'paused' ? 'Resume' : 'Pause'}</button>
              <button class="btn btn--outline btn-sm" type="button" onclick="deleteAutomation('${escapeQuotes(automation.id)}')">Delete</button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  const tasks = state.tasks ?? [];
  if (!tasks.length) {
    tasksEl.innerHTML = '<div class="empty-state"><p>No follow-up tasks in the queue.</p></div>';
  } else {
    tasksEl.innerHTML = tasks
      .map((task) => {
        const statusLabel = task.status === 'completed' ? 'Completed' : formatRelativeTime(task.dueDate || task.due_date || task.updatedAt);
        return `
          <article class="task-card" data-status="${escapeHtml(task.status)}">
            <div class="kanban-card__title">${escapeHtml(task.title)}</div>
            <div class="detail-value">Due: ${escapeHtml(formatDate(task.dueDate || task.due_date || task.updatedAt))}</div>
            <div class="detail-value">Status: ${escapeHtml(statusLabel)}</div>
            <div class="lead-actions">
              ${task.status === 'completed' ? '' : `<button class="btn btn--outline btn-sm" type="button" onclick="completeTaskAction('${escapeQuotes(task.id)}')">Mark Done</button>`}
              ${task.leadId ? `<button class="btn btn--outline btn-sm" type="button" onclick="viewLead('${escapeQuotes(task.leadId)}')">Open Lead</button>` : ''}
            </div>
          </article>
        `;
      })
      .join('');
  }
}

async function handleAutomationSubmit(event) {
  event.preventDefault();
  if (!apiAvailable) {
    createToast('Offline mode', 'Automations require the live API.', 'warning');
    return;
  }

  const form = event.target;
  const name = form.querySelector('#automationName')?.value?.trim();
  const pipelineId = form.querySelector('#automationPipeline')?.value;
  const stageId = form.querySelector('#automationStage')?.value;
  const followUpDays = Number(form.querySelector('#automationFollowupDays')?.value || 3);
  const minPriority = Number(form.querySelector('#automationPriority')?.value || 0);
  const notes = form.querySelector('#automationNotes')?.value?.trim();

  if (!name || !pipelineId || !stageId) {
    createToast('Missing fields', 'Name, pipeline, and stage are required.', 'error');
    return;
  }

  try {
    await apiRequest('/automations', {
      method: 'POST',
      body: {
        name,
        trigger: {
          type: 'stage_change',
          pipelineId,
          stageIds: [stageId]
        },
        conditions: {
          minimumPriority: Number.isNaN(minPriority) ? undefined : minPriority
        },
        actions: [
          {
            type: 'schedule_follow_up',
            dueInDays: Number.isNaN(followUpDays) ? 3 : followUpDays,
            reason: notes || 'Automation follow-up'
          },
          notes
            ? { type: 'record_activity', message: notes, activityType: 'automation' }
            : { type: 'record_activity', message: `Automated follow-up scheduled for stage ${stageId}`, activityType: 'automation' }
        ]
      }
    });

    createToast('Automation saved', 'Flow is now monitoring your pipeline.', 'success');
    form.reset();
    form.querySelector('#automationFollowupDays').value = 3;
    form.querySelector('#automationPriority').value = 70;
    await refreshAutomations();
    await refreshTasks();
  } catch (error) {
    console.error('Failed to create automation', error);
    createToast('Automation failed', error.message || 'Unable to save automation', 'error');
  }
}

async function refreshAutomations() {
  if (!apiAvailable) return;
  try {
    const response = await apiRequest('/automations', { method: 'GET' });
    const payload = await response.json();
    state.automations = Array.isArray(payload) ? payload : payload.automations || [];
    renderAutomationStudio();
  } catch (error) {
    console.warn('Unable to refresh automations', error);
  }
}

async function refreshTasks() {
  if (!apiAvailable) return;
  try {
    const response = await apiRequest('/tasks', { method: 'GET' });
    const payload = await response.json();
    state.tasks = Array.isArray(payload) ? payload : payload.tasks || [];
    renderAutomationStudio();
  } catch (error) {
    console.warn('Unable to refresh tasks', error);
  }
}

async function toggleAutomationStatus(id, status) {
  if (!apiAvailable) return;
  const nextStatus = status === 'paused' ? 'active' : 'paused';
  try {
    await apiRequest(`/automations/${id}`, {
      method: 'PATCH',
      body: { status: nextStatus }
    });
    createToast('Automation updated', `Flow is now ${nextStatus}.`, 'info');
    await refreshAutomations();
  } catch (error) {
    console.error('Failed to toggle automation', error);
    createToast('Update failed', error.message || 'Unable to update automation', 'error');
  }
}

async function deleteAutomation(id) {
  if (!apiAvailable) return;
  const confirmed = window.confirm('Delete this automation? Flow history will remain in the audit log.');
  if (!confirmed) return;
  try {
    await apiRequest(`/automations/${id}`, { method: 'DELETE' });
    createToast('Automation removed', 'Flow deleted successfully.', 'success');
    await refreshAutomations();
  } catch (error) {
    console.error('Failed to delete automation', error);
    createToast('Delete failed', error.message || 'Unable to delete automation', 'error');
  }
}

async function completeTaskAction(id) {
  if (!apiAvailable) {
    createToast('Offline mode', 'Task completion syncs with the live API.', 'warning');
    return;
  }
  try {
    await apiRequest(`/tasks/${id}/complete`, { method: 'PATCH' });
    createToast('Task completed', 'Marked complete and logged to the timeline.', 'success');
    await refreshTasks();
  } catch (error) {
    console.error('Failed to complete task', error);
    createToast('Action failed', error.message || 'Unable to complete task', 'error');
  }
}

function renderMapView() {
  const mapContainer = document.getElementById('mapView');
  const summaryEl = document.getElementById('mapSummary');
  const routesEl = document.getElementById('routeList');
  if (!mapContainer || !summaryEl || !routesEl) return;

  if (state.settings?.preferences?.enableMap === false) {
    mapContainer.innerHTML = '<div class="empty-state"><p>Map is disabled in settings.</p></div>';
    summaryEl.innerHTML = '';
    routesEl.innerHTML = '<div class="empty-state"><p>Enable the map in Settings to view routes.</p></div>';
    return;
  }

  const points = (state.mapPoints && state.mapPoints.length ? state.mapPoints : deriveMapPointsFromLeads()).slice(0, 250);

  if (!mapInstance) {
    mapInstance = L.map(mapContainer).setView([35.7796, -78.6382], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(mapInstance);
    mapReady = true;
  } else {
    mapInstance.invalidateSize();
  }

  mapMarkers.forEach((marker) => marker.remove());
  mapMarkers = points.map((point) => {
    const marker = L.circleMarker([point.lat, point.lng], {
      radius: Math.max(6, Math.min(14, (point.estimatedQuantity || 10) / 20)),
      fillColor: '#0f766e',
      color: '#0f4c5c',
      weight: 1,
      fillOpacity: 0.75
    }).addTo(mapInstance);
    marker.bindPopup(`
      <strong>${escapeHtml(point.title || point.company || 'Lead')}</strong><br>
      ${escapeHtml(point.company || 'Unknown')}<br>
      ${escapeHtml(point.location || 'Location pending')}<br>
      ${point.persona ? `Persona: ${escapeHtml(point.persona)}<br>` : ''}
      Qty: ${formatNumber(point.estimatedQuantity || 0)}
    `);
    return marker;
  });

  if (points.length) {
    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    mapInstance.fitBounds(bounds, { padding: [40, 40] });
  }

  const totalDevices = points.reduce((sum, point) => sum + (Number(point.estimatedQuantity) || 0), 0);
  const highPriority = points.filter((point) => (point.priority || 0) >= 80).length;
  summaryEl.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Stops</span>
      <span class="detail-value">${formatNumber(points.length)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Projected Devices</span>
      <span class="detail-value">${formatNumber(totalDevices)}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">High Priority</span>
      <span class="detail-value">${formatNumber(highPriority)}</span>
    </div>
  `;

  const upcoming = points
    .filter((point) => point.followUpDate)
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))
    .slice(0, 6);

  routesEl.innerHTML = upcoming.length
    ? upcoming
        .map((point) => `
            <div class="route-card">
              <div class="detail-label">${formatDate(point.followUpDate)}</div>
              <div class="detail-value">${escapeHtml(point.company || point.title || 'Lead')}</div>
              <div class="detail-value">${escapeHtml(point.location || 'Location pending')}</div>
              <button class="btn btn--outline btn-sm" type="button" onclick="viewLead('${escapeQuotes(point.id)}')">Open Lead</button>
            </div>
          `)
        .join('')
    : '<div class="empty-state"><p>No scheduled routes this week.</p></div>';

  if (apiAvailable && !state.mapPoints?.length) {
    refreshMap();
  }
}

async function refreshMap() {
  if (!apiAvailable) return;
  try {
    const response = await apiRequest('/maps/leads', { method: 'GET' });
    const payload = await response.json();
    state.mapPoints = Array.isArray(payload) ? payload : payload.points || [];
    renderMapView();
  } catch (error) {
    console.warn('Unable to refresh map', error);
  }
}

function renderOperationsConsole() {
  const ingestionEl = document.getElementById('ingestionConsole');
  const connectorEl = document.getElementById('connectorConsole');
  const apiKeyEl = document.getElementById('apiKeyConsole');
  const formEl = document.getElementById('formConsole');
  if (!ingestionEl || !connectorEl || !apiKeyEl || !formEl) return;

  const jobs = state.ingestionJobs ?? [];
  ingestionEl.innerHTML = jobs.length
    ? jobs
        .map((job) => `
          <div class="admin-table__row">
            <div>
              <strong>${escapeHtml(job.source || job.id)}</strong>
              <div class="detail-value">Status: ${escapeHtml(job.status || 'idle')} · Next: ${escapeHtml(job.nextRunAt || '—')}</div>
            </div>
            <div class="lead-actions">
              <button class="btn btn--outline btn-sm" type="button" onclick="runIngestionJob('${escapeQuotes(job.id)}')">Run</button>
              <button class="btn btn--outline btn-sm" type="button" onclick="toggleIngestionJob('${escapeQuotes(job.id)}', ${job.enabled ? 'false' : 'true'})">${job.enabled ? 'Pause' : 'Resume'}</button>
            </div>
          </div>
        `)
        .join('')
    : '<div class="empty-state"><p>No ingestion jobs configured.</p></div>';

  const connectors = state.connectors ?? [];
  connectorEl.innerHTML = `
    ${(connectors.length
      ? connectors
          .map(
            (connector) => `
              <div class="admin-table__row">
                <div>
                  <strong>${escapeHtml(connector.name)}</strong>
                  <div class="detail-value">${escapeHtml(connector.type)} · ${escapeHtml(connector.status || 'connected')}</div>
                </div>
                <div class="lead-actions">
                  <button class="btn btn--outline btn-sm" type="button" onclick="refreshConnector('${escapeQuotes(connector.id)}')">Sync</button>
                </div>
              </div>
            `
          )
          .join('')
      : '<div class="empty-state"><p>No connectors registered.</p></div>')
    }
    <section class="connector-import">
      <h4>Quick Import</h4>
      <textarea class="form-control" id="csvImportText" rows="3" placeholder="Paste CSV rows to ingest interactions"></textarea>
      <div class="lead-actions">
        <button class="btn btn--outline btn-sm" type="button" onclick="importCsvInteractions()">Import CSV</button>
        <button class="btn btn--outline btn-sm" type="button" onclick="importIcsCalendar()">Import ICS</button>
      </div>
    </section>
  `;

  const apiKeys = state.apiKeys ?? [];
  apiKeyEl.innerHTML = apiKeys.length
    ? apiKeys
        .map((key) => `
          <div class="admin-table__row">
            <div>
              <strong>${escapeHtml(key.name)}</strong>
              <div class="detail-value">Prefix ${escapeHtml(key.prefix || '')} · Scopes: ${(key.scopes || []).join(', ') || '—'}</div>
            </div>
            <div class="lead-actions">
              <button class="btn btn--outline btn-sm" type="button" onclick="revokeApiKey('${escapeQuotes(key.id)}')">Revoke</button>
            </div>
          </div>
        `)
        .join('')
    : '<div class="empty-state"><p>No API keys issued.</p></div>';

  const forms = state.forms ?? [];
  formEl.innerHTML = forms.length
    ? forms
        .map((form) => `
          <div class="admin-table__row">
            <div>
              <strong>${escapeHtml(form.name)}</strong>
              <div class="detail-value">/${escapeHtml(form.slug)} · ${escapeHtml(form.status || 'active')}</div>
            </div>
            <div class="lead-actions">
              <button class="btn btn--outline btn-sm" type="button" onclick="copyFormEmbed('${escapeQuotes(form.id)}')">Copy Embed</button>
            </div>
          </div>
        `)
        .join('')
    : '<div class="empty-state"><p>No intake forms created.</p></div>';
}

async function refreshOperationsConsole() {
  if (!apiAvailable) {
    renderOperationsConsole();
    return;
  }
  try {
    const [jobs, connectors, forms, keys] = await Promise.all([
      apiRequest('/admin/ingestion', { method: 'GET' }).then((res) => res.json()),
      apiRequest('/connectors', { method: 'GET' }).then((res) => res.json()),
      apiRequest('/forms', { method: 'GET' }).then((res) => res.json()),
      apiRequest('/security/api-keys', { method: 'GET' }).then((res) => res.json())
    ]);
    state.ingestionJobs = Array.isArray(jobs) ? jobs : jobs.ingestionJobs || jobs;
    state.connectors = Array.isArray(connectors) ? connectors : connectors.connectors || connectors;
    state.forms = Array.isArray(forms) ? forms : forms.forms || forms;
    state.apiKeys = Array.isArray(keys) ? keys : keys.apiKeys || keys;
    renderOperationsConsole();
  } catch (error) {
    console.warn('Unable to refresh operations console', error);
  }
}

async function runIngestionJob(id) {
  if (!apiAvailable) {
    createToast('Offline mode', 'Ingestion jobs require the live API.', 'warning');
    return;
  }
  try {
    await apiRequest(`/admin/ingestion/${id}/run`, {
      method: 'POST',
      body: { success: true, itemCount: 0, notes: 'Manual run from console' }
    });
    createToast('Ingestion queued', 'Job executed successfully.', 'success');
    await refreshOperationsConsole();
  } catch (error) {
    console.error('Failed to run ingestion job', error);
    createToast('Run failed', error.message || 'Unable to trigger job', 'error');
  }
}

async function toggleIngestionJob(id, enabled) {
  if (!apiAvailable) return;
  try {
    await apiRequest(`/admin/ingestion/${id}`, {
      method: 'PATCH',
      body: { enabled }
    });
    createToast('Ingestion updated', enabled ? 'Job resumed.' : 'Job paused.', 'info');
    await refreshOperationsConsole();
  } catch (error) {
    console.error('Failed to toggle ingestion job', error);
    createToast('Update failed', error.message || 'Unable to update job', 'error');
  }
}

async function refreshConnector(id) {
  if (!apiAvailable) return;
  createToast('Sync requested', 'Connector sync will run shortly.', 'info');
  await refreshOperationsConsole();
}

async function importCsvInteractions() {
  if (!apiAvailable) {
    createToast('Offline mode', 'CSV import syncs interactions to the API.', 'warning');
    return;
  }
  const textarea = document.getElementById('csvImportText');
  if (!textarea || !textarea.value.trim()) {
    createToast('Missing CSV', 'Paste CSV rows before importing.', 'error');
    return;
  }
  try {
    await apiRequest('/connectors/import/csv', {
      method: 'POST',
      body: { csv: textarea.value }
    });
    textarea.value = '';
    createToast('CSV imported', 'Interactions appended to timelines.', 'success');
    await refreshInteractions(200);
    await refreshOperationsConsole();
  } catch (error) {
    console.error('CSV import failed', error);
    createToast('Import failed', error.message || 'Unable to parse CSV', 'error');
  }
}

async function importIcsCalendar() {
  if (!apiAvailable) {
    createToast('Offline mode', 'Calendar import syncs with the API.', 'warning');
    return;
  }
  const textarea = document.getElementById('csvImportText');
  if (!textarea || !textarea.value.trim()) {
    createToast('Missing ICS', 'Paste ICS content before importing.', 'error');
    return;
  }
  try {
    await apiRequest('/connectors/import/ics', {
      method: 'POST',
      body: { ics: textarea.value }
    });
    textarea.value = '';
    createToast('Calendar imported', 'Events added to the timeline.', 'success');
    await refreshInteractions(200);
  } catch (error) {
    console.error('ICS import failed', error);
    createToast('Import failed', error.message || 'Unable to parse ICS file', 'error');
  }
}

function openConnectorModal() {
  openModal('connectorModal');
}

function closeConnectorModal() {
  closeModal('connectorModal');
}

async function submitConnectorForm() {
  if (!apiAvailable) {
    createToast('Offline mode', 'Connector registration requires the live API.', 'warning');
    return;
  }
  const name = document.getElementById('connectorName')?.value?.trim();
  const type = document.getElementById('connectorType')?.value;
  const status = document.getElementById('connectorStatus')?.value;
  const settings = document.getElementById('connectorSettings')?.value;
  if (!name || !type) {
    createToast('Missing fields', 'Connector name and type are required.', 'error');
    return;
  }
  try {
    await apiRequest('/connectors', {
      method: 'POST',
      body: {
        name,
        type,
        status,
        settings: settings ? { notes: settings } : undefined
      }
    });
    createToast('Connector saved', 'Connector registered successfully.', 'success');
    closeConnectorModal();
    await refreshOperationsConsole();
  } catch (error) {
    console.error('Failed to register connector', error);
    createToast('Save failed', error.message || 'Unable to register connector', 'error');
  }
}

function openApiKeyModal() {
  openModal('apiKeyModal');
}

function closeApiKeyModal() {
  closeModal('apiKeyModal');
}

async function submitApiKeyForm() {
  if (!apiAvailable) {
    createToast('Offline mode', 'API key generation requires the live API.', 'warning');
    return;
  }
  const name = document.getElementById('apiKeyName')?.value?.trim();
  const expiry = document.getElementById('apiKeyExpiry')?.value;
  const originInput = document.getElementById('apiKeyOrigins');
  const scopes = Array.from(document.querySelectorAll('#apiKeyForm input[type="checkbox"]:checked')).map((input) => input.value);
  if (!name) {
    createToast('Missing label', 'Provide a key label before generating.', 'error');
    return;
  }
  try {
    const response = await apiRequest('/security/api-keys', {
      method: 'POST',
      body: {
        name,
        scopes,
        expiresAt: expiry || undefined,
        allowedOrigins: originInput?.value ? originInput.value.split(',').map((item) => item.trim()).filter(Boolean) : undefined
      }
    });
    const payload = await response.json();
    closeApiKeyModal();
    await refreshOperationsConsole();
    if (payload.secret) {
      navigator.clipboard?.writeText(payload.secret).catch(() => {});
      createToast('API key created', 'Secret copied to clipboard.', 'success');
    } else {
      createToast('API key created', 'Key created successfully.', 'success');
    }
  } catch (error) {
    console.error('Failed to create API key', error);
    createToast('Create failed', error.message || 'Unable to generate API key', 'error');
  }
}

async function revokeApiKey(id) {
  if (!apiAvailable) return;
  const confirmed = window.confirm('Revoke this API key? Access will be removed immediately.');
  if (!confirmed) return;
  try {
    await apiRequest(`/security/api-keys/${id}`, { method: 'DELETE' });
    createToast('API key revoked', 'Key removed successfully.', 'success');
    await refreshOperationsConsole();
  } catch (error) {
    console.error('Failed to revoke API key', error);
    createToast('Revoke failed', error.message || 'Unable to revoke API key', 'error');
  }
}

async function copyFormEmbed(id) {
  if (!apiAvailable) {
    createToast('Offline mode', 'Embed snippets load from the live API.', 'warning');
    return;
  }
  try {
    const response = await apiRequest(`/forms/${id}/embed`, { method: 'GET' });
    const snippet = await response.text();
    await navigator.clipboard?.writeText(snippet);
    createToast('Embed copied', 'Snippet added to clipboard.', 'success');
  } catch (error) {
    console.error('Failed to fetch embed snippet', error);
    createToast('Copy failed', error.message || 'Unable to fetch embed code', 'error');
  }
}

function renderSettingsPanel() {
  const personaForm = document.getElementById('personaSettingsForm');
  const ownerSelect = document.getElementById('defaultOwnerSelect');
  const toggleMap = document.getElementById('toggleMap');
  const toggleAutomations = document.getElementById('toggleAutomations');
  const apiBaseInput = document.getElementById('apiBaseInput');

  const settings = state.settings || clone(DEFAULT_SETTINGS);

  if (personaForm) {
    const personas = new Set([
      ...PERSONA_BUCKETS,
      ...Object.keys(settings.personas?.enabled || {})
    ]);
    const rows = Array.from(personas)
      .sort((a, b) => a.localeCompare(b))
      .map((persona) => {
        const enabled = settings.personas?.enabled?.[persona] !== false;
        const weight = settings.personas?.weights?.[persona] ?? 1;
        return `
          <tr data-persona-row="${escapeHtml(persona)}">
            <th scope="row">${escapeHtml(persona)}</th>
            <td>
              <label class="checkbox checkbox--inline">
                <input type="checkbox" ${enabled ? 'checked' : ''} data-persona-enabled="${escapeHtml(persona)}">
                <span>Enabled</span>
              </label>
            </td>
            <td>
              <input type="number" step="0.1" min="0" max="5" value="${escapeHtml(weight)}" data-persona-weight="${escapeHtml(persona)}" class="form-control">
            </td>
          </tr>
        `;
      })
      .join('');

    personaForm.innerHTML = `
      <table class="settings-table">
        <thead>
          <tr>
            <th>Persona</th>
            <th>Status</th>
            <th>Weight</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  if (ownerSelect) {
    ownerSelect.value = settings.assignment?.defaultOwnerId || 'hti-outreach';
  }
  if (toggleMap) {
    toggleMap.checked = settings.preferences?.enableMap !== false;
  }
  if (toggleAutomations) {
    toggleAutomations.checked = settings.preferences?.enableAutomations !== false;
  }
  if (apiBaseInput) {
    apiBaseInput.value = localStorage.getItem('hti-api-base') || API_BASE_URL;
  }
}

async function refreshSettingsFromApi() {
  if (!apiAvailable) {
    createToast('Offline mode', 'Using locally cached settings.', 'warning');
    renderSettingsPanel();
    return;
  }
  try {
    const response = await apiRequest('/settings', { method: 'GET' });
    const payload = await response.json();
    applySettingsPatch(payload, false);
    createToast('Settings synced', 'Fetched latest configuration from the API.', 'success');
  } catch (error) {
    console.error('Failed to fetch settings', error);
    createToast('Sync failed', error.message || 'Unable to load settings', 'error');
  }
}

async function savePersonaSettings() {
  const personaForm = document.getElementById('personaSettingsForm');
  if (!personaForm) return;
  const enabled = {};
  const weights = {};
  personaForm.querySelectorAll('[data-persona-row]').forEach((row) => {
    const persona = row.getAttribute('data-persona-row');
    const checkbox = row.querySelector(`[data-persona-enabled="${persona}"]`);
    const weightInput = row.querySelector(`[data-persona-weight="${persona}"]`);
    if (!persona) return;
    enabled[persona] = checkbox ? checkbox.checked : true;
    const weight = Number(weightInput?.value ?? 1);
    weights[persona] = Number.isFinite(weight) && weight > 0 ? weight : 1;
  });

  const patch = { personas: { enabled, weights } };
  await persistSettingsPatch(patch, 'Persona settings updated', 'Saved persona preferences locally.');
}

async function savePreferenceSettings() {
  const ownerSelect = document.getElementById('defaultOwnerSelect');
  const toggleMap = document.getElementById('toggleMap');
  const toggleAutomations = document.getElementById('toggleAutomations');
  const patch = {
    assignment: {
      defaultOwnerId: ownerSelect?.value || 'hti-outreach'
    },
    preferences: {
      enableMap: toggleMap?.checked !== false,
      enableAutomations: toggleAutomations?.checked !== false
    }
  };
  await persistSettingsPatch(patch, 'Preferences saved', 'Updated assignment and feature toggles.');
}

function saveApiBaseOverride() {
  const input = document.getElementById('apiBaseInput');
  if (!input) return;
  const value = input.value.trim();
  if (!value) {
    createToast('Missing URL', 'Enter an API base URL before saving.', 'warning');
    return;
  }
  localStorage.setItem('hti-api-base', value);
  window.__HTI_API_BASE__ = value;
  createToast('API base updated', 'Reload the page to use the new endpoint.', 'info');
}

function clearApiBaseOverride() {
  localStorage.removeItem('hti-api-base');
  window.__HTI_API_BASE__ = '/api';
  const input = document.getElementById('apiBaseInput');
  if (input) input.value = API_BASE_URL;
  createToast('API base cleared', 'Using default relative API path.', 'success');
}

async function resetSettingsToDefaults() {
  const confirmed = window.confirm('Reset all settings to defaults?');
  if (!confirmed) return;
  await persistSettingsPatch(clone(DEFAULT_SETTINGS), 'Settings reset', 'Restored default configuration.');
}

async function persistSettingsPatch(patch, successMessage, offlineMessage) {
  if (apiAvailable) {
    try {
      await apiRequest('/settings', { method: 'PUT', body: patch });
      await refreshSettingsFromApi();
      createToast('Settings saved', successMessage, 'success');
      return;
    } catch (error) {
      console.warn('API settings update failed, applying locally.', error);
      createToast('Offline mode', offlineMessage, 'warning');
      apiAvailable = false;
    }
  }

  applySettingsPatch(patch, true);
  createToast('Settings saved', offlineMessage, 'success');
}

function renderPipelineBoard() {
  const board = document.getElementById('pipelineBoard');
  if (!board) return;

  const pipelines = state.pipelines ?? [];
  if (!pipelines.length) {
    board.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__title">Pipelines not configured</div>
        <div class="empty-state__body">Define a primary pipeline to visualize donation flow.</div>
      </div>
    `;
    return;
  }

  let selected = pipelines.find((pipeline) => pipeline.id === uiState.selectedPipelineId);
  if (!selected) {
    selected = pipelines[0];
    uiState.selectedPipelineId = selected?.id || null;
  }

  const options = pipelines
    .map((pipeline) => `<option value="${escapeHtml(pipeline.id)}" ${pipeline.id === selected.id ? 'selected' : ''}>${escapeHtml(pipeline.name)}</option>`)
    .join('');

  const lanes = (selected?.stages || [])
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
    .map((stage) => {
      const stageLeads = state.leads
        .filter((lead) => lead.pipelineId === selected.id && lead.stageId === stage.id)
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

      const cards = stageLeads
        .map((lead) => {
          assignPersonaMetadata(lead);
          const probability = typeof lead.probability === 'number' ? Math.round(lead.probability * 100) : 0;
          return `
            <article class="kanban-card" data-lead-id="${escapeHtml(lead.id)}">
              <div class="kanban-card__title">${escapeHtml(lead.title)}</div>
              <div class="kanban-card__meta">
                <span>${escapeHtml(lead.company || 'Unknown')}</span>
                <span>${lead.estimatedQuantity ? formatNumber(lead.estimatedQuantity) : '—'} units</span>
              </div>
              <div class="kanban-card__meta">
                <span>Priority ${lead.priority ?? '—'}</span>
                <span>${probability}% win</span>
              </div>
              <div class="kanban-card__persona">${renderPersonaBadge(lead)}</div>
              <button class="btn btn--outline btn-sm" type="button" onclick="viewLead('${escapeQuotes(lead.id)}')">View lead</button>
            </article>
          `;
        })
        .join('');

      return `
        <section class="kanban-lane" data-stage-id="${escapeHtml(stage.id)}">
          <header class="kanban-lane__header">
            <div class="kanban-lane__title">
              <span>${escapeHtml(stage.name)}</span>
              <span class="badge">${stageLeads.length}</span>
            </div>
            <p class="section-subtitle">${Math.round((stage.probability ?? 0) * 100)}% confidence</p>
          </header>
          <div class="kanban-lane__body">
            ${cards || '<div class="empty-state"><p>No leads in this stage.</p></div>'}
          </div>
        </section>
      `;
    })
    .join('');

  const forecast = calculatePipelineForecast(selected.id);

  board.innerHTML = `
    <div class="kanban-header">
      <div>
        <h3>${escapeHtml(selected.name)}</h3>
        <p class="section-subtitle">Forecasted yield: <strong>${formatNumber(Math.round(forecast))}</strong> devices</p>
      </div>
      <div class="kanban-controls">
        <label class="form-label" for="pipelineSelect">Pipeline</label>
        <select class="form-control" id="pipelineSelect">${options}</select>
      </div>
    </div>
    <div class="kanban">${lanes}</div>
  `;

  const select = board.querySelector('#pipelineSelect');
  if (select) {
    select.addEventListener('change', (event) => {
      uiState.selectedPipelineId = event.target.value;
      renderPipelineBoard();
    });
  }
}

function calculatePipelineForecast(pipelineId) {
  return state.leads
    .filter((lead) => lead.pipelineId === pipelineId)
    .reduce((sum, lead) => {
      const quantity = Number(lead.estimatedQuantity ?? 0);
      const probability = typeof lead.probability === 'number' ? lead.probability : 0.3;
      return sum + quantity * probability;
    }, 0);
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
          <th>Persona</th>
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
              <td>${renderPersonaBadge(lead)}</td>
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
    if (!lead.persona) assignPersonaMetadata(lead);
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.source && lead.source !== filters.source) return false;

    if (filters.priority) {
      const priority = lead.priority ?? 0;
      if (filters.priority === 'high' && priority < 80) return false;
      if (filters.priority === 'medium' && (priority < 60 || priority >= 80)) return false;
      if (filters.priority === 'low' && priority >= 60) return false;
    }
    if (filters.persona && (lead.persona || 'Uncategorized') !== filters.persona) return false;

    if (filters.search) {
      const terms = [lead.title, lead.company, lead.contact, lead.persona]
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

async function addLead() {
  const title = getInputValue('leadTitle');
  const company = getInputValue('leadCompany');
  const source = getInputValue('leadSource');

  if (!title || !company || !source) {
    createToast('Missing fields', 'Please complete Title, Company, and Source.', 'warning');
    return;
  }

  const baseLead = {
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

  if (apiAvailable) {
    try {
      const response = await apiRequest('/leads', { method: 'POST', body: baseLead });
      await response.json();
      await refreshFromApi();
      closeAddLeadModal();
      createToast('Lead added', `${title} captured via API.`, 'success');
      return;
    } catch (error) {
      console.warn('API addLead failed, switching to offline mode.', error);
      createToast('Offline mode', 'API unavailable—storing lead locally.', 'warning');
      apiAvailable = false;
    }
  }

  addLeadOffline(baseLead);
}

function generateLeadId() {
  const numericIds = state.leads
    .map((lead) => parseInt(String(lead.id || '').replace(/[^0-9]/g, ''), 10))
    .filter((value) => !Number.isNaN(value));
  const maxId = numericIds.length ? Math.max(...numericIds) : 0;
  return `L${String(maxId + 1).padStart(3, '0')}`;
}

function addLeadOffline(baseLead) {
  const newLead = {
    ...baseLead,
    id: baseLead.id || generateLeadId(),
    priority: baseLead.priority ?? calculatePriorityScore(baseLead)
  };

  const defaultOwnerId = state.settings?.assignment?.defaultOwnerId || 'hti-outreach';
  newLead.ownerId = baseLead.ownerId || defaultOwnerId;
  newLead.ownerName = newLead.ownerName || lookupOwnerName(newLead.ownerId);
  assignPersonaMetadata(newLead);
  state.leads.unshift(newLead);
  addActivity({ text: `Lead logged: ${newLead.title} (${newLead.company || 'Unknown'})`, type: 'lead' });
  state.analytics.personaBreakdown = buildPersonaBreakdown(state.leads);
  populatePersonaFilter();
  persistState();

  renderLeadsTable();
  renderDashboard();
  closeAddLeadModal();
  createToast('Lead added', `${newLead.title} captured locally.`, 'success');
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

async function submitLeadStatusForm() {
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

  if (apiAvailable) {
    try {
      await apiRequest(`/leads/${encodeURIComponent(leadId)}`, {
        method: 'PATCH',
        body: {
          status,
          priority: Number.isNaN(priority) ? undefined : clamp(priority, 0, 100),
          followUpDate: followUpDate || undefined,
          notes
        }
      });
      await refreshFromApi();
      closeLeadStatusModal();
      createToast('Lead updated', `${lead.title} marked as ${status}.`, 'success');
      return;
    } catch (error) {
      console.warn('API lead update failed, updating locally.', error);
      createToast('Offline mode', 'Saved locally until API reconnects.', 'warning');
      apiAvailable = false;
    }
  }

  lead.status = status;
  lead.priority = Number.isNaN(priority) ? calculatePriorityScore(lead) : clamp(priority, 0, 100);
  lead.followUpDate = followUpDate || lead.followUpDate;
  lead.notes = notes;

  if (CLOSED_STATUSES.has(status)) {
    lead.timeline = 'Closed';
  }

  assignPersonaMetadata(lead);
  state.analytics.personaBreakdown = buildPersonaBreakdown(state.leads);
  populatePersonaFilter();

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

  assignPersonaMetadata(lead);

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
    { label: 'Persona', value: lead.persona || 'Uncategorized' },
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

async function archiveLead(leadId) {
  const index = state.leads.findIndex((lead) => lead.id === leadId);
  if (index === -1) {
    createToast('Lead not found', 'Unable to archive this record.', 'error');
    return;
  }

  const lead = state.leads[index];
  const confirmed = window.confirm(`Archive "${lead.title}" from the active pipeline?`);
  if (!confirmed) return;

  if (apiAvailable) {
    try {
      await apiRequest(`/leads/${encodeURIComponent(leadId)}`, { method: 'DELETE' });
      await refreshFromApi();
      createToast('Lead archived', `${lead.title} removed from active pipeline.`, 'info');
      return;
    } catch (error) {
      console.warn('API archive failed, removing locally.', error);
      createToast('Offline mode', 'Lead archived locally until API reconnects.', 'warning');
      apiAvailable = false;
    }
  }

  state.leads.splice(index, 1);
  addActivity({ text: `Lead archived: ${lead.title}`, type: 'archive' });
  persistState();
  renderLeadsTable();
  renderDashboard();
  createToast('Lead archived', `${lead.title} removed from active pipeline.`, 'info');
}

async function completeFollowUp(leadId) {
  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) {
    createToast('Lead not found', 'Unable to update follow-up.', 'error');
    return;
  }

  const nextDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  if (apiAvailable) {
    try {
      await apiRequest(`/leads/${encodeURIComponent(leadId)}/complete-follow-up`, {
        method: 'POST',
        body: { followUpDate: nextDate }
      });
      await refreshFromApi();
      createToast('Follow-up rescheduled', `Next touchpoint set for ${formatDate(nextDate)}.`, 'success');
      return;
    } catch (error) {
      console.warn('API follow-up completion failed, updating locally.', error);
      createToast('Offline mode', 'Follow-up stored locally until API reconnects.', 'warning');
      apiAvailable = false;
    }
  }

  lead.followUpDate = nextDate;
  assignPersonaMetadata(lead);
  state.analytics.personaBreakdown = buildPersonaBreakdown(state.leads);
  populatePersonaFilter();
  addActivity({ text: `Follow-up completed for ${lead.title}`, type: 'update' });
  persistState();
  renderLeadsTable();
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

async function submitCorporateForm() {
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

  if (apiAvailable) {
    try {
      await apiRequest('/corporate-targets', { method: 'POST', body: targetData });
      await refreshFromApi();
      closeCorporateModal();
      createToast('Company saved', `${targetData.company} synced with API.`, 'success');
      return;
    } catch (error) {
      console.warn('API corporate upsert failed, using offline store.', error);
      createToast('Offline mode', 'Saved locally until API reconnects.', 'warning');
      apiAvailable = false;
    }
  }

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
  if (apiAvailable) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const leads = Array.isArray(parsed.leads) ? parsed.leads : clone(htiData.sampleLeads);
    leads.forEach(assignPersonaMetadata);
    const personaBreakdown = buildPersonaBreakdown(leads);
    const topPersonaEntry = getTopPersona(personaBreakdown);

    return {
      leads,
      corporateTargets: Array.isArray(parsed.corporateTargets) ? parsed.corporateTargets : clone(htiData.corporateTargets),
      grantMilestones: Array.isArray(parsed.grantMilestones) ? parsed.grantMilestones : clone(htiData.grantMilestones),
      activities: Array.isArray(parsed.activities) ? parsed.activities : clone(htiData.activities),
      syncLog: Array.isArray(parsed.syncLog) ? parsed.syncLog : [],
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      pipelines: Array.isArray(parsed.pipelines) ? parsed.pipelines : [],
      automations: Array.isArray(parsed.automations) ? parsed.automations : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      ingestionJobs: Array.isArray(parsed.ingestionJobs) ? parsed.ingestionJobs : [],
      connectors: Array.isArray(parsed.connectors) ? parsed.connectors : [],
      forms: Array.isArray(parsed.forms) ? parsed.forms : [],
      apiKeys: Array.isArray(parsed.apiKeys) ? parsed.apiKeys : [],
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
      dedupeMatches: Array.isArray(parsed.dedupeMatches) ? parsed.dedupeMatches : [],
      interactions: Array.isArray(parsed.interactions) ? parsed.interactions : [],
      mapPoints: Array.isArray(parsed.mapPoints) ? parsed.mapPoints : [],
      analytics: {
        baselineActiveLead: parsed.analytics?.baselineActiveLead ?? htiData.analytics.baselineActiveLead,
        baselineEquipment: parsed.analytics?.baselineEquipment ?? htiData.analytics.baselineEquipment,
        personaBreakdown,
        topPersona: topPersonaEntry ? { name: topPersonaEntry[0], count: topPersonaEntry[1] } : null,
        lastUpdatedAt: parsed.analytics?.lastUpdatedAt ?? new Date().toISOString()
      },
      settings: parsed.settings ? mergeSettings(clone(DEFAULT_SETTINGS), parsed.settings) : clone(DEFAULT_SETTINGS),
      serverAnalytics: parsed.serverAnalytics ?? {},
      dashboard: parsed.dashboard ?? {
        metrics: {},
        personaBreakdown,
        topPersona: topPersonaEntry ? { name: topPersonaEntry[0], count: topPersonaEntry[1] } : null
      }
    };
  } catch (error) {
    console.warn('Failed to load saved state', error);
    storageAvailable = false;
    return null;
  }
}

function createDefaultState() {
  const initialLeads = clone(htiData.sampleLeads).map((lead) => assignPersonaMetadata({ ...lead }));
  const personaBreakdown = buildPersonaBreakdown(initialLeads);
  return {
    leads: initialLeads,
    corporateTargets: clone(htiData.corporateTargets),
    grantMilestones: clone(htiData.grantMilestones),
    activities: clone(htiData.activities),
    syncLog: [],
    entities: buildSampleEntities(),
    pipelines: [],
    automations: [],
    tasks: [],
    ingestionJobs: [],
    connectors: [],
    forms: [],
    apiKeys: [],
    audit: [],
    dedupeMatches: [],
    interactions: buildSampleInteractions(),
    mapPoints: [],
    analytics: {
      baselineActiveLead: htiData.analytics.baselineActiveLead,
      baselineEquipment: htiData.analytics.baselineEquipment,
      personaBreakdown,
      forecastEquipment: 0,
      avgStageDuration: 0,
      pipelineBreakdown: {},
      lastUpdatedAt: new Date().toISOString()
    },
    settings: clone(DEFAULT_SETTINGS),
    serverAnalytics: {},
    dashboard: null
  };
}

function buildSampleEntities() {
  const sampleLeads = clone(htiData.sampleLeads).map((lead) => assignPersonaMetadata(lead));
  const contacts = sampleLeads.map((lead) => ({
    id: `contact-${lead.id}`,
    recordType: 'contact',
    name: lead.contact || lead.company || lead.title,
    displayName: lead.contact || lead.company || lead.title,
    organizationName: lead.company,
    householdName: null,
    emails: [],
    phones: [],
    leadIds: [lead.id],
    updatedAt: lead.date || new Date().toISOString()
  }));

  const organizations = clone(htiData.corporateTargets).map((target, index) => ({
    id: `org-${index}`,
    recordType: 'organization',
    name: target.company,
    displayName: target.company,
    contactCount: contacts.filter((contact) => contact.organizationName === target.company).length,
    leadIds: contacts
      .filter((contact) => contact.organizationName === target.company)
      .flatMap((contact) => contact.leadIds || []),
    tags: [target.priority || 'Medium'],
    updatedAt: new Date().toISOString()
  }));

  return [...contacts, ...organizations];
}

function buildSampleInteractions() {
  return clone(htiData.sampleLeads)
    .map(assignPersonaMetadata)
    .slice(0, 5)
    .map((lead, index) => {
      const occurred = new Date(Date.now() - index * 36 * 60 * 60 * 1000).toISOString();
      return {
        id: `interaction-${lead.id}`,
        leadId: lead.id,
        entityId: `contact-${lead.id}`,
        type: index % 2 === 0 ? 'call' : 'email',
        direction: index % 2 === 0 ? 'outbound' : 'inbound',
        occurredAt: occurred,
        summary: index % 2 === 0
          ? `Called ${lead.contact || lead.company} to discuss logistics.`
          : `Email thread with ${lead.contact || lead.company} regarding data wipe.`
      };
    });
}

function persistState(updateTimestamp = true) {
  if (apiAvailable || !storageAvailable) return;
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
  if (apiAvailable) {
    createToast('Reset unavailable', 'Live API data cannot be reset from the dashboard.', 'info');
    return;
  }
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

function renderPersonaBadge(lead) {
  if (!lead.persona) assignPersonaMetadata(lead);
  const persona = lead.persona || 'Uncategorized';
  const tags = (lead.personaTags || []).filter((tag) => !tag.startsWith('persona:'));
  const title = tags.length ? `title="${escapeHtml(tags.join(', '))}"` : '';
  return `<span class="persona-chip" ${title}>${escapeHtml(persona)}</span>`;
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

function formatRelativeTime(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const diffMs = Date.now() - date.getTime();
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minutes = Math.round(diffMs / (60 * 1000));
  if (Math.abs(minutes) < 60) {
    return rtf.format(-minutes, 'minute');
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) {
    return rtf.format(-hours, 'hour');
  }
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 60) {
    return rtf.format(-days, 'day');
  }
  const months = Math.round(days / 30);
  if (Math.abs(months) < 24) {
    return rtf.format(-months, 'month');
  }
  const years = Math.round(months / 12);
  return rtf.format(-years, 'year');
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

function assignPersonaMetadata(lead = {}) {
  if (!lead) return lead;
  const source = (lead.source || '').toLowerCase();
  const equipment = (lead.equipmentType || '').toLowerCase();
  const company = (lead.company || '').toLowerCase();
  const notes = (lead.notes || '').toLowerCase();
  const title = (lead.title || '').toLowerCase();
  const location = (lead.location || '').toLowerCase();
  const timeline = (lead.timeline || '').toLowerCase();
  const text = `${title} ${company} ${notes} ${location}`;
  const priority = lead.priority ?? 0;
  const followUpDate = lead.followUpDate ? new Date(lead.followUpDate) : null;
  const followUpDays = followUpDate && !Number.isNaN(followUpDate.getTime())
    ? Math.round((followUpDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  let persona = 'Corporate IT Partner';
  if (source.includes('gsa') || text.includes('auction') || text.includes('surplus') || text.includes('state agency')) {
    persona = 'Government Surplus';
  } else if (source.includes('sam.gov') || source.includes('data.gov') || text.includes('federal')) {
    persona = 'Government Procurement';
  } else if (
    text.includes('hospital') ||
    text.includes('clinic') ||
    text.includes('health') ||
    equipment.includes('medical') ||
    company.includes('health')
  ) {
    persona = 'Healthcare System';
  } else if (
    text.includes('school') ||
    text.includes('district') ||
    text.includes('college') ||
    text.includes('university') ||
    text.includes('education') ||
    equipment.includes('chromebook') ||
    equipment.includes('lab')
  ) {
    persona = 'Education Partner';
  } else if (
    source.includes('reddit') ||
    source.includes('linkedin') ||
    text.includes('refresh') ||
    text.includes('upgrade') ||
    text.includes('laptop refresh')
  ) {
    persona = 'Tech Refresh Donor';
  } else if (
    persona === 'Corporate IT Partner' &&
    ((followUpDays !== null && followUpDays <= 3) || timeline.includes('urgent') || timeline.includes('immediate'))
  ) {
    persona = 'Logistics Hotshot';
  }

  const predefinedTags = PERSONA_TAG_DEFINITIONS[persona] || PERSONA_TAG_DEFINITIONS['Corporate IT Partner'] || [];
  const tags = new Set(predefinedTags);
  if (priority >= 80) tags.add('high-priority');
  if (followUpDays !== null && followUpDays <= 3) tags.add('urgent');
  if (timeline.includes('grant')) tags.add('grant');
  if (source) tags.add(`source:${source}`);
  if (equipment) tags.add(`equipment:${equipment.replace(/\s+/g, '-')}`);
  tags.add(`persona:${persona.toLowerCase().replace(/\s+/g, '-')}`);

  lead.persona = persona;
  lead.personaTags = [...tags];
  return lead;
}

function buildPersonaBreakdown(leads = []) {
  return leads.reduce((acc, lead) => {
    if (!lead.persona) assignPersonaMetadata(lead);
    const persona = lead.persona || 'Uncategorized';
    acc[persona] = (acc[persona] || 0) + 1;
    return acc;
  }, {});
}

function getTopPersona(breakdown = {}) {
  const entries = Object.entries(breakdown);
  if (!entries.length) return null;
  return entries.sort(([, countA], [, countB]) => countB - countA)[0];
}

function deriveMapPointsFromLeads() {
  return (state.leads || []).map((lead) => {
    if (!lead.persona) assignPersonaMetadata(lead);
    const coords = hashLocationToCoords(lead.location || lead.company || lead.id);
    return {
      id: lead.id,
      title: lead.title,
      company: lead.company,
      location: lead.location,
      estimatedQuantity: lead.estimatedQuantity,
      followUpDate: lead.followUpDate,
      priority: lead.priority,
      persona: lead.persona || null,
      personaTags: lead.personaTags || [],
      lat: coords.lat,
      lng: coords.lng
    };
  });
}

function hashLocationToCoords(seed) {
  const value = (seed || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  const lat = 25 + ((hash >>> 8) % 2000) / 100;
  const lng = -125 + (hash % 3000) / 100;
  return {
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4))
  };
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

function mergeSettings(target = {}, source = {}) {
  const result = clone(target);
  if (!source || typeof source !== 'object') return result;
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeSettings(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function lookupOwnerName(ownerId) {
  return USER_DIRECTORY[ownerId] || ownerId || 'CRM User';
}

function applySettingsPatch(patch, shouldPersist = false) {
  state.settings = mergeSettings(state.settings || clone(DEFAULT_SETTINGS), patch);
  state.leads.forEach(assignPersonaMetadata);
  state.analytics.personaBreakdown = buildPersonaBreakdown(state.leads);
  const topPersonaEntry = getTopPersona(state.analytics.personaBreakdown);
  state.analytics.topPersona = topPersonaEntry
    ? { name: topPersonaEntry[0], count: topPersonaEntry[1] }
    : null;
  if (shouldPersist && !apiAvailable) {
    persistState(false);
  }
  renderSettingsPanel();
  renderAll();
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

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  openModalCount += 1;
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = '';
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .register('service-worker.js')
    .catch((error) => console.warn('Service worker registration failed', error));
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
  resetState,
  refreshFromApi,
  refreshSettingsFromApi,
  savePersonaSettings,
  savePreferenceSettings,
  saveApiBaseOverride,
  clearApiBaseOverride,
  resetSettingsToDefaults
});
