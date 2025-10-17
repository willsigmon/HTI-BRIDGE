/**
 * HTI Dashboard - Main Entry Point
 * Refactored to use modular architecture
 * All feature modules are in /modules directory
 */

import {
  STORAGE_KEY,
  DEVICE_GOAL,
  ACTIVE_STATUSES,
  PERSONA_BUCKETS,
  API_BASE_URL,
  INITIAL_AUTH_URL,
  DEFAULT_AUTH_URL,
  AUTH_PROMPT_MESSAGE,
  UPCOMING_THRESHOLD
} from './config.js';
import { loadBootstrapFixture } from './data-loader.js';

// Module imports
import * as Utils from './modules/utils.js';
import * as Api from './modules/api.js';
import * as Auth from './modules/auth.js';
import * as State from './modules/state.js';
import * as UI from './modules/ui.js';
import * as Dashboard from './modules/dashboard.js';
import * as Grants from './modules/grants.js';
import * as Leads from './modules/leads.js';
import * as Corporate from './modules/corporate.js';
import * as DataHub from './modules/data-hub.js';
import * as Automation from './modules/automation.js';
import * as Map from './modules/map.js';
import * as Operations from './modules/operations.js';
import * as Settings from './modules/settings.js';

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS = {
  personas: {
    enabled: Object.fromEntries(PERSONA_BUCKETS.map((persona) => [persona, true])),
    weights: Object.fromEntries(PERSONA_BUCKETS.map((persona) => [persona, 1]))
  },
  assignment: {
    defaultOwnerId: 'hti-outreach'
  },
  preferences: {
    enableMap: true,
    enableAutomations: true
  }
};

// ============================================================================
// Bootstrap Data
// ============================================================================

let htiData = null;

// ============================================================================
// Shared State
// ============================================================================

const filters = {
  status: '',
  source: '',
  priority: '',
  persona: '',
  search: '',
  sort: 'priority',
  corporatePriority: 'all'
};

// API and storage availability - using objects so they can be passed by reference
let apiAvailable = { value: false };
let storageAvailable = { value: true };

// Core application state
let state = null;

// UI state and contexts
let charts = { leadSources: null, equipment: null };
let leadStatusContext = { leadId: null };
let corporateEditIndex = { value: null };
let openModalCount = 0;
let topLeadId = null;
let refreshTimer = null;

let uiState = {
  selectedPipelineId: null,
  selectedEntityId: null,
  selectedAutomationPipelineId: null,
  selectedAutomationStageId: null,
  entityQuery: '',
  authRequired: false,
  authStatus: null,
  authMessage: '',
  authTarget: INITIAL_AUTH_URL,
  authToastAt: 0
};

// Map state - using objects for reference passing
let mapInstance = { instance: null };
let mapMarkers = { markers: [] };
let mapReady = { value: false };

// ============================================================================
// Main Application Initialization
// ============================================================================

