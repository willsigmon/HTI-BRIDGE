import { STORAGE_KEY } from '../config.js';
import {
  clone,
  normalizeGrantMetrics,
  assignPersonaMetadata,
  buildPersonaBreakdown,
  getTopPersona,
  mergeSettings,
  createToast
} from './utils.js';

// Load state from localStorage
export function loadState(apiAvailable, storageAvailable, htiData, DEFAULT_SETTINGS) {
  if (apiAvailable || storageAvailable === false) return null;
  const dataset = normalizeDataset(htiData);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const leads = Array.isArray(parsed.leads) ? parsed.leads : clone(dataset.sampleLeads);
    leads.forEach(assignPersonaMetadata);
    const personaBreakdown = buildPersonaBreakdown(leads);
    const topPersonaEntry = getTopPersona(personaBreakdown);

    return {
      leads,
      corporateTargets: Array.isArray(parsed.corporateTargets) ? parsed.corporateTargets : clone(dataset.corporateTargets),
      grantMilestones: Array.isArray(parsed.grantMilestones) ? parsed.grantMilestones : clone(dataset.grantMilestones),
      grantMetrics: normalizeGrantMetrics(parsed.grantMetrics ?? parsed.dashboard?.grantMetrics ?? dataset.grantMetrics),
      activities: Array.isArray(parsed.activities) ? parsed.activities : clone(dataset.activities),
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
        baselineActiveLead: parsed.analytics?.baselineActiveLead ?? dataset.analytics.baselineActiveLead,
        baselineEquipment: parsed.analytics?.baselineEquipment ?? dataset.analytics.baselineEquipment,
        personaBreakdown,
        topPersona: topPersonaEntry ? { name: topPersonaEntry[0], count: topPersonaEntry[1] } : null,
        lastUpdatedAt: parsed.analytics?.lastUpdatedAt ?? new Date().toISOString()
      },
      settings: parsed.settings ? mergeSettings(clone(DEFAULT_SETTINGS), parsed.settings) : clone(DEFAULT_SETTINGS),
      serverAnalytics: parsed.serverAnalytics ?? {},
      dashboard: parsed.dashboard
        ? {
            ...parsed.dashboard,
            grantMetrics: normalizeGrantMetrics(parsed.dashboard.grantMetrics ?? parsed.grantMetrics ?? dataset.grantMetrics)
          }
        : {
            metrics: {},
            personaBreakdown,
            topPersona: topPersonaEntry ? { name: topPersonaEntry[0], count: topPersonaEntry[1] } : null,
            grantMetrics: normalizeGrantMetrics(parsed.grantMetrics ?? dataset.grantMetrics)
          }
    };
  } catch (error) {
    console.warn('Failed to load saved state', error);
    return null;
  }
}

// Create default state with sample data
export function createDefaultState(htiData, DEFAULT_SETTINGS) {
  const dataset = normalizeDataset(htiData);
  const initialLeads = clone(dataset.sampleLeads).map((lead) => assignPersonaMetadata({ ...lead }));
  const personaBreakdown = buildPersonaBreakdown(initialLeads);
  const sampleMilestones = clone(dataset.grantMilestones);
  const grantMetrics = normalizeGrantMetrics(dataset.grantMetrics);
  const grantProgressPercent = sampleMilestones.length
    ? Math.round(
        sampleMilestones.reduce((score, milestone) => {
          if (milestone.status === 'Completed') return score + 1;
          if (milestone.status === 'In Progress') return score + 0.5;
          return score;
        }, 0) / sampleMilestones.length * 100
      )
    : 0;
  return {
    leads: initialLeads,
    corporateTargets: clone(dataset.corporateTargets),
    grantMilestones: clone(dataset.grantMilestones),
    grantMetrics,
    activities: clone(dataset.activities),
    syncLog: [],
    entities: buildSampleEntities(dataset),
    pipelines: [],
    automations: [],
    tasks: [],
    ingestionJobs: [],
    connectors: [],
    forms: [],
    apiKeys: [],
    audit: [],
    dedupeMatches: [],
    interactions: buildSampleInteractions(dataset),
    mapPoints: [],
    analytics: {
      baselineActiveLead: dataset.analytics.baselineActiveLead,
      baselineEquipment: dataset.analytics.baselineEquipment,
      personaBreakdown,
      forecastEquipment: 0,
      avgStageDuration: 0,
      pipelineBreakdown: {},
      lastUpdatedAt: new Date().toISOString()
    },
    settings: clone(DEFAULT_SETTINGS),
    serverAnalytics: {},
    dashboard: {
      metrics: {},
      personaBreakdown,
      topPersona: (() => {
        const entry = getTopPersona(personaBreakdown);
        return entry ? { name: entry[0], count: entry[1] } : null;
      })(),
      grantProgressPercent,
      grantMetrics
    }
  };
}

// Build sample entities from sample data
function buildSampleEntities(htiData) {
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

// Build sample interactions from sample data
function buildSampleInteractions(htiData) {
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

function normalizeDataset(htiData) {
  const data = htiData && typeof htiData === 'object' ? htiData : {};
  return {
    corporateTargets: Array.isArray(data.corporateTargets) ? data.corporateTargets : [],
    sampleLeads: Array.isArray(data.sampleLeads) ? data.sampleLeads : [],
    grantMilestones: Array.isArray(data.grantMilestones) ? data.grantMilestones : [],
    grantMetrics: data.grantMetrics && typeof data.grantMetrics === 'object' ? data.grantMetrics : {},
    activities: Array.isArray(data.activities) ? data.activities : [],
    analytics: {
      baselineActiveLead: data.analytics?.baselineActiveLead ?? 0,
      baselineEquipment: data.analytics?.baselineEquipment ?? 0
    }
  };
}

// Persist state to localStorage
export function persistState(state, apiAvailable, storageAvailable) {
  if (apiAvailable || !storageAvailable) return;
  try {
    state.analytics.lastUpdatedAt = new Date().toISOString();
    updateLastRefreshed(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to persist state', error);
    return false;
  }
  return true;
}

// Reset state to defaults
export function resetState(apiAvailable, htiData, DEFAULT_SETTINGS, renderAll) {
  if (apiAvailable) {
    createToast('Reset unavailable', 'Live API data cannot be reset from the dashboard.', 'info');
    return null;
  }
  const confirmed = window.confirm('Reset demo data and reload sample pipeline?');
  if (!confirmed) return null;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear storage key', error);
  }

  const newState = createDefaultState(htiData, DEFAULT_SETTINGS);
  renderAll();
  persistState(newState, false, true);
  createToast('Sample data restored', 'Dashboard reset to the seeded CRM snapshot.', 'success');
  return newState;
}

// Update the "last refreshed" timestamp display
export function updateLastRefreshed(state) {
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

// Add an activity to the state
export function addActivity(state, { text, type = 'note', timestamp = new Date().toISOString() }) {
  if (!state.activities) {
    state.activities = [];
  }
  state.activities.unshift({ text, type, timestamp });
  return state;
}
