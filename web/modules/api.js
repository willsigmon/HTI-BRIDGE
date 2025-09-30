import { API_BASE_URL, API_TIMEOUT_MS } from '../config.js';
import { normalizeGrantMetrics, clone, mergeSettings, assignPersonaMetadata, buildPersonaBreakdown, getTopPersona } from './utils.js';
import { flagAuthRequired, clearAuthState, handleAuthError, notifyAuthRequired } from './auth.js';
import { loadState, createDefaultState } from './state.js';
import { updateLastRefreshed } from './state.js';

// API Error class
export class ApiError extends Error {
  constructor(message, { status, details, url } = {}) {
    super(message || 'API request failed');
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.url = url;
  }
}

// Check if status code indicates authentication required
export function isAuthStatus(status) {
  return status === 401 || status === 403;
}

// Core API request function with timeout and error handling
export async function apiRequest(path, options = {}) {
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
      const errorInfo = await safeParseError(response);
      const apiError = new ApiError(errorInfo.message, {
        status: response.status,
        details: errorInfo.details,
        url
      });
      if (isAuthStatus(apiError.status)) {
        const infoDetails = apiError.details;
        const authUrl = infoDetails && typeof infoDetails === 'object'
          ? infoDetails.authUrl || infoDetails.signInUrl || infoDetails.loginUrl
          : undefined;
        flagAuthRequired({ message: errorInfo.message, status: apiError.status, authUrl });
      }
      throw apiError;
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

// Safe error parsing from API responses
async function safeParseError(response) {
  try {
    const text = await response.text();
    if (!text) {
      return { message: response.statusText || 'Request failed', details: null };
    }
    try {
      const data = JSON.parse(text);
      if (typeof data === 'string') {
        return { message: data, details: data };
      }
      return {
        message: data.error || data.message || response.statusText || 'Request failed',
        details: data
      };
    } catch (parseError) {
      return { message: text, details: text };
    }
  } catch (error) {
    return { message: response.statusText || 'Request failed', details: null };
  }
}

// Bootstrap data from API on app start
export async function bootstrapData(state, apiAvailable, DEFAULT_SETTINGS, uiState, renderAll, populatePersonaFilter) {
  try {
    const response = await apiRequest('/bootstrap', { method: 'GET' });
    const payload = await response.json();
    const newState = hydrateStateFromBootstrap(payload, state, DEFAULT_SETTINGS, uiState, populatePersonaFilter);
    apiAvailable = true;
    clearAuthState();
    return { state: newState, apiAvailable };
  } catch (error) {
    console.warn('API bootstrap unavailable, falling back to local dataset.', error);
    apiAvailable = false;
    const handled = handleAuthError(error, 'Sign in to load live CRM data from the HTI API.');
    if (handled) {
      notifyAuthRequired('Authenticate to resume live data sync.');
    }
    state = loadState() ?? createDefaultState();
    return { state, apiAvailable };
  }
}

// Refresh data from API
export async function refreshFromApi(state, apiAvailable, DEFAULT_SETTINGS, uiState, renderAll, populatePersonaFilter) {
  if (!apiAvailable) return { state, apiAvailable };
  try {
    const response = await apiRequest('/bootstrap', { method: 'GET' });
    const payload = await response.json();
    const newState = hydrateStateFromBootstrap(payload, state, DEFAULT_SETTINGS, uiState, populatePersonaFilter);
    apiAvailable = true;
    clearAuthState();
    renderAll();
    updateLastRefreshed();
    return { state: newState, apiAvailable };
  } catch (error) {
    if (handleAuthError(error, 'Sign in to restore live dashboard refresh.')) {
      notifyAuthRequired('Authenticate to sync new data.');
      return { state, apiAvailable };
    }
    console.warn('Unable to refresh from API, retaining current client state.', error);
    return { state, apiAvailable };
  }
}

// Refresh dedupe matches from API
export async function refreshDedupes(state, apiAvailable, renderDataHub) {
  if (!apiAvailable) return state;
  try {
    const response = await apiRequest('/entities/dedupe', { method: 'GET' });
    const payload = await response.json();
    state.dedupeMatches = payload.duplicates || [];
    renderDataHub();
    return state;
  } catch (error) {
    console.warn('Unable to refresh dedupe index', error);
    return state;
  }
}

// Refresh interactions from API
export async function refreshInteractions(state, apiAvailable, renderDataHub, limit = 150) {
  if (!apiAvailable) return state;
  try {
    const response = await apiRequest(`/interactions?limit=${limit}`, { method: 'GET' });
    const payload = await response.json();
    state.interactions = Array.isArray(payload) ? payload : payload.interactions || [];
    renderDataHub();
    return state;
  } catch (error) {
    console.warn('Unable to refresh interactions', error);
    return state;
  }
}

// Hydrate state from bootstrap payload
export function hydrateStateFromBootstrap(payload = {}, state = {}, DEFAULT_SETTINGS, uiState, populatePersonaFilter) {
  const leadsData = payload.leads ?? [];
  const corporateData = payload.corporateTargets ?? payload.corporate_targets ?? [];
  const milestonesData = payload.grantMilestones ?? payload.grant_milestones ?? [];
  const activitiesData = payload.activities ?? [];
  const dashboard = payload.dashboard ?? {};
  const grantMetricsPayload = payload.grantMetrics ?? dashboard.grantMetrics ?? {};
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
  const normalizedGrantMetrics = normalizeGrantMetrics(grantMetricsPayload);
  const dashboardGrantMetrics = normalizeGrantMetrics(dashboard.grantMetrics ?? normalizedGrantMetrics);

  const newState = {
    leads: leadsData,
    corporateTargets: corporateData,
    grantMilestones: milestonesData,
    grantMetrics: normalizedGrantMetrics,
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
    dashboard: {
      ...dashboard,
      grantMetrics: dashboardGrantMetrics
    }
  };

  newState.leads.forEach(assignPersonaMetadata);

  const personaBreakdown = buildPersonaBreakdown(newState.leads);
  newState.analytics.personaBreakdown = Object.keys(newState.analytics.personaBreakdown || {}).length
    ? newState.analytics.personaBreakdown
    : personaBreakdown;
  const topPersonaEntry = getTopPersona(newState.analytics.personaBreakdown);
  newState.analytics.topPersona = newState.analytics.topPersona || (topPersonaEntry ? { name: topPersonaEntry[0], count: topPersonaEntry[1] } : null);

  newState.dashboard = newState.dashboard || {};
  newState.dashboard.personaBreakdown = dashboard.personaBreakdown || personaBreakdown;
  newState.dashboard.topPersona = dashboard.topPersona || newState.analytics.topPersona;

  if (Array.isArray(newState.mapPoints) && newState.mapPoints.length) {
    const personaMap = new Map(newState.leads.map((lead) => [lead.id, lead.persona]));
    newState.mapPoints = newState.mapPoints.map((point) => ({
      ...point,
      persona: point.persona || personaMap.get(point.id) || null
    }));
  }

  if (!uiState.selectedPipelineId && pipelinesData.length) {
    uiState.selectedPipelineId = pipelinesData[0].id;
  }

  populatePersonaFilter();
  return newState;
}
