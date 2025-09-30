import { ACTIVE_STATUSES, CLOSED_STATUSES, DEVICE_GOAL, UPCOMING_THRESHOLD } from '../config.js';
import {
  normalizeGrantMetrics,
  buildPersonaBreakdown,
  getTopPersona,
  assignPersonaMetadata,
  escapeHtml,
  escapeQuotes,
  formatNumber,
  formatDate,
  formatRelativeDate,
  formatActivityDate,
  aggregateBy,
  aggregateEquipmentTotals,
  clamp
} from './utils.js';

// Local helper functions
function leadAgeDays(lead) {
  if (!lead || !lead.date) return 0;
  const created = new Date(lead.date);
  if (Number.isNaN(created.getTime())) return 0;
  const diff = (Date.now() - created.getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(Math.round(diff), 0);
}

function leadWithinDays(lead, windowDays) {
  if (!lead || !lead.date) return false;
  const created = new Date(lead.date);
  if (Number.isNaN(created.getTime())) return false;
  const diff = (Date.now() - created.getTime()) / (24 * 60 * 60 * 1000);
  return diff >= 0 && diff <= windowDays;
}

function daysUntil(dateString) {
  if (!dateString) return NaN;
  const today = new Date();
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return NaN;
  const diffMs = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

function calculateGrantProgress(state, getMilestoneStatus) {
  if (!state.grantMilestones.length) return { percent: 0 };
  let score = 0;
  state.grantMilestones.forEach((milestone) => {
    const status = getMilestoneStatus(milestone);
    if (status === 'Completed') score += 1;
    else if (status === 'In Progress') score += 0.5;
  });
  const percent = Math.round((score / state.grantMilestones.length) * 100);
  return { percent };
}

function calculateActiveAlerts(state) {
  const today = new Date();
  return state.leads.filter((lead) => {
    if (!lead.followUpDate) return false;
    if (CLOSED_STATUSES.has(lead.status)) return false;
    const diff = Math.floor((new Date(lead.followUpDate) - today) / (24 * 60 * 60 * 1000));
    return diff <= 2;
  }).length;
}

function renderPersonaBadge(lead) {
  if (!lead.persona) assignPersonaMetadata(lead);
  const persona = lead.persona || 'Uncategorized';
  return `<span class="persona-badge" data-persona="${escapeHtml(persona)}">${escapeHtml(persona)}</span>`;
}

export function renderDashboard(state, charts, topLeadIdRef, persistState, getMilestoneStatus, switchToTab) {
  state.dashboard = state.dashboard || {};
  state.dashboard.metrics = state.dashboard.metrics || {};
  const dashboardGrantMetrics = normalizeGrantMetrics(state.dashboard.grantMetrics || state.grantMetrics || {});
  state.dashboard.grantMetrics = dashboardGrantMetrics;
  state.grantMetrics = state.grantMetrics || dashboardGrantMetrics;
  const dashboardMetrics = state.dashboard?.metrics || {};
  const grantProgressPercent = state.dashboard?.grantProgressPercent;

  const activeLeads = state.leads.filter((lead) => ACTIVE_STATUSES.has(lead.status));
  const totalEquipment = dashboardMetrics.totalEquipment ?? state.leads.reduce((total, lead) => total + (Number(lead.estimatedQuantity) || 0), 0);
  const highPriorityTargets = state.corporateTargets.filter((target) => (target.priority || '').toLowerCase() === 'high');
  const personaBreakdown = state.dashboard?.personaBreakdown || buildPersonaBreakdown(state.leads);
  const topPersonaEntry = state.dashboard?.topPersona?.name
    ? [state.dashboard.topPersona.name, state.dashboard.topPersona.count ?? personaBreakdown[state.dashboard.topPersona.name] ?? 0]
    : getTopPersona(personaBreakdown);
  const topPersonaName = topPersonaEntry ? topPersonaEntry[0] : null;

  state.dashboard.personaBreakdown = personaBreakdown;
  state.dashboard.topPersona = topPersonaEntry
    ? { name: topPersonaEntry[0], count: topPersonaEntry[1] }
    : null;

  const activeLeadEl = document.getElementById('activeLead');
  const equipmentPipelineEl = document.getElementById('equipmentPipeline');
  const grantProgressEl = document.getElementById('grantProgress');
  const highPriorityTargetsEl = document.getElementById('highPriorityTargets');
  const activeLeadTrendEl = document.getElementById('activeLeadTrend');
  const pipelineProgressBar = document.getElementById('pipelineProgressBar');
  const grantProgressBar = document.getElementById('grantProgressBar');
  const priorityHealthEl = document.getElementById('priorityHealth');
  const activeAlertsEl = document.getElementById('activeAlerts');
  const topPersonaChip = document.getElementById('topPersonaChip');

  const activeLeadCount = dashboardMetrics.activeLeads ?? activeLeads.length;
  if (activeLeadEl) activeLeadEl.textContent = activeLeadCount;
  if (equipmentPipelineEl) equipmentPipelineEl.textContent = formatNumber(totalEquipment);

  const pipelineProgress = clamp((totalEquipment / DEVICE_GOAL) * 100, 0, 100);
  if (pipelineProgressBar) pipelineProgressBar.style.width = `${pipelineProgress}%`;

  const grantProgress = Number.isFinite(grantProgressPercent)
    ? grantProgressPercent
    : calculateGrantProgress(state, getMilestoneStatus).percent;
  if (grantProgressEl) grantProgressEl.textContent = `${grantProgress}%`;
  if (grantProgressBar) grantProgressBar.style.width = `${grantProgress}%`;

  if (highPriorityTargetsEl) highPriorityTargetsEl.textContent = dashboardMetrics.highPriorityTargets ?? highPriorityTargets.length;

  if (activeLeadTrendEl) {
    if (!state.analytics.baselineActiveLead) {
      state.analytics.baselineActiveLead = activeLeadCount;
      persistState();
    }
    const diff = activeLeadCount - state.analytics.baselineActiveLead;
    activeLeadTrendEl.textContent = diff === 0
      ? 'On pace with baseline'
      : `${diff > 0 ? '+' : ''}${diff} vs baseline`;
  }

  if (priorityHealthEl) {
    const ratio = state.corporateTargets.length === 0 ? 0 : highPriorityTargets.length / state.corporateTargets.length;
    priorityHealthEl.textContent = ratio >= 0.4 ? 'Healthy mix' : 'Add high-priority targets';
  }

  if (activeAlertsEl) {
    const alerts = calculateActiveAlerts(state);
    activeAlertsEl.textContent = alerts === 0 ? 'No urgent alerts' : `${alerts} follow-ups due`;
    activeAlertsEl.classList.toggle('meta-chip--info', alerts > 0);
  }

  if (topPersonaChip) {
    if (topPersonaName) {
      topPersonaChip.textContent = `Top Persona: ${topPersonaName}`;
      topPersonaChip.style.display = 'inline-flex';
    } else {
      topPersonaChip.style.display = 'none';
    }
  }

  renderLeadHealth(state);
  renderConversionSnapshot(state);
  renderTopOpportunity(state, topLeadIdRef);
  renderPersonaSnapshot(personaBreakdown);
  renderActionCenter(state, getMilestoneStatus, switchToTab);
  updateCharts(state, charts);
}

export function renderLeadHealth(state) {
  const container = document.getElementById('leadHealth');
  if (!container) return;

  const dashboardMetrics = state.dashboard?.metrics || {};
  const totalLeads = dashboardMetrics.totalLeads ?? state.leads.length;
  const activeLeads = dashboardMetrics.activeLeads ?? state.leads.filter((lead) => ACTIVE_STATUSES.has(lead.status)).length;
  const conversions = dashboardMetrics.conversions ?? state.leads.filter((lead) => ['Committed', 'Donated'].includes(lead.status)).length;
  const totalEquipment = dashboardMetrics.totalEquipment ?? state.leads.reduce((total, lead) => total + (Number(lead.estimatedQuantity) || 0), 0);
  const avgQuantity = totalLeads === 0 ? 0 : Math.round(totalEquipment / totalLeads);
  const followUpsDue = calculateActiveAlerts(state);
  const personaBreakdown = state.dashboard?.personaBreakdown || buildPersonaBreakdown(state.leads);
  state.analytics.personaBreakdown = personaBreakdown;
  const topPersonaEntry = getTopPersona(personaBreakdown);
  state.analytics.topPersona = topPersonaEntry
    ? { name: topPersonaEntry[0], count: topPersonaEntry[1] }
    : null;
  state.dashboard = state.dashboard || {};
  state.dashboard.personaBreakdown = personaBreakdown;
  state.dashboard.topPersona = state.analytics.topPersona;

  container.innerHTML = `
    <span class="health-pill"><span class="health-pill__value">${formatNumber(totalLeads)}</span> total leads</span>
    <span class="health-pill"><span class="health-pill__value">${formatNumber(activeLeads)}</span> active pipeline</span>
    <span class="health-pill"><span class="health-pill__value">${formatNumber(avgQuantity)}</span> avg devices</span>
    <span class="health-pill"><span class="health-pill__value">${formatNumber(followUpsDue)}</span> follow-ups due</span>
    <span class="health-pill"><span class="health-pill__value">${formatNumber(conversions)}</span> conversions</span>
    ${topPersonaEntry ? `<span class="health-pill"><span class="health-pill__value">${escapeHtml(topPersonaEntry[0])}</span> lead persona</span>` : ''}
  `;
}

export function renderConversionSnapshot(state) {
  const container = document.getElementById('conversionSnapshot');
  if (!container) return;

  const dashboardMetrics = state.dashboard?.metrics || {};
  const totalLeads = dashboardMetrics.totalLeads ?? state.leads.length;
  const conversions = dashboardMetrics.conversions ?? state.leads.filter((lead) => ['Committed', 'Donated'].includes(lead.status)).length;
  const conversionRate = dashboardMetrics.conversionRate ?? (totalLeads ? Math.round((conversions / totalLeads) * 100) : 0);
  const activeLeads = state.leads.filter((lead) => ACTIVE_STATUSES.has(lead.status));
  const avgAge = dashboardMetrics.avgLeadAge ?? (activeLeads.length ? Math.round(activeLeads.reduce((sum, lead) => sum + leadAgeDays(lead), 0) / activeLeads.length) : 0);
  const newThisWeek = dashboardMetrics.newLeadsThisWeek ?? state.leads.filter((lead) => leadWithinDays(lead, 7)).length;

  if (!totalLeads) {
    container.innerHTML = `
      <div class="snapshot-metric">
        <span class="snapshot-metric__label">Pipeline</span>
        <span class="snapshot-metric__value">0</span>
        <span class="snapshot-metric__delta">Add leads to unlock insights</span>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="snapshot-metric">
      <span class="snapshot-metric__label">Conversion rate</span>
      <span class="snapshot-metric__value">${conversionRate}%</span>
      <span class="snapshot-metric__delta">${formatNumber(conversions)} of ${formatNumber(totalLeads)} opportunities</span>
    </div>
    <div class="snapshot-metric">
      <span class="snapshot-metric__label">Avg days active</span>
      <span class="snapshot-metric__value">${avgAge}</span>
      <span class="snapshot-metric__delta">Across ${formatNumber(activeLeads.length)} active leads</span>
    </div>
    <div class="snapshot-metric">
      <span class="snapshot-metric__label">Fresh pipeline</span>
      <span class="snapshot-metric__value">${formatNumber(newThisWeek)}</span>
      <span class="snapshot-metric__delta">Captured in the past 7 days</span>
    </div>
  `;
}

export function renderTopOpportunity(state, topLeadIdRef) {
  const container = document.getElementById('topOpportunity');
  if (!container) return;

  const candidates = state.leads
    .filter((lead) => !CLOSED_STATUSES.has(lead.status))
    .sort((a, b) => {
      const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      const quantityDiff = (b.estimatedQuantity || 0) - (a.estimatedQuantity || 0);
      if (quantityDiff !== 0) return quantityDiff;
      return new Date(a.followUpDate || '2100-01-01') - new Date(b.followUpDate || '2100-01-01');
    });

  const topLead = candidates[0];
  if (topLeadIdRef) {
    topLeadIdRef.current = topLead ? topLead.id : null;
  }

  if (!topLead) {
    container.innerHTML = `
      <p class="snapshot-feature__description">No active opportunities available. Add or unarchive a lead to feature it here.</p>
    `;
    return;
  }

  assignPersonaMetadata(topLead);

  container.innerHTML = `
    <h4 class="snapshot-feature__title">${escapeHtml(topLead.title)}</h4>
    <div class="snapshot-feature__meta">
      <span>🏢 ${escapeHtml(topLead.company || 'Unassigned')}</span>
      <span>🎯 ${escapeHtml(topLead.status)}</span>
      <span>🔥 Score ${topLead.priority ?? '—'}</span>
      ${topLead.estimatedQuantity ? `<span>💻 ${formatNumber(topLead.estimatedQuantity)} devices</span>` : ''}
      ${topLead.followUpDate ? `<span>📅 ${formatDate(topLead.followUpDate)}</span>` : ''}
    </div>
    <div class="snapshot-feature__persona">${renderPersonaBadge(topLead)}</div>
    <p class="snapshot-feature__description">${escapeHtml(topLead.notes || 'Capture next steps and stakeholders to keep momentum up.')}</p>
  `;
}

export function renderPersonaSnapshot(breakdown = {}) {
  const container = document.getElementById('personaSnapshot');
  if (!container) return;

  const entries = Object.entries(breakdown)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 4);
  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  if (!entries.length || total === 0) {
    container.innerHTML = '<li class="persona-list__item persona-list__item--empty">No persona data yet.</li>';
    return;
  }

  container.innerHTML = entries
    .map(([name, count]) => {
      const pct = Math.round((count / total) * 100);
      return `
        <li class="persona-list__item">
          <div class="persona-list__heading">
            <span class="persona-list__label">${escapeHtml(name)}</span>
            <span class="persona-list__count">${formatNumber(count)} · ${pct}%</span>
          </div>
          <div class="persona-list__bar">
            <span style="width:${Math.min(100, pct)}%"></span>
          </div>
        </li>
      `;
    })
    .join('');
}

export function renderActionCenter(state, getMilestoneStatus, switchToTab) {
  const followUpContainer = document.getElementById('followUpQueue');
  const grantContainer = document.getElementById('grantAlertsList');
  const syncContainer = document.getElementById('syncLogList');

  if (followUpContainer) {
    const upcoming = state.leads
      .filter((lead) => lead.followUpDate && !CLOSED_STATUSES.has(lead.status))
      .map((lead) => ({
        lead,
        diff: daysUntil(lead.followUpDate)
      }))
      .filter(({ diff }) => diff <= 14 && diff >= -7)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5);

    if (!upcoming.length) {
      followUpContainer.innerHTML = `
        <li class="action-item">
          <div>
            <p class="action-item__title">All quiet for the next 14 days</p>
            <p class="section-subtitle">New leads will surface here once follow-ups are scheduled.</p>
          </div>
        </li>
      `;
    } else {
      followUpContainer.innerHTML = upcoming
        .map(({ lead, diff }) => {
          const itemClass = diff < 0 ? 'action-item action-item--overdue' : diff <= 2 ? 'action-item action-item--due-soon' : 'action-item';
          const tagClass = diff < 0 ? 'tag tag--danger' : diff <= 2 ? 'tag tag--warning' : 'tag';
          const tagLabel = diff < 0
            ? `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`
            : diff === 0
              ? 'due today'
              : diff === 1
                ? 'due tomorrow'
                : `due in ${diff} days`;
          return `
            <li class="${itemClass}">
              <div>
                <p class="action-item__title">${escapeHtml(lead.title)}</p>
                <div class="action-item__meta">
                  <span>🏢 ${escapeHtml(lead.company || 'Unassigned')}</span>
                  <span>📅 ${formatDate(lead.followUpDate)} (${formatRelativeDate(lead.followUpDate)})</span>
                  <span>🎯 ${escapeHtml(lead.status)}</span>
                  ${lead.estimatedQuantity ? `<span>💻 ${formatNumber(lead.estimatedQuantity)} devices</span>` : ''}
                </div>
              </div>
              <div class="action-item__cta">
                <span class="${tagClass}">${tagLabel}</span>
                <button class="btn btn--outline btn-sm" type="button" onclick="openLeadStatusModal('${escapeQuotes(lead.id)}')">Update</button>
                <button class="btn btn--outline btn-sm" type="button" onclick="viewLead('${escapeQuotes(lead.id)}')">View</button>
                <button class="btn btn--outline btn-sm" type="button" onclick="completeFollowUp('${escapeQuotes(lead.id)}')">Done</button>
              </div>
            </li>
          `;
        })
        .join('');
    }
  }

  if (grantContainer) {
    const alerts = state.grantMilestones
      .map((milestone) => ({
        milestone,
        diff: daysUntil(milestone.dueDate),
        status: getMilestoneStatus(milestone)
      }))
      .filter(({ status, diff }) => status !== 'Completed' && diff >= -30)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5);

    if (!alerts.length) {
      grantContainer.innerHTML = `
        <li class="action-item">
          <div>
            <p class="action-item__title">Grant plan on track</p>
            <p class="section-subtitle">All milestones are completed for now.</p>
          </div>
        </li>
      `;
    } else {
      grantContainer.innerHTML = alerts
        .map(({ milestone, diff, status }) => {
          const itemClass = diff < 0 ? 'action-item action-item--overdue' : diff <= 7 ? 'action-item action-item--due-soon' : 'action-item';
          const tagClass = diff < 0 ? 'tag tag--danger' : diff <= 7 ? 'tag tag--warning' : 'tag';
          const tagLabel = diff < 0
            ? `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`
            : diff === 0
              ? 'due today'
              : diff === 1
                ? 'due tomorrow'
                : `due in ${diff} days`;
          return `
            <li class="${itemClass}">
              <div>
                <p class="action-item__title">${escapeHtml(milestone.title)}</p>
                <div class="action-item__meta">
                  <span>📅 ${formatDate(milestone.dueDate)}</span>
                  <span>📌 ${escapeHtml(status)}</span>
                  ${milestone.priority ? `<span>⭐ ${escapeHtml(milestone.priority)} priority</span>` : ''}
                </div>
              </div>
              <div class="action-item__cta">
                <span class="${tagClass}">${tagLabel}</span>
                <button class="btn btn--outline btn-sm" type="button" onclick="switchToTab('grants')">Open</button>
              </div>
            </li>
          `;
        })
        .join('');
    }
  }

  if (syncContainer) {
    const entries = (state.syncLog || []).slice(0, 5);
    if (!entries.length) {
      syncContainer.innerHTML = `
        <li class="action-item">
          <div>
            <p class="action-item__title">No syncs recorded yet</p>
            <p class="section-subtitle">Run one of the ingestion scripts to populate this timeline.</p>
          </div>
        </li>
      `;
    } else {
      syncContainer.innerHTML = entries
        .map((entry) => {
          const statusClass = entry.success ? 'action-item' : 'action-item action-item--overdue';
          const tagClass = entry.success ? 'tag' : 'tag tag--danger';
          const runEnded = entry.run_completed_at ? formatDate(entry.run_completed_at) : 'In progress';
          return `
            <li class="${statusClass}">
              <div>
                <p class="action-item__title">${escapeHtml(entry.source || 'Sync')}</p>
                <div class="action-item__meta">
                  <span>📅 ${formatDate(entry.run_started_at)}</span>
                  <span>🕒 ${escapeHtml(runEnded)}</span>
                  <span>📦 ${formatNumber(entry.item_count || 0)} items</span>
                </div>
                ${entry.notes ? `<p class="snapshot-feature__description">${escapeHtml(entry.notes)}</p>` : ''}
              </div>
              <div class="action-item__cta">
                <span class="${tagClass}">${entry.success ? 'success' : 'error'}</span>
              </div>
            </li>
          `;
        })
        .join('');
    }
  }
}

