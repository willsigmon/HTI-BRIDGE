import { ACTIVE_STATUSES, CLOSED_STATUSES } from '../config.js';
import {
  escapeHtml,
  escapeQuotes,
  formatDate,
  formatFollowUp,
  formatNumber,
  getStatusClass,
  getPriorityClass,
  renderPersonaBadge,
  calculatePriorityScore,
  assignPersonaMetadata,
  buildPersonaBreakdown,
  clamp,
  lookupOwnerName,
  createToast,
  lockModal,
  unlockModal,
  lockDrawer,
  unlockDrawer,
  getInputValue,
  toCsvValue
} from './utils.js';
import { apiRequest } from './api.js';
import { addActivity, persistState } from './state.js';

/**
 * Leads Module
 * Handles all lead management functionality including:
 * - Lead table rendering and filtering
 * - Add/edit/archive operations
 * - Lead status updates
 * - Lead drawer (detail view)
 * - CSV export
 */

// ============================================================================
// Lead Table Rendering
// ============================================================================

export function renderLeadsTable(state, filters, charts, updateCharts, renderLeadHealth, renderDashboard) {
  const container = document.getElementById('leadsTable');
  if (!container) return;

  const leads = filterLeads(state, filters)
    .sort((a, b) => sortLeads(a, b, filters.sort));

  if (leads.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__title">No leads match your filters</div>
        <div class="empty-state__body">Adjust filters or add a new lead to see data here.</div>
        <button class="btn btn--primary" type="button" onclick="openAddLeadModal()">Add lead</button>
      </div>
    `;
    renderLeadHealth(state);
    updateCharts(state, charts);
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

  renderLeadHealth(state);
  updateCharts(state, charts);
}

// ============================================================================
// Filtering & Sorting
// ============================================================================

export function filterLeads(state, filters) {
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

export function sortLeads(a, b, sortKey) {
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

// ============================================================================
// Add Lead Modal
// ============================================================================

export function openAddLeadModal() {
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

export function closeAddLeadModal() {
  const modal = document.getElementById('addLeadModal');
  const form = document.getElementById('addLeadForm');
  if (modal) modal.classList.add('hidden');
  if (form) form.reset();
  unlockModal();
}

export async function addLead(state, apiAvailable, refreshFromApi, renderAll) {
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

  if (apiAvailable.value) {
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
      apiAvailable.value = false;
    }
  }

  addLeadOffline(state, baseLead, renderAll);
}

export function generateLeadId(state) {
  const numericIds = state.leads
    .map((lead) => parseInt(String(lead.id || '').replace(/[^0-9]/g, ''), 10))
    .filter((value) => !Number.isNaN(value));
  const maxId = numericIds.length ? Math.max(...numericIds) : 0;
  return `L${String(maxId + 1).padStart(3, '0')}`;
}

export function addLeadOffline(state, baseLead, renderAll, populatePersonaFilter) {
  const newLead = {
    ...baseLead,
    id: baseLead.id || generateLeadId(state),
    priority: baseLead.priority ?? calculatePriorityScore(baseLead)
  };

  const defaultOwnerId = state.settings?.assignment?.defaultOwnerId || 'hti-outreach';
  newLead.ownerId = baseLead.ownerId || defaultOwnerId;
  newLead.ownerName = newLead.ownerName || lookupOwnerName(newLead.ownerId);
  assignPersonaMetadata(newLead);
  state.leads.unshift(newLead);
  addActivity(state, { text: `Lead logged: ${newLead.title} (${newLead.company || 'Unknown'})`, type: 'lead' });
  state.analytics.personaBreakdown = buildPersonaBreakdown(state.leads);
  if (populatePersonaFilter) populatePersonaFilter(state);
  persistState(state);

  renderAll();
  closeAddLeadModal();
  createToast('Lead added', `${newLead.title} captured locally.`, 'success');
}

// ============================================================================
// Lead Status Modal
// ============================================================================

export function openLeadStatusModal(state, leadStatusContext) {
  return function(leadId) {
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
  };
}

export function openLeadStatusModalFromDrawer(openLeadStatusModalFn) {
  const drawer = document.getElementById('leadDrawer');
  if (!drawer) return;
  const leadId = drawer.getAttribute('data-lead-id');
  if (leadId) {
    openLeadStatusModalFn(leadId);
  }
}

export function closeLeadStatusModal(leadStatusContext) {
  const modal = document.getElementById('leadStatusModal');
  if (modal) modal.classList.add('hidden');
  unlockModal();
  leadStatusContext.leadId = null;
}

export async function submitLeadStatusForm(state, leadStatusContext, apiAvailable, refreshFromApi, renderAll, populatePersonaFilter) {
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

  if (apiAvailable.value) {
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
      closeLeadStatusModal(leadStatusContext);
      createToast('Lead updated', `${lead.title} marked as ${status}.`, 'success');
      return;
    } catch (error) {
      console.warn('API lead update failed, updating locally.', error);
      createToast('Offline mode', 'Saved locally until API reconnects.', 'warning');
      apiAvailable.value = false;
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
  if (populatePersonaFilter) populatePersonaFilter(state);

  addActivity(state, { text: `Status updated to ${status} for ${lead.title}`, type: 'update' });
  persistState(state);
  closeLeadStatusModal(leadStatusContext);
  renderAll();
  createToast('Lead updated', `${lead.title} marked as ${status}.`, 'success');
}

// ============================================================================
// Lead Drawer (Detail View)
// ============================================================================

export function viewLead(state) {
  return function(leadId) {
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
  };
}

export function closeLeadDrawer() {
  const drawer = document.getElementById('leadDrawer');
  if (drawer) {
    drawer.classList.add('hidden');
    drawer.removeAttribute('data-lead-id');
  }
  unlockDrawer();
}

export function viewTopLead(topLeadId, viewLeadFn) {
  if (!topLeadId) {
    createToast('No featured lead', 'Once you add an active lead it will surface here.', 'info');
    return;
  }
  viewLeadFn(topLeadId);
}

// ============================================================================
// Lead Archive
// ============================================================================

export async function archiveLead(state, apiAvailable, refreshFromApi, renderAll) {
  return async function(leadId) {
    const index = state.leads.findIndex((lead) => lead.id === leadId);
    if (index === -1) {
      createToast('Lead not found', 'Unable to archive this record.', 'error');
      return;
    }

    const lead = state.leads[index];
    const confirmed = window.confirm(`Archive "${lead.title}" from the active pipeline?`);
    if (!confirmed) return;

    if (apiAvailable.value) {
      try {
        await apiRequest(`/leads/${encodeURIComponent(leadId)}`, { method: 'DELETE' });
        await refreshFromApi();
        createToast('Lead archived', `${lead.title} removed from active pipeline.`, 'info');
        return;
      } catch (error) {
        console.warn('API archive failed, removing locally.', error);
        createToast('Offline mode', 'Lead archived locally until API reconnects.', 'warning');
        apiAvailable.value = false;
      }
    }

    state.leads.splice(index, 1);
    addActivity(state, { text: `Lead archived: ${lead.title}`, type: 'archive' });
    persistState(state);
    renderAll();
    createToast('Lead archived', `${lead.title} removed from active pipeline.`, 'info');
  };
}

// ============================================================================
// Follow-up Actions
// ============================================================================

export async function completeFollowUp(state, apiAvailable, refreshFromApi, renderAll, populatePersonaFilter) {
  return async function(leadId) {
    const lead = state.leads.find((item) => item.id === leadId);
    if (!lead) {
      createToast('Lead not found', 'Unable to update follow-up.', 'error');
      return;
    }

    const nextDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    if (apiAvailable.value) {
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
        apiAvailable.value = false;
      }
    }

    lead.followUpDate = nextDate;
    assignPersonaMetadata(lead);
    state.analytics.personaBreakdown = buildPersonaBreakdown(state.leads);
    if (populatePersonaFilter) populatePersonaFilter(state);
    addActivity(state, { text: `Follow-up completed for ${lead.title}`, type: 'update' });
    persistState(state);
    renderAll();
    createToast('Follow-up rescheduled', `Next touchpoint set for ${formatDate(nextDate)}.`, 'success');
  };
}

// ============================================================================
// Lead Export
// ============================================================================

export function exportLeads(state) {
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
