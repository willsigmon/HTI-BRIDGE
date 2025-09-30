import { CORPORATE_PRIORITY_RANK } from '../config.js';
import {
  escapeHtml,
  escapeQuotes,
  getPriorityBadgeClass,
  createToast,
  lockModal,
  unlockModal,
  getInputValue,
  setInputValue
} from './utils.js';
import { apiRequest } from './api.js';
import { addActivity, persistState } from './state.js';

/**
 * Corporate Module
 * Handles corporate target management functionality including:
 * - Corporate targets table rendering
 * - Add/edit operations
 * - Corporate filtering
 * - Contact workflows
 */

// ============================================================================
// Corporate Targets Rendering
// ============================================================================

export function renderCorporateTargets(state, filters, renderPipelineBoard) {
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

// ============================================================================
// Corporate Modal (Add/Edit)
// ============================================================================

export function openCorporateModal(state, corporateEditIndex) {
  return function(companyName) {
    const modal = document.getElementById('corporateModal');
    const form = document.getElementById('corporateForm');
    if (!modal || !form) return;

    const titleEl = document.getElementById('corporateModalTitle');
    const submitButton = modal.querySelector('.modal-footer .btn.btn--primary');

    if (companyName) {
      corporateEditIndex.value = state.corporateTargets.findIndex((target) => target.company === companyName);
      if (corporateEditIndex.value === -1) {
        createToast('Not found', 'Unable to locate that corporate record.', 'error');
        return;
      }
      const target = state.corporateTargets[corporateEditIndex.value];
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
      corporateEditIndex.value = null;
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
  };
}

export function closeCorporateModal(corporateEditIndex) {
  const modal = document.getElementById('corporateModal');
  const form = document.getElementById('corporateForm');
  if (form) form.reset();
  if (modal) modal.classList.add('hidden');
  corporateEditIndex.value = null;
  unlockModal();
}

export async function submitCorporateForm(state, corporateEditIndex, apiAvailable, refreshFromApi, renderAll) {
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

  if (apiAvailable.value) {
    try {
      await apiRequest('/corporate-targets', { method: 'POST', body: targetData });
      await refreshFromApi();
      closeCorporateModal(corporateEditIndex);
      createToast('Company saved', `${targetData.company} synced with API.`, 'success');
      return;
    } catch (error) {
      console.warn('API corporate upsert failed, using offline store.', error);
      createToast('Offline mode', 'Saved locally until API reconnects.', 'warning');
      apiAvailable.value = false;
    }
  }

  if (corporateEditIndex.value !== null) {
    state.corporateTargets[corporateEditIndex.value] = {
      ...state.corporateTargets[corporateEditIndex.value],
      ...targetData
    };
    addActivity(state, { text: `Corporate target updated: ${targetData.company}`, type: 'corporate' });
    createToast('Company updated', `${targetData.company} saved.`, 'success');
  } else {
    state.corporateTargets.push({ ...targetData });
    addActivity(state, { text: `Corporate target added: ${targetData.company}`, type: 'corporate' });
    createToast('Company added', `${targetData.company} added to pipeline.`, 'success');
  }

  persistState(state);
  renderAll();
  closeCorporateModal(corporateEditIndex);
}

export function editCorporateTarget(openCorporateModalFn) {
  return function(companyName) {
    openCorporateModalFn(companyName);
  };
}

export function contactCorporate(companyName) {
  createToast('Outreach queued', `Kick off outreach workflow for ${companyName}.`, 'info');
}
