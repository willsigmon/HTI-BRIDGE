import {
  escapeHtml,
  escapeQuotes,
  formatDate,
  formatRelativeTime,
  createToast
} from './utils.js';
import { apiRequest } from './api.js';

/**
 * Automation Module
 * Handles automation studio functionality including:
 * - Automation pipeline rendering
 * - Automation creation and management
 * - Task queue management
 * - Follow-up scheduling
 */

// ============================================================================
// Automation Studio Rendering
// ============================================================================

export function renderAutomationStudio(state, uiState) {
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
    renderAutomationStudio(state, uiState);
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

// ============================================================================
// Automation Form Submission
// ============================================================================

export async function handleAutomationSubmit(apiAvailable, refreshAutomations, refreshTasks) {
  return async function(event) {
    event.preventDefault();
    if (!apiAvailable.value) {
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
  };
}

// ============================================================================
// Automation Management
// ============================================================================

export async function refreshAutomations(state, apiAvailable, renderAutomationStudioFn) {
  if (!apiAvailable.value) return;
  try {
    const response = await apiRequest('/automations', { method: 'GET' });
    const payload = await response.json();
    state.automations = Array.isArray(payload) ? payload : payload.automations || [];
    renderAutomationStudioFn();
  } catch (error) {
    console.warn('Unable to refresh automations', error);
  }
}

export async function refreshTasks(state, apiAvailable, renderAutomationStudioFn) {
  if (!apiAvailable.value) return;
  try {
    const response = await apiRequest('/tasks', { method: 'GET' });
    const payload = await response.json();
    state.tasks = Array.isArray(payload) ? payload : payload.tasks || [];
    renderAutomationStudioFn();
  } catch (error) {
    console.warn('Unable to refresh tasks', error);
  }
}

export async function toggleAutomationStatus(apiAvailable, refreshAutomationsFn) {
  return async function(id, status) {
    if (!apiAvailable.value) return;
    const nextStatus = status === 'paused' ? 'active' : 'paused';
    try {
      await apiRequest(`/automations/${id}`, {
        method: 'PATCH',
        body: { status: nextStatus }
      });
      createToast('Automation updated', `Flow is now ${nextStatus}.`, 'info');
      await refreshAutomationsFn();
    } catch (error) {
      console.error('Failed to toggle automation', error);
      createToast('Update failed', error.message || 'Unable to update automation', 'error');
    }
  };
}

export async function deleteAutomation(apiAvailable, refreshAutomationsFn) {
  return async function(id) {
    if (!apiAvailable.value) return;
    const confirmed = window.confirm('Delete this automation? Flow history will remain in the audit log.');
    if (!confirmed) return;
    try {
      await apiRequest(`/automations/${id}`, { method: 'DELETE' });
      createToast('Automation removed', 'Flow deleted successfully.', 'success');
      await refreshAutomationsFn();
    } catch (error) {
      console.error('Failed to delete automation', error);
      createToast('Delete failed', error.message || 'Unable to delete automation', 'error');
    }
  };
}

// ============================================================================
// Task Management
// ============================================================================

export async function completeTaskAction(apiAvailable, refreshTasksFn) {
  return async function(id) {
    if (!apiAvailable.value) {
      createToast('Offline mode', 'Task completion syncs with the live API.', 'warning');
      return;
    }
    try {
      await apiRequest(`/tasks/${id}/complete`, { method: 'PATCH' });
      createToast('Task completed', 'Marked complete and logged to the timeline.', 'success');
      await refreshTasksFn();
    } catch (error) {
      console.error('Failed to complete task', error);
      createToast('Action failed', error.message || 'Unable to complete task', 'error');
    }
  };
}
