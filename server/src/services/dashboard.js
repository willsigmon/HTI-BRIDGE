import { summarizeLeads, listLeads } from '../repositories/leads.js';
import { listCorporateTargets, countHighPriorityTargets } from '../repositories/corporateTargets.js';
import { listMilestones, summarizeMilestones } from '../repositories/milestones.js';
import { getGrantMetrics } from '../repositories/grants.js';
import { listActivities } from '../repositories/activities.js';

export function buildDashboardSummary({ workspaceId } = {}) {
  const leadSummary = summarizeLeads({ workspaceId });
  const milestones = listMilestones();
  const corporateTargets = listCorporateTargets();
  const activeLeads = listLeads({ workspaceId });

  const highPriorityTargets = countHighPriorityTargets();

  const grantProgressPercent = computeGrantProgress(milestones);
  const grantMetrics = getGrantMetrics();
  const digitalLiteracyHours = computeDigitalLiteracy(grantMetrics.digitalLiteracyHours);

  const equipmentByType = activeLeads.reduce((acc, lead) => {
    const key = lead.equipmentType || 'Other';
    acc[key] = (acc[key] || 0) + (lead.estimatedQuantity || 0);
    return acc;
  }, {});

  const leadSources = activeLeads.reduce((acc, lead) => {
    const key = lead.source || 'Other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const newLeadsThisWeek = activeLeads.filter((lead) => {
    if (!lead.createdAt) return false;
    const created = new Date(lead.createdAt);
    return !Number.isNaN(created) && Date.now() - created.getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const avgLeadAge = activeLeads.length
    ? Math.round(
        activeLeads.reduce((sum, lead) => sum + leadAgeDays(lead), 0) /
          activeLeads.length
      )
    : 0;

  return {
    metrics: {
      totalLeads: leadSummary.totalLeads,
      activeLeads: leadSummary.activeLeads,
      totalEquipment: leadSummary.totalEquipment,
      conversionRate: leadSummary.conversionRate,
      conversions: leadSummary.conversions,
      highPriorityTargets,
      newLeadsThisWeek,
      avgLeadAge,
      avgStageDuration: leadSummary.avgStageDuration,
      forecastEquipment: Math.round(leadSummary.forecastEquipment || 0),
      topPersona: leadSummary.topPersona?.name || null
    },
    equipmentByType,
    leadSources,
    grantProgressPercent,
    grantMetrics: {
      digitalLiteracyHours
    },
    milestoneCounts: summarizeMilestones(),
    recentActivities: listActivities(12),
    corporateTargets,
    pipelineBreakdown: leadSummary.pipelineBreakdown,
    personaBreakdown: leadSummary.personaBreakdown,
    topPersona: leadSummary.topPersona
  };
}

function leadAgeDays(lead) {
  if (!lead || !lead.createdAt) return 0;
  const created = new Date(lead.createdAt);
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.round((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000)));
}

function computeGrantProgress(milestones = []) {
  if (!milestones.length) return 0;
  let score = 0;
  for (const milestone of milestones) {
    if (milestone.status === 'Completed') score += 1;
    else if (milestone.status === 'In Progress') score += 0.5;
  }
  return Math.round((score / milestones.length) * 100);
}

function computeDigitalLiteracy(metric = {}) {
  const required = Number.isFinite(metric.required) && metric.required > 0 ? metric.required : 170;
  const completed = Number.isFinite(metric.completed) && metric.completed >= 0 ? metric.completed : 0;
  const remaining = Math.max(0, required - completed);
  const percent = required === 0 ? 0 : Math.round(Math.min(1, completed / required) * 100);
  return {
    required,
    completed,
    remaining,
    percent,
    updatedAt: metric.updatedAt || null
  };
}
