import { summarizeLeads, listLeads } from '../repositories/leads.js';
import { listCorporateTargets, countHighPriorityTargets } from '../repositories/corporateTargets.js';
import { listMilestones, summarizeMilestones } from '../repositories/milestones.js';
import { listActivities } from '../repositories/activities.js';

export function buildDashboardSummary() {
  const leadSummary = summarizeLeads();
  const milestones = listMilestones();
  const corporateTargets = listCorporateTargets();
  const activeLeads = listLeads({});

  const highPriorityTargets = countHighPriorityTargets();

  const grantProgressPercent = computeGrantProgress(milestones);

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
      avgLeadAge
    },
    equipmentByType,
    leadSources,
    grantProgressPercent,
    milestoneCounts: summarizeMilestones(),
    recentActivities: listActivities(12),
    corporateTargets
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