export function renderActivities(state) {
  const container = document.getElementById('activityList');
  if (!container) return;

  const activities = [...state.activities]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 6);

  if (activities.length === 0) {
    container.innerHTML = '<p>No recent activity logged.</p>';
    return;
  }

  container.innerHTML = activities
    .map((activity) => `
      <div class="activity-item">
        <span class="activity-date">${formatActivityDate(activity.timestamp)}</span>
        <span class="activity-text">${escapeHtml(activity.text)}</span>
      </div>
    `)
    .join('');
}

export function updateCharts(state, charts) {
  if (typeof Chart === 'undefined') return;

  const leadSourceCanvas = document.getElementById('leadSourceChart');
  const equipmentCanvas = document.getElementById('equipmentChart');

  const leadSourceCounts = state.dashboard?.leadSources || aggregateBy(state.leads, 'source');
  const equipmentTotals = state.dashboard?.equipmentByType || aggregateEquipmentTotals(state.leads);

  if (leadSourceCanvas) {
    const data = {
      labels: Object.keys(leadSourceCounts),
      datasets: [
        {
          data: Object.values(leadSourceCounts),
          backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#2C6E49', '#6376F4']
        }
      ]
    };

    if (charts.leadSources) {
      charts.leadSources.data = data;
      charts.leadSources.update();
    } else {
      charts.leadSources = new Chart(leadSourceCanvas.getContext('2d'), {
        type: 'doughnut',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  if (equipmentCanvas) {
    const labels = Object.keys(equipmentTotals);
    const values = Object.values(equipmentTotals);
    const data = {
      labels,
      datasets: [
        {
          label: 'Devices in pipeline',
          data: values,
          backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#2C6E49']
        }
      ]
    };

    if (charts.equipment) {
      charts.equipment.data = data;
      charts.equipment.update();
    } else {
      charts.equipment = new Chart(equipmentCanvas.getContext('2d'), {
        type: 'bar',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
  }
}

export function viewTopLead(topLeadId, viewLead, createToast) {
  if (!topLeadId) {
    createToast('No featured lead', 'Once you add an active lead it will surface here.', 'info');
    return;
  }
  viewLead(topLeadId);
}

export function logSampleActivity(addActivity, persistState, renderActivities, createToast) {
  const samples = [
    'Introduced HTI mission to SAS corporate philanthropy team',
    'Scheduled discovery call with Cisco CSR program manager',
    'Uploaded compliance receipts for Q3 equipment conversions',
    'Coordinated logistics with Triangle Manufacturing Corp for asset pickup',
    'Drafted stakeholder update for Digital Champion Grant committee'
  ];
  const text = samples[Math.floor(Math.random() * samples.length)];
  addActivity({ text, type: 'note' });
  persistState();
  renderActivities();
  createToast('Activity logged', text, 'success');
}
