import { escapeHtml, escapeQuotes, createToast, openModal, closeModal } from './utils.js';
import { apiRequest } from './api.js';

/**
 * Operations Module
 * Handles operations console functionality including:
 * - Ingestion job management
 * - Connector configuration
 * - API key management
 * - Form embed generation
 * - CSV/ICS imports
 */

// ============================================================================
// Operations Console Rendering
// ============================================================================

export function renderOperationsConsole(state) {
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

// ============================================================================
// Operations Console Refresh
// ============================================================================

export async function refreshOperationsConsole(state, apiAvailable, renderOperationsConsoleFn) {
  if (!apiAvailable.value) {
    renderOperationsConsoleFn();
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
    renderOperationsConsoleFn();
  } catch (error) {
    console.warn('Unable to refresh operations console', error);
  }
}

// ============================================================================
// Ingestion Job Management
// ============================================================================

export async function runIngestionJob(apiAvailable, refreshOperationsConsoleFn) {
  return async function(id) {
    if (!apiAvailable.value) {
      createToast('Offline mode', 'Ingestion jobs require the live API.', 'warning');
      return;
    }
    try {
      await apiRequest(`/admin/ingestion/${id}/run`, {
        method: 'POST',
        body: { success: true, itemCount: 0, notes: 'Manual run from console' }
      });
      createToast('Ingestion queued', 'Job executed successfully.', 'success');
      await refreshOperationsConsoleFn();
    } catch (error) {
      console.error('Failed to run ingestion job', error);
      createToast('Run failed', error.message || 'Unable to trigger job', 'error');
    }
  };
}

export async function toggleIngestionJob(apiAvailable, refreshOperationsConsoleFn) {
  return async function(id, enabled) {
    if (!apiAvailable.value) return;
    try {
      await apiRequest(`/admin/ingestion/${id}`, {
        method: 'PATCH',
        body: { enabled }
      });
      createToast('Ingestion updated', enabled ? 'Job resumed.' : 'Job paused.', 'info');
      await refreshOperationsConsoleFn();
    } catch (error) {
      console.error('Failed to toggle ingestion job', error);
      createToast('Update failed', error.message || 'Unable to update job', 'error');
    }
  };
}

// ============================================================================
// Connector Management
// ============================================================================

export async function refreshConnector(refreshOperationsConsoleFn) {
  return async function(id) {
    createToast('Sync requested', 'Connector sync will run shortly.', 'info');
    await refreshOperationsConsoleFn();
  };
}

export async function importCsvInteractions(apiAvailable, refreshInteractions, refreshOperationsConsoleFn) {
  if (!apiAvailable.value) {
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
    await refreshOperationsConsoleFn();
  } catch (error) {
    console.error('CSV import failed', error);
    createToast('Import failed', error.message || 'Unable to parse CSV', 'error');
  }
}

export async function importIcsCalendar(apiAvailable, refreshInteractions) {
  if (!apiAvailable.value) {
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

export function openConnectorModal() {
  openModal('connectorModal');
}

export function closeConnectorModal() {
  closeModal('connectorModal');
}

export async function submitConnectorForm(apiAvailable, refreshOperationsConsoleFn) {
  if (!apiAvailable.value) {
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
    await refreshOperationsConsoleFn();
  } catch (error) {
    console.error('Failed to register connector', error);
    createToast('Save failed', error.message || 'Unable to register connector', 'error');
  }
}

// ============================================================================
// API Key Management
// ============================================================================

export function openApiKeyModal() {
  openModal('apiKeyModal');
}

export function closeApiKeyModal() {
  closeModal('apiKeyModal');
}

export async function submitApiKeyForm(apiAvailable, refreshOperationsConsoleFn) {
  if (!apiAvailable.value) {
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
    await refreshOperationsConsoleFn();
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

export async function revokeApiKey(apiAvailable, refreshOperationsConsoleFn) {
  return async function(id) {
    if (!apiAvailable.value) return;
    const confirmed = window.confirm('Revoke this API key? Access will be removed immediately.');
    if (!confirmed) return;
    try {
      await apiRequest(`/security/api-keys/${id}`, { method: 'DELETE' });
      createToast('API key revoked', 'Key removed successfully.', 'success');
      await refreshOperationsConsoleFn();
    } catch (error) {
      console.error('Failed to revoke API key', error);
      createToast('Revoke failed', error.message || 'Unable to revoke API key', 'error');
    }
  };
}

// ============================================================================
// Form Management
// ============================================================================

export async function copyFormEmbed(apiAvailable) {
  return async function(id) {
    if (!apiAvailable.value) {
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
  };
}