async function startApp() {
  try {
    // Load fixture data first
    htiData = await loadBootstrapFixture();
    if (typeof window !== 'undefined') {
      window.__HTI_BOOTSTRAP_FIXTURE__ = JSON.parse(JSON.stringify(htiData));
    }

    // Initialize state with loaded data
    state = State.createDefaultState(htiData, DEFAULT_SETTINGS);

    // Then bootstrap from API if available
    await bootstrapData();

    // Initialize the UI
    initializeApp();

    // Register service worker
    Utils.registerServiceWorker();
  } catch (error) {
    console.error('[HTI] Failed to start app:', error);
    document.body.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: sans-serif;">
        <h1>Failed to load HTI Dashboard</h1>
        <p>Error: ${error.message}</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

async function bootstrapData() {
  const result = await Api.bootstrapData(
    state,
    apiAvailable,
    storageAvailable,
    DEFAULT_SETTINGS,
    uiState,
    renderAll,
    populatePersonaFilter,
    htiData
  );
  if (result?.state) {
    state = result.state;
  }
}

function initializeApp() {
  setupTabNavigation();
  UI.setupNavOverflow();
  setupFilters();
  setupCorporateFilters();
  UI.setupThemeToggle();
  bindGlobalHandlers();
  setupDataHubControls();
  setupAutomationControls();
  setupOperationsConsoleControls();
  setupSettingsControls();
  renderAll();
  State.updateLastRefreshed(state);
  setTimeout(updateCharts, 250);

  if (apiAvailable.value && !refreshTimer) {
    refreshTimer = setInterval(() => {
      if (apiAvailable.value) {
        refreshFromApi();
      }
    }, 5 * 60 * 1000);
  }
}

// ============================================================================
// Rendering Coordination
// ============================================================================

function renderAll() {
  Auth.renderAuthBanner(uiState);
  populatePersonaFilter();
  renderDashboard();
  renderCorporateTargets();
  renderLeadsTable();
  renderDataHub();
  renderAutomationStudio();
  renderMapView();
  renderOperationsConsole();
  renderSettingsPanel();
  Grants.renderGrantMilestones(state);
  Grants.renderGrantRoadmap(state);
  Grants.renderDigitalLiteracyHours(state);
  Grants.updateComplianceHealth(state, UPCOMING_THRESHOLD);
  Dashboard.renderActivities(state);
}

// ============================================================================
// Setup Functions
// ============================================================================

function setupTabNavigation() {
  UI.setupTabNavigation(renderMapView, renderDataHub, renderAutomationStudio, renderOperationsConsole);
}

function setupFilters() {
  UI.setupFilters(filters, renderLeadsTable);
}

function populatePersonaFilter() {
  UI.populatePersonaFilter(state, filters);
}

function setupCorporateFilters() {
  UI.setupCorporateFilters(filters, renderCorporateTargets);
}

function setupDataHubControls() {
  UI.setupDataHubControls(
    uiState,
    renderDataHub,
    apiAvailable,
    refreshDedupes,
    refreshInteractions
  );
}

function setupAutomationControls() {
  const handleAutomationSubmitFn = Automation.handleAutomationSubmit(apiAvailable, refreshAutomations, refreshTasks);
  UI.setupAutomationControls(handleAutomationSubmitFn, apiAvailable, refreshAutomations, refreshTasks);
}

function setupOperationsConsoleControls() {
  UI.setupOperationsConsoleControls(
    submitConnectorForm,
    submitApiKeyForm,
    apiAvailable,
    refreshOperationsConsole,
    renderOperationsConsole
  );
}

function setupSettingsControls() {
  UI.setupSettingsControls();
}

function bindGlobalHandlers() {
  UI.bindGlobalHandlers(filters, renderLeadsTable, handleBackdropClick, handleEscapeKey, handleStorageSync);
}

// ============================================================================
// Component Render Functions
// ============================================================================

function renderDashboard() {
  const topLeadIdRef = { value: topLeadId, set: (v) => { topLeadId = v; } };
  Dashboard.renderDashboard(state, charts, topLeadIdRef, persistState, getMilestoneStatus, UI.switchToTab);
}

function renderLeadsTable() {
  Leads.renderLeadsTable(state, filters, charts, updateCharts, Dashboard.renderLeadHealth, renderDashboard);
}

function renderCorporateTargets() {
  const renderPipelineBoardFn = () => Grants.renderPipelineBoard(state, uiState, Utils.assignPersonaMetadata, Utils.renderPersonaBadge, Utils.escapeQuotes);
  Corporate.renderCorporateTargets(state, filters, renderPipelineBoardFn);
}

function renderDataHub() {
  const viewLeadFn = Leads.viewLead(state);
  DataHub.renderDataHub(state, uiState, viewLeadFn);
}

function renderAutomationStudio() {
  Automation.renderAutomationStudio(state, uiState);
}

function renderMapView() {
  Map.renderMapView(state, apiAvailable, mapInstance, mapMarkers, mapReady, refreshMap);
}

function renderOperationsConsole() {
  Operations.renderOperationsConsole(state);
}

function renderSettingsPanel() {
  Settings.renderSettingsPanel(state, uiState, DEFAULT_SETTINGS);
}

function updateCharts() {
  Dashboard.updateCharts(state, charts);
}

// ============================================================================
// Refresh Functions
// ============================================================================

async function refreshFromApi() {
  await Api.refreshFromApi(state, apiAvailable, DEFAULT_SETTINGS, uiState, renderAll, populatePersonaFilter);
}

async function refreshDedupes() {
  await Api.refreshDedupes(state, apiAvailable, renderDataHub);
}

async function refreshInteractions(limit = 150) {
  await Api.refreshInteractions(state, apiAvailable, renderDataHub, limit);
}

async function refreshAutomations() {
  const renderAutomationStudioFn = () => Automation.renderAutomationStudio(state, uiState);
  await Automation.refreshAutomations(state, apiAvailable, renderAutomationStudioFn);
}

async function refreshTasks() {
  const renderAutomationStudioFn = () => Automation.renderAutomationStudio(state, uiState);
  await Automation.refreshTasks(state, apiAvailable, renderAutomationStudioFn);
}

async function refreshMap() {
  const renderMapViewFn = () => Map.renderMapView(state, apiAvailable, mapInstance, mapMarkers, mapReady, refreshMap);
  await Map.refreshMap(state, apiAvailable, renderMapViewFn);
}

async function refreshOperationsConsole() {
  const renderOperationsConsoleFn = () => Operations.renderOperationsConsole(state);
  await Operations.refreshOperationsConsole(state, apiAvailable, renderOperationsConsoleFn);
}

async function refreshSettingsFromApi() {
  const applySettingsPatchFn = Settings.applySettingsPatch(state, apiAvailable, DEFAULT_SETTINGS, renderAll, renderSettingsPanel);
  await Settings.refreshSettingsFromApi(
    state,
    apiAvailable,
    applySettingsPatchFn,
    Auth.handleAuthError,
    Auth.notifyAuthRequired,
    renderSettingsPanel
  );
}

// ============================================================================
// State Management
// ============================================================================

function persistState() {
  State.persistState(state, apiAvailable.value, storageAvailable.value);
}

async function resetState() {
  state = await State.resetState(apiAvailable.value, htiData, DEFAULT_SETTINGS, renderAll);
}

// ============================================================================
// Global Event Handlers
// ============================================================================

function handleBackdropClick(event) {
  if (event.target.classList.contains('modal') && !event.target.closest('.modal__content')) {
    const modalId = event.target.id;
    if (modalId) Utils.closeModal(modalId);
  }
}

function handleEscapeKey(event) {
  if (event.key === 'Escape' && openModalCount > 0) {
    const modals = document.querySelectorAll('.modal:not(.hidden)');
    modals.forEach((modal) => {
      if (modal.id) Utils.closeModal(modal.id);
    });
  }
}

function handleStorageSync(event) {
  if (event.key === STORAGE_KEY && event.newValue) {
    const loaded = State.loadState(apiAvailable.value, storageAvailable.value, htiData, DEFAULT_SETTINGS);
    if (loaded) {
      state = loaded;
      renderAll();
      Utils.createToast('Data synced', 'Updated from another tab.', 'info');
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function getMilestoneStatus(milestone) {
  return Grants.getMilestoneStatus(milestone, UPCOMING_THRESHOLD);
}

// ============================================================================
// Operations Functions
// ============================================================================

async function submitConnectorForm() {
  const renderOperationsConsoleFn = () => Operations.renderOperationsConsole(state);
  await Operations.submitConnectorForm(apiAvailable, renderOperationsConsoleFn);
}

async function submitApiKeyForm() {
  const renderOperationsConsoleFn = () => Operations.renderOperationsConsole(state);
  await Operations.submitApiKeyForm(apiAvailable, renderOperationsConsoleFn);
}

// ============================================================================
// Settings Functions
// ============================================================================

async function savePersonaSettings() {
  const persistSettingsPatchFn = createPersistSettingsPatchFn();
  await Settings.savePersonaSettings(persistSettingsPatchFn);
}

async function savePreferenceSettings() {
  const persistSettingsPatchFn = createPersistSettingsPatchFn();
  await Settings.savePreferenceSettings(persistSettingsPatchFn);
}

async function resetSettingsToDefaults() {
  const persistSettingsPatchFn = createPersistSettingsPatchFn();
  await Settings.resetSettingsToDefaults(DEFAULT_SETTINGS, persistSettingsPatchFn);
}

function createPersistSettingsPatchFn() {
  const applySettingsPatchFn = Settings.applySettingsPatch(state, apiAvailable, DEFAULT_SETTINGS, renderAll, renderSettingsPanel);
  const refreshSettingsFromApiFn = () => refreshSettingsFromApi();
  return Settings.persistSettingsPatch(
    state,
    apiAvailable,
    DEFAULT_SETTINGS,
    applySettingsPatchFn,
    refreshSettingsFromApiFn,
    Auth.handleAuthError,
    Auth.notifyAuthRequired
  );
}

function saveAuthSettings() {
  Settings.saveAuthSettings(uiState, storageAvailable, () => Auth.renderAuthBanner(uiState));
}

function clearAuthSettings() {
  Settings.clearAuthSettings(uiState, storageAvailable, () => Auth.renderAuthBanner(uiState));
}

// ============================================================================
// Expose Functions to Window for HTML onclick Handlers
// ============================================================================

function exposeWindowFunctions() {
  // Application lifecycle
  window.startApp = startApp;

  // Lead management
  window.openAddLeadModal = Leads.openAddLeadModal;
  window.closeAddLeadModal = Leads.closeAddLeadModal;
  window.addLead = () => Leads.addLead(state, apiAvailable, refreshFromApi, renderAll);
  window.openLeadStatusModal = Leads.openLeadStatusModal(state, leadStatusContext);
  window.openLeadStatusModalFromDrawer = () => Leads.openLeadStatusModalFromDrawer(window.openLeadStatusModal);
  window.closeLeadStatusModal = () => Leads.closeLeadStatusModal(leadStatusContext);
  window.submitLeadStatusForm = () => Leads.submitLeadStatusForm(state, leadStatusContext, apiAvailable, refreshFromApi, renderAll, populatePersonaFilter);
  window.viewLead = Leads.viewLead(state);
  window.closeLeadDrawer = Leads.closeLeadDrawer;
  window.viewTopLead = () => Leads.viewTopLead(topLeadId, window.viewLead);
  window.archiveLead = Leads.archiveLead(state, apiAvailable, refreshFromApi, renderAll);
  window.completeFollowUp = Leads.completeFollowUp(state, apiAvailable, refreshFromApi, renderAll, populatePersonaFilter);
  window.exportLeads = () => Leads.exportLeads(state);

  // Corporate management
  window.openCorporateModal = Corporate.openCorporateModal(state, corporateEditIndex);
  window.closeCorporateModal = () => Corporate.closeCorporateModal(corporateEditIndex);
  window.submitCorporateForm = () => Corporate.submitCorporateForm(state, corporateEditIndex, apiAvailable, refreshFromApi, renderAll);
  window.editCorporateTarget = Corporate.editCorporateTarget(window.openCorporateModal);
  window.contactCorporate = Corporate.contactCorporate;

  // Data Hub
  window.mergeDuplicate = DataHub.mergeDuplicate(apiAvailable, refreshFromApi, refreshDedupes);

  // Automation
  window.toggleAutomationStatus = Automation.toggleAutomationStatus(apiAvailable, refreshAutomations);
  window.deleteAutomation = Automation.deleteAutomation(apiAvailable, refreshAutomations);
  window.completeTaskAction = Automation.completeTaskAction(apiAvailable, refreshTasks);

  // Operations
  window.openConnectorModal = Operations.openConnectorModal;
  window.closeConnectorModal = Operations.closeConnectorModal;
  window.submitConnectorForm = submitConnectorForm;
  window.openApiKeyModal = Operations.openApiKeyModal;
  window.closeApiKeyModal = Operations.closeApiKeyModal;
  window.submitApiKeyForm = submitApiKeyForm;
  window.runIngestionJob = Operations.runIngestionJob(apiAvailable, refreshOperationsConsole);
  window.toggleIngestionJob = Operations.toggleIngestionJob(apiAvailable, refreshOperationsConsole);
  window.refreshConnector = Operations.refreshConnector(refreshOperationsConsole);
  window.importCsvInteractions = () => Operations.importCsvInteractions(apiAvailable, refreshInteractions, refreshOperationsConsole);
  window.importIcsCalendar = () => Operations.importIcsCalendar(apiAvailable, refreshInteractions);
  window.revokeApiKey = Operations.revokeApiKey(apiAvailable, refreshOperationsConsole);
  window.copyFormEmbed = Operations.copyFormEmbed(apiAvailable);

  // Settings
  window.refreshSettingsFromApi = refreshSettingsFromApi;
  window.savePersonaSettings = savePersonaSettings;
  window.savePreferenceSettings = savePreferenceSettings;
  window.saveApiBaseOverride = Settings.saveApiBaseOverride;
  window.clearApiBaseOverride = Settings.clearApiBaseOverride;
  window.saveAuthSettings = saveAuthSettings;
  window.clearAuthSettings = clearAuthSettings;
  window.resetSettingsToDefaults = resetSettingsToDefaults;

  // Dashboard & Grants
  window.logSampleActivity = () => Dashboard.logSampleActivity(
    (activity) => State.addActivity(state, activity),
    persistState,
    () => Dashboard.renderActivities(state),
    Utils.createToast
  );
  window.generateReport = Grants.generateReport(state);
  window.downloadReportPDF = Grants.downloadReportPDF;

  // Refresh & state
  window.refreshFromApi = refreshFromApi;
  window.refreshAutomations = refreshAutomations;
  window.refreshTasks = refreshTasks;
  window.refreshMap = refreshMap;
  window.refreshDedupes = refreshDedupes;
  window.refreshOperationsConsole = refreshOperationsConsole;
  window.resetState = resetState;

  // Auth
  window.dismissAuthBanner = Auth.dismissAuthBanner;
  window.startAuthFlow = () => Auth.startAuthFlow(uiState, Utils.createToast, UI.switchToTab);

  // UI
  window.switchToTab = UI.switchToTab;
}

// ============================================================================
// Start Application
// ============================================================================

exposeWindowFunctions();
console.log('[HTI] Window functions exposed:', Object.keys(window).filter(k => k.includes('Lead') || k.includes('open') || k.includes('refresh')));
startApp();
