import {
  PERSONA_BUCKETS,
  API_BASE_URL,
  DEFAULT_AUTH_URL,
  AUTH_PROMPT_MESSAGE,
  INITIAL_AUTH_URL
} from '../config.js';
import {
  escapeHtml,
  clone,
  mergeSettings,
  createToast,
  assignPersonaMetadata,
  buildPersonaBreakdown,
  getTopPersona
} from './utils.js';
import { apiRequest } from './api.js';
import { persistState } from './state.js';

/**
 * Settings Module
 * Handles settings panel functionality including:
 * - Persona configuration
 * - Preference management
 * - API base URL overrides
 * - Auth URL configuration
 * - Settings sync with API
 */

// ============================================================================
// Settings Panel Rendering
// ============================================================================

export function renderSettingsPanel(state, uiState, DEFAULT_SETTINGS) {
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
  const authUrlInput = document.getElementById('authUrlInput');
  if (authUrlInput) {
    authUrlInput.value = uiState.authTarget || window.__HTI_AUTH_URL__ || INITIAL_AUTH_URL;
  }
}

// ============================================================================
// Settings Sync with API
// ============================================================================

export async function refreshSettingsFromApi(state, apiAvailable, applySettingsPatchFn, handleAuthError, notifyAuthRequired, renderSettingsPanelFn) {
  if (!apiAvailable.value) {
    createToast('Offline mode', 'Using locally cached settings.', 'warning');
    renderSettingsPanelFn();
    return;
  }
  try {
    const response = await apiRequest('/settings', { method: 'GET' });
    const payload = await response.json();
    applySettingsPatchFn(payload, false);
    createToast('Settings synced', 'Fetched latest configuration from the API.', 'success');
  } catch (error) {
    if (handleAuthError(error, 'Sign in to sync settings from the HTI API.')) {
      notifyAuthRequired('Authenticate to load organization settings.');
      return;
    }
    console.error('Failed to fetch settings', error);
    createToast('Sync failed', error.message || 'Unable to load settings', 'error');
  }
}

// ============================================================================
// Persona Settings
// ============================================================================

export async function savePersonaSettings(persistSettingsPatchFn) {
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
  await persistSettingsPatchFn(patch, 'Persona settings updated', 'Saved persona preferences locally.');
}

// ============================================================================
// Preference Settings
// ============================================================================

export async function savePreferenceSettings(persistSettingsPatchFn) {
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
  await persistSettingsPatchFn(patch, 'Preferences saved', 'Updated assignment and feature toggles.');
}

// ============================================================================
// API Base Override
// ============================================================================

export function saveApiBaseOverride() {
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

export function clearApiBaseOverride() {
  localStorage.removeItem('hti-api-base');
  window.__HTI_API_BASE__ = '/api';
  const input = document.getElementById('apiBaseInput');
  if (input) input.value = API_BASE_URL;
  createToast('API base cleared', 'Using default relative API path.', 'success');
}

// ============================================================================
// Auth URL Configuration
// ============================================================================

export function saveAuthSettings(uiState, storageAvailable, renderAuthBanner) {
  const input = document.getElementById('authUrlInput');
  if (!input) return;
  const value = input.value.trim();
  if (!value) {
    createToast('Missing URL', 'Enter a sign-in URL before saving.', 'warning');
    return;
  }
  updateStoredAuthUrl(value, storageAvailable);
  uiState.authTarget = value;
  if (!uiState.authMessage) {
    uiState.authMessage = AUTH_PROMPT_MESSAGE;
  }
  createToast('Auth URL saved', 'Sign-in handoff updated.', 'success');
  renderAuthBanner();
}

export function clearAuthSettings(uiState, storageAvailable, renderAuthBanner) {
  updateStoredAuthUrl('', storageAvailable);
  uiState.authTarget = window.__HTI_AUTH_URL__ || INITIAL_AUTH_URL;
  const input = document.getElementById('authUrlInput');
  if (input) {
    input.value = uiState.authTarget;
  }
  createToast('Auth URL cleared', 'Reverted to default sign-in path.', 'success');
  renderAuthBanner();
}

function updateStoredAuthUrl(value, storageAvailable) {
  if (storageAvailable.value) {
    try {
      if (value) {
        localStorage.setItem('hti-auth-url', value);
      } else {
        localStorage.removeItem('hti-auth-url');
      }
    } catch (error) {
      storageAvailable.value = false;
    }
  }
  window.__HTI_AUTH_URL__ = value || DEFAULT_AUTH_URL;
}

// ============================================================================
// Settings Persistence
// ============================================================================

export async function resetSettingsToDefaults(DEFAULT_SETTINGS, persistSettingsPatchFn) {
  const confirmed = window.confirm('Reset all settings to defaults?');
  if (!confirmed) return;
  await persistSettingsPatchFn(clone(DEFAULT_SETTINGS), 'Settings reset', 'Restored default configuration.');
}

export async function persistSettingsPatch(state, apiAvailable, DEFAULT_SETTINGS, applySettingsPatchFn, refreshSettingsFromApiFn, handleAuthError, notifyAuthRequired) {
  return async function(patch, successMessage, offlineMessage) {
    if (apiAvailable.value) {
      try {
        await apiRequest('/settings', { method: 'PUT', body: patch });
        await refreshSettingsFromApiFn();
        createToast('Settings saved', successMessage, 'success');
        return;
      } catch (error) {
        if (handleAuthError(error, 'Sign in to update settings via the API.')) {
          notifyAuthRequired('Authenticate to push settings to the server.');
        } else {
          console.warn('API settings update failed, applying locally.', error);
          createToast('Offline mode', offlineMessage, 'warning');
        }
        apiAvailable.value = false;
      }
    }

    applySettingsPatchFn(patch, true);
    createToast('Settings saved', offlineMessage, 'success');
  };
}

export function applySettingsPatch(state, apiAvailable, DEFAULT_SETTINGS, renderAll, renderSettingsPanelFn) {
  return function(patch, shouldPersist = false) {
    state.settings = mergeSettings(state.settings || clone(DEFAULT_SETTINGS), patch);
    state.leads.forEach(assignPersonaMetadata);
    state.analytics.personaBreakdown = buildPersonaBreakdown(state.leads);
    const topPersonaEntry = getTopPersona(state.analytics.personaBreakdown);
    state.analytics.topPersona = topPersonaEntry
      ? { name: topPersonaEntry[0], count: topPersonaEntry[1] }
      : null;
    if (shouldPersist && !apiAvailable.value) {
      persistState(state, apiAvailable.value, false);
    }
    renderSettingsPanelFn();
    renderAll();
  };
}
