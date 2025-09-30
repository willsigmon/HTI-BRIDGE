import { escapeHtml, escapeQuotes, formatRelativeTime, createToast } from './utils.js';
import { apiRequest } from './api.js';

/**
 * Data Hub Module
 * Handles CRM entity management including:
 * - Entity list and detail rendering
 * - Contact/organization/household views
 * - Interaction timeline
 * - Deduplication detection and merging
 */

// ============================================================================
// Data Hub Main Rendering
// ============================================================================

export function renderDataHub(state, uiState, viewLeadFn) {
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
      renderDataHub(state, uiState, viewLeadFn);
    });
  });

  const selectedRecord = filtered.find((record) => record.id === uiState.selectedEntityId) || filtered[0];
  detailEl.innerHTML = buildEntityDetail(state, selectedRecord);

  if (dedupeEl) {
    renderDedupePanel(state, dedupeEl);
  }
}

// ============================================================================
// Entity Detail Building
// ============================================================================

export function buildEntityDetail(state, record) {
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

  const timeline = buildEntityTimeline(state, record);

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

export function buildEntityTimeline(state, record) {
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

// ============================================================================
// Deduplication Panel
// ============================================================================

export function renderDedupePanel(state, container) {
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

export async function mergeDuplicate(apiAvailable, refreshFromApi, refreshDedupes) {
  return async function(primaryId, duplicateId) {
    if (!apiAvailable.value) {
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
  };
}

// ============================================================================
// Sample Data Builder
// ============================================================================

export function buildSampleInteractions(leadIds = []) {
  const types = ['email', 'call', 'meeting', 'note'];
  const directions = ['inbound', 'outbound'];
  const summaries = [
    'Follow-up call regarding equipment needs',
    'Email sent with product catalog',
    'Meeting scheduled to discuss partnership',
    'Note: Contact interested in Q2 donation'
  ];

  return Array.from({ length: 8 }, (_, index) => ({
    id: `interaction-${index + 1}`,
    entityId: `entity-${Math.floor(Math.random() * 5) + 1}`,
    leadId: leadIds[Math.floor(Math.random() * leadIds.length)] || null,
    type: types[Math.floor(Math.random() * types.length)],
    direction: directions[Math.floor(Math.random() * directions.length)],
    summary: summaries[Math.floor(Math.random() * summaries.length)],
    occurredAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  }));
}
