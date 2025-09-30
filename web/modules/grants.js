import { UPCOMING_THRESHOLD } from '../config.js';
import {
  escapeHtml,
  formatDate,
  formatRelativeDate,
  formatNumber,
  clamp,
  normalizeGrantMetrics
} from './utils.js';

function daysUntil(dateString) {
  if (!dateString) return NaN;
  const today = new Date();
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return NaN;
  const diffMs = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

function formatDueLabel(dateString) {
  const diff = daysUntil(dateString);
  if (Number.isNaN(diff)) return '';
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff === 0) return 'due today';
  if (diff === 1) return 'due tomorrow';
  if (diff <= UPCOMING_THRESHOLD) return `due in ${diff} days`;
  return '';
}

function sanitizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(String(url), window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch (error) {
    return '';
  }
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

export function getMilestoneStatus(milestone) {
  const baseStatus = milestone.status || 'Upcoming';
  const dueDiff = daysUntil(milestone.dueDate);
  if (baseStatus === 'Completed') return 'Completed';
  if (dueDiff < 0) return 'Overdue';
  if (dueDiff <= UPCOMING_THRESHOLD && baseStatus !== 'In Progress') return 'Upcoming';
  return baseStatus;
}

export function renderGrantMilestones(state) {
  const container = document.getElementById('grantMilestones');
  if (!container) return;

  const milestones = [...state.grantMilestones]
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  container.innerHTML = milestones
    .map((milestone) => {
      const dueLabel = formatDueLabel(milestone.dueDate);
      const statusClass = getStatusClass(getMilestoneStatus(milestone));
      const keywordBadges = Array.isArray(milestone.matchedKeywords)
        ? milestone.matchedKeywords
            .filter(Boolean)
            .map(
              (keyword) =>
                `<span class="badge milestone-keyword">${escapeHtml(keyword)}</span>`
            )
            .join(' ')
        : '';
      const detailHref = sanitizeUrl(milestone.url);
      const detailButton = detailHref
        ? `<a class="btn btn--outline btn-sm" href="${detailHref}" target="_blank" rel="noopener noreferrer">View listing</a>`
        : '';
      const footer = keywordBadges || detailButton
        ? `
            <footer class="milestone-footer">
              <div class="milestone-tags">${keywordBadges}</div>
              ${detailButton}
            </footer>
          `
        : '';
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
          ${footer}
        </article>
      `;
    })
    .join('');
}

export function renderGrantRoadmap(state) {
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

export function renderDigitalLiteracyHours(state) {
  const card = document.getElementById('digitalHoursCard');
  if (!card) return;

  const percentEl = document.getElementById('digitalHoursPercent');
  const barEl = document.getElementById('digitalHoursBar');
  const completedEl = document.getElementById('digitalHoursCompleted');
  const remainingEl = document.getElementById('digitalHoursRemaining');
  const updatedEl = document.getElementById('digitalHoursUpdated');

  const metrics = state.dashboard?.grantMetrics?.digitalLiteracyHours
    || state.grantMetrics?.digitalLiteracyHours
    || normalizeGrantMetrics().digitalLiteracyHours;

  const percent = Number.isFinite(metrics.percent) ? metrics.percent : 0;
  const completed = Number.isFinite(metrics.completed) ? metrics.completed : 0;
  const required = Number.isFinite(metrics.required) ? metrics.required : 170;
  const remaining = Number.isFinite(metrics.remaining) ? metrics.remaining : Math.max(0, required - completed);

  if (percentEl) percentEl.textContent = `${percent}% complete`;
  if (barEl) barEl.style.width = `${clamp(percent, 0, 100)}%`;
  if (completedEl) completedEl.textContent = formatNumber(completed);
  if (remainingEl) remainingEl.textContent = formatNumber(remaining);
  if (updatedEl) {
    if (metrics.updatedAt) {
      const timestamp = new Date(metrics.updatedAt);
      updatedEl.textContent = Number.isNaN(timestamp.getTime())
        ? 'Pending'
        : timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else {
      updatedEl.textContent = 'Pending';
    }
  }
}

export function updateComplianceHealth(state) {
  const container = document.getElementById('complianceHealth');
  if (!container) return;

  const milestones = state.grantMilestones;
  if (!milestones.length) {
    container.innerHTML = '<li>No milestones configured</li>';
    return;
  }

  const completed = milestones.filter((milestone) => getMilestoneStatus(milestone) === 'Completed').length;
  const inProgress = milestones.filter((milestone) => getMilestoneStatus(milestone) === 'In Progress').length;
  const upcomingSoon = milestones.filter((milestone) => daysUntil(milestone.dueDate) >= 0 && daysUntil(milestone.dueDate) <= UPCOMING_THRESHOLD).length;
  const overdue = milestones.filter((milestone) => daysUntil(milestone.dueDate) < 0 && getMilestoneStatus(milestone) !== 'Completed').length;

  container.innerHTML = `
    <li><span>Milestones completed</span><span class="compliance-health__value">${completed}</span></li>
    <li><span>Active deliverables</span><span class="compliance-health__value">${inProgress}</span></li>
    <li><span>Due within 14 days</span><span class="compliance-health__value">${upcomingSoon}</span></li>
    <li><span>Overdue items</span><span class="compliance-health__value">${overdue}</span></li>
  `;
}

// ============================================================================
// Pipeline Board Rendering
// ============================================================================

export function renderPipelineBoard(state, uiState, assignPersonaMetadata, renderPersonaBadge, escapeQuotes) {
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

  const forecast = calculatePipelineForecast(state, selected.id);

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
      renderPipelineBoard(state, uiState, assignPersonaMetadata, renderPersonaBadge, escapeQuotes);
    });
  }
}

function calculatePipelineForecast(state, pipelineId) {
  return state.leads
    .filter((lead) => lead.pipelineId === pipelineId)
    .reduce((sum, lead) => {
      const quantity = Number(lead.estimatedQuantity ?? 0);
      const probability = typeof lead.probability === 'number' ? lead.probability : 0.3;
      return sum + quantity * probability;
    }, 0);
}

// ============================================================================
// Report Generation
// ============================================================================

function calculateGrantProgress(state) {
  const metrics = state.dashboard?.grantMetrics?.digitalLiteracyHours
    || state.grantMetrics?.digitalLiteracyHours
    || normalizeGrantMetrics().digitalLiteracyHours;
  return { percent: metrics.percent ?? 0 };
}

export function generateReport(state) {
  return function(reportType = 'executive') {
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
    const activeLeads = state.leads.filter((lead) => ['New', 'Qualified', 'Proposal Sent'].includes(lead.status)).length;
    const totalEquipment = state.leads.reduce((acc, lead) => acc + (Number(lead.estimatedQuantity) || 0), 0);
    const highPriorityLeads = state.leads.filter((lead) => (lead.priority ?? 0) >= 80);
    const highPriorityTargets = state.corporateTargets.filter((target) => target.priority === 'High');
    const grantProgress = calculateGrantProgress(state);

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
  };
}

export function downloadReportPDF() {
  const preview = document.getElementById('reportPreview');
  if (!preview) return;

  if (preview.hidden || !preview.innerHTML.trim()) {
    generateReport(state)('executive');
  }

  const reportHtml = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>HTI Report</title>
        <style>
          body { font-family: system-ui; margin: 2rem; }
          h3, h4 { color: #0f4c5c; }
          section { margin-bottom: 2rem; }
          ul { list-style-type: disc; margin-left: 1.5rem; }
        </style>
      </head>
      <body>${preview.innerHTML}</body>
    </html>`;

  const blob = new Blob([reportHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hti-report-${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
