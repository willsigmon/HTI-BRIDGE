import crypto from 'node:crypto';
import { db, writeDb } from '../db.js';
import { ensureEntitiesForLead } from './entities.js';
import { assignLeadToStage, getDefaultStageId, getStageById } from './pipelines.js';
import { runLeadAutomations } from '../services/automationEngine.js';
import { logAuditEvent } from './audit.js';
import { getUserById } from './security.js';
import { getSettings } from './settings.js';
import { createTask } from './automations.js';
import { addActivity } from './activities.js';
import { notifyNewLead } from '../services/notifications.js';

const ACTIVE_STATUSES = new Set(['New', 'Researching', 'Initial Contact', 'Qualified', 'Proposal Sent', 'Negotiating']);
const CLOSED_STATUSES = new Set(['Committed', 'Donated', 'Not Interested', 'Invalid']);

function getLeadsCollection() {
  return db.data.leads;
}

function resolveWorkspaceId(inputWorkspaceId) {
  const workspaces = db.data.workspaces;
  if (inputWorkspaceId && workspaces.some((ws) => ws.id === inputWorkspaceId)) {
    return inputWorkspaceId;
  }
  return workspaces.length ? workspaces[0].id : null;
}

function getPrimaryPipelineId() {
  const pipelines = db.data.pipelines;
  return pipelines.length ? pipelines[0].id : null;
}

function ensureStageHistory(record) {
  if (!Array.isArray(record.stageHistory)) {
    record.stageHistory = [];
  }
}

const DEFAULT_PERSONA = 'Corporate IT Partner';
const LOGISTICS_PERSONA = 'Logistics Hotshot';

const PERSONA_RULES = [
  {
    name: 'Government Surplus',
    predicate: ({ source, text }) =>
      source.includes('gsa') || text.includes('auction') || text.includes('surplus') || text.includes('state agency')
  },
  {
    name: 'Government Procurement',
    predicate: ({ source, text }) =>
      source.includes('sam.gov') || source.includes('data.gov') || text.includes('federal') || text.includes('contract opportunity')
  },
  {
    name: 'Healthcare System',
    predicate: ({ text, equipment, company }) =>
      text.includes('hospital') ||
      text.includes('clinic') ||
      text.includes('health') ||
      equipment.includes('medical') ||
      company.includes('health')
  },
  {
    name: 'Education Partner',
    predicate: ({ text, equipment }) =>
      text.includes('school') ||
      text.includes('district') ||
      text.includes('college') ||
      text.includes('university') ||
      text.includes('education') ||
      equipment.includes('chromebook') ||
      equipment.includes('lab')
  },
  {
    name: 'Tech Refresh Donor',
    predicate: ({ source, text }) =>
      source.includes('reddit') ||
      source.includes('linkedin') ||
      text.includes('refresh') ||
      text.includes('upgrade') ||
      text.includes('laptop refresh')
  }
];

const PERSONA_DEFINITIONS = {
  'Government Surplus': { tags: ['public-sector', 'surplus'] },
  'Government Procurement': { tags: ['public-sector', 'procurement'] },
  'Healthcare System': { tags: ['healthcare'] },
  'Education Partner': { tags: ['education', 'community'] },
  'Tech Refresh Donor': { tags: ['technology', 'refresh'] },
  'Corporate IT Partner': { tags: ['corporate', 'it'] },
  'Logistics Hotshot': { tags: ['logistics', 'fast-turn'] }
};

const PERSONA_OWNER_MAP = {
  'Tech Refresh Donor': 'hti-admin',
  'Corporate IT Partner': 'hti-outreach',
  'Healthcare System': 'hti-fellow',
  'Education Partner': 'hti-fellow',
  'Logistics Hotshot': 'hti-outreach',
  'Government Procurement': 'hti-admin',
  'Government Surplus': 'hti-outreach'
};

export function listLeads({
  status,
  source,
  priority,
  persona,
  search,
  workspaceId,
  pipelineId,
  stageId,
  ownerId
} = {}) {
  let collection = [...getLeadsCollection()];

  let personaUpdates = false;
  for (const lead of collection) {
    if (!lead.persona || !Array.isArray(lead.personaTags)) {
      const personaData = categorizeLeadPersona(lead);
      lead.persona = personaData.persona;
      lead.personaTags = personaData.personaTags;
      personaUpdates = true;
    }
  }
  if (personaUpdates) {
    writeDb();
  }

  if (workspaceId) {
    collection = collection.filter((lead) => lead.workspaceId === workspaceId);
  }
  if (status) {
    collection = collection.filter((lead) => lead.status === status);
  }
  if (source) {
    collection = collection.filter((lead) => lead.source === source);
  }
  if (pipelineId) {
    collection = collection.filter((lead) => lead.pipelineId === pipelineId);
  }
  if (stageId) {
    collection = collection.filter((lead) => lead.stageId === stageId);
  }
  if (ownerId) {
    collection = collection.filter((lead) => lead.ownerId === ownerId);
  }
  if (priority) {
    if (priority === 'high') {
      collection = collection.filter((lead) => (lead.priority ?? 0) >= 80);
    } else if (priority === 'medium') {
      collection = collection.filter((lead) => (lead.priority ?? 0) >= 60 && (lead.priority ?? 0) < 80);
    } else if (priority === 'low') {
      collection = collection.filter((lead) => (lead.priority ?? 0) < 60);
    }
  }
  if (persona) {
    collection = collection.filter((lead) => lead.persona === persona);
  }
  if (search) {
    const lowered = search.toLowerCase();
    collection = collection.filter((lead) => {
      return (
        (lead.title || '').toLowerCase().includes(lowered) ||
        (lead.company || '').toLowerCase().includes(lowered) ||
        (lead.contact || '').toLowerCase().includes(lowered) ||
        (lead.ownerName || '').toLowerCase().includes(lowered) ||
        (lead.persona || '').toLowerCase().includes(lowered)
      );
    });
  }

  collection.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
  return collection;
}

export function getLeadById(id) {
  return getLeadsCollection().find((lead) => lead.id === id) || null;
}

export function createLead(payload, { actorId = 'system' } = {}) {
  const leads = getLeadsCollection();
  const id = payload.id || generateLeadId();
  const now = new Date().toISOString();
  const workspaceId = resolveWorkspaceId(payload.workspaceId);
  const pipelineId = payload.pipelineId || getPrimaryPipelineId();
  const stageId = payload.stageId || (pipelineId ? getDefaultStageId(pipelineId) : null);
  const stage = stageId ? getStageById(stageId) : null;
  const status = payload.status || 'New';
  const settings = getSettings();
  const ownerId = payload.ownerId || settings?.assignment?.defaultOwnerId || 'hti-outreach';
  const owner = getUserById(ownerId);
  const priority = payload.priority ?? calculatePriorityScore(payload);
  const probability = payload.probability ?? stage?.probability ?? probabilityFromStatus(status);
  const record = {
    id,
    title: payload.title,
    company: payload.company,
    contact: payload.contact,
    contactEmail: payload.contactEmail || null,
    contactPhone: payload.contactPhone || null,
    source: payload.source,
    location: payload.location,
    equipmentType: payload.equipmentType,
    estimatedQuantity: Number(payload.estimatedQuantity ?? 0),
    priority,
    status,
    timeline: payload.timeline || 'TBD',
    followUpDate: payload.followUpDate || null,
    followUpReason: payload.followUpReason || null,
    notes: payload.notes,
    potentialValue: payload.potentialValue || 'Medium',
    workspaceId,
    pipelineId,
    stageId,
    probability,
    ownerId,
    ownerName: owner?.name || 'Outreach Lead',
    grantFlag: payload.grantFlag || false,
    logistics: payload.logistics || null,
    createdAt: payload.date || now,
    updatedAt: now,
    stageHistory: stageId
      ? [
          {
            pipelineId,
            stageId,
            probability,
            changedAt: now,
            changedBy: actorId
          }
        ]
      : [],
    auditTrail: [
      {
        action: 'created',
        actorId,
        timestamp: now
      }
    ]
  };

  const personaData = categorizeLeadPersona(record);
  record.persona = personaData.persona;
  record.personaTags = personaData.personaTags;

  leads.unshift(record);
  ensureEntitiesForLead(record, { actorId });
  if (pipelineId && stageId) {
    assignLeadToStage({ leadId: id, pipelineId, stageId, actorId });
  }
  logAuditEvent({
    actorId,
    action: 'lead.created',
    entityType: 'lead',
    entityId: id,
    after: { title: record.title, company: record.company }
  });
  writeDb();
  return record;
}

export function updateLead(id, updates, { actorId = 'system' } = {}) {
  const leads = getLeadsCollection();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return null;
  const now = new Date().toISOString();
  const existing = leads[index];
  const before = { ...existing };

  const next = {
    ...existing,
    ...updates
  };

  next.priority = updates.priority ?? existing.priority ?? calculatePriorityScore(next);
  next.followUpDate = updates.followUpDate ?? existing.followUpDate ?? null;
  next.notes = updates.notes ?? existing.notes;
  const settings = getSettings();
  next.ownerId = updates.ownerId || existing.ownerId || settings?.assignment?.defaultOwnerId || 'hti-outreach';
  const owner = getUserById(next.ownerId);
  next.ownerName = owner?.name || existing.ownerName;
  next.workspaceId = resolveWorkspaceId(existing.workspaceId || updates.workspaceId);

  if (updates.status && CLOSED_STATUSES.has(updates.status)) {
    next.timeline = 'Closed';
  }

  let pipelineId = updates.pipelineId || existing.pipelineId;
  let stageId = updates.stageId || existing.stageId;

  if (updates.pipelineId && updates.pipelineId !== existing.pipelineId) {
    pipelineId = updates.pipelineId;
    stageId = getDefaultStageId(pipelineId);
  }

  if (!stageId && pipelineId) {
    stageId = getDefaultStageId(pipelineId);
  }

  if (stageId && stageId !== existing.stageId) {
    assignLeadToStage({ leadId: id, pipelineId, stageId, actorId });
    ensureStageHistory(next);
    next.stageHistory.push({
      pipelineId,
      stageId,
      probability: getStageById(stageId)?.probability ?? next.probability ?? 0,
      changedAt: now,
      changedBy: actorId
    });
  }

  next.pipelineId = pipelineId;
  next.stageId = stageId;
  if (stageId) {
    const stage = getStageById(stageId);
    if (stage) {
      next.probability = stage.probability;
    }
  }

  const personaData = categorizeLeadPersona(next);
  next.persona = personaData.persona;
  next.personaTags = personaData.personaTags;

  const automation = runLeadAutomations({ previous: before, next, actorId });
  if (automation.patches.length) {
    for (const patch of automation.patches) {
      Object.assign(next, patch);
    }
    if (automation.patches.some((patch) => patch.stageId && patch.stageId !== next.stageId)) {
      stageId = next.stageId;
      if (stageId) {
        assignLeadToStage({ leadId: id, pipelineId: next.pipelineId || pipelineId, stageId, actorId });
        ensureStageHistory(next);
        next.stageHistory.push({
          pipelineId: next.pipelineId || pipelineId,
          stageId,
          probability: getStageById(stageId)?.probability ?? next.probability ?? 0,
          changedAt: now,
          changedBy: actorId
        });
      }
    }
    const personaUpdate = categorizeLeadPersona(next);
    next.persona = personaUpdate.persona;
    next.personaTags = personaUpdate.personaTags;
  }

  next.updatedAt = now;
  ensureStageHistory(next);
  next.auditTrail = Array.isArray(next.auditTrail) ? [...next.auditTrail] : [];
  next.auditTrail.unshift({
    action: 'updated',
    actorId,
    timestamp: now,
    changes: Object.keys(updates)
  });

  leads[index] = next;
  ensureEntitiesForLead(next, { actorId });
  logAuditEvent({
    actorId,
    action: 'lead.updated',
    entityType: 'lead',
    entityId: id,
    before,
    after: { status: next.status, stageId: next.stageId, followUpDate: next.followUpDate }
  });
  writeDb();
  return next;
}

export function deleteLead(id) {
  const leads = getLeadsCollection();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index === -1) return false;
  const [removed] = leads.splice(index, 1);
  const assignments = db.data.leadAssignments;
  for (let i = assignments.length - 1; i >= 0; i -= 1) {
    if (assignments[i].leadId === id) {
      assignments.splice(i, 1);
    }
  }
  logAuditEvent({
    actorId: 'system',
    action: 'lead.deleted',
    entityType: 'lead',
    entityId: id,
    before: { title: removed?.title }
  });
  writeDb();
  return true;
}

export function summarizeLeads({ workspaceId } = {}) {
  const leads = workspaceId
    ? getLeadsCollection().filter((lead) => lead.workspaceId === workspaceId)
    : getLeadsCollection();
  const totalLeads = leads.length;
  const activeLeads = leads.filter((lead) => ACTIVE_STATUSES.has(lead.status)).length;
  const totalEquipment = leads.reduce((sum, lead) => sum + (lead.estimatedQuantity || 0), 0);
  const conversions = leads.filter((lead) => CLOSED_STATUSES.has(lead.status)).length;
  const conversionRate = totalLeads ? Math.round((conversions / totalLeads) * 100) : 0;
  const stageDurations = leads
    .filter((lead) => lead.stageHistory?.length)
    .map((lead) => {
      const history = lead.stageHistory;
      const currentStage = history[history.length - 1];
      const start = new Date(currentStage.changedAt || lead.updatedAt || lead.createdAt).getTime();
      return Math.max(0, Math.round((Date.now() - start) / (24 * 60 * 60 * 1000)));
    });

  const avgStageDuration = stageDurations.length
    ? Math.round(stageDurations.reduce((sum, value) => sum + value, 0) / stageDurations.length)
    : 0;

  const forecastEquipment = leads.reduce((sum, lead) => {
    const probability = typeof lead.probability === 'number' ? lead.probability : probabilityFromStatus(lead.status);
    return sum + (lead.estimatedQuantity || 0) * probability;
  }, 0);

  const pipelineBreakdown = leads.reduce((acc, lead) => {
    const stageKey = lead.stageId || 'unassigned';
    acc[stageKey] = (acc[stageKey] || 0) + 1;
    return acc;
  }, {});

  const personaBreakdown = leads.reduce((acc, lead) => {
    const persona = lead.persona || categorizeLeadPersona(lead).persona;
    const key = persona || 'Uncategorized';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const topPersonaEntry = Object.entries(personaBreakdown)
    .sort(([, countA], [, countB]) => countB - countA)
    [0] || null;

  const topPersona = topPersonaEntry
    ? { name: topPersonaEntry[0], count: topPersonaEntry[1] }
    : { name: null, count: 0 };

  return {
    totalLeads,
    activeLeads,
    totalEquipment,
    conversions,
    conversionRate,
    avgStageDuration,
    forecastEquipment,
    pipelineBreakdown,
    personaBreakdown,
    topPersona
  };
}

export function upsertMultiple(leads) {
  if (!Array.isArray(leads) || !leads.length) return;
  const collection = getLeadsCollection();
  const byId = new Map(collection.map((lead) => [lead.id, lead]));
  const now = new Date().toISOString();
  const settings = getSettings();
  const defaultOwnerId = settings?.assignment?.defaultOwnerId || 'hti-outreach';

  for (const lead of leads) {
    const id = lead.id || generateLeadId();
    const existing = byId.get(id);
    const workspaceId = resolveWorkspaceId(lead.workspaceId || existing?.workspaceId);
    const pipelineId = lead.pipelineId || existing?.pipelineId || getPrimaryPipelineId();
    const stageId = lead.stageId || existing?.stageId || (pipelineId ? getDefaultStageId(pipelineId) : null);
    const stage = stageId ? getStageById(stageId) : null;
    const basePriority = normalizeIncomingPriority(lead.priority, existing?.priority, lead);
    const record = {
      id,
      title: lead.title,
      company: lead.company,
      contact: lead.contact,
      source: lead.source,
      location: lead.location,
      equipmentType: lead.equipmentType,
      estimatedQuantity: lead.estimatedQuantity ?? 0,
      priority: basePriority,
      status: lead.status || 'New',
      timeline: lead.timeline || existing?.timeline || 'TBD',
      followUpDate: lead.followUpDate || existing?.followUpDate,
      notes: lead.notes,
      potentialValue: lead.potentialValue || existing?.potentialValue || 'Medium',
      createdAt: lead.createdAt || lead.date || existing?.createdAt || now,
      updatedAt: now,
      workspaceId,
      pipelineId,
      stageId,
      probability: lead.probability ?? stage?.probability ?? probabilityFromStatus(lead.status),
      ownerId: selectOwnerId(lead, existing, defaultOwnerId),
      ownerName: resolveOwnerName(selectOwnerId(lead, existing, defaultOwnerId), existing),
      logistics: lead.logistics || existing?.logistics || null
    };

    const personaData = categorizeLeadPersona(record);
    record.persona = personaData.persona;
    record.personaTags = personaData.personaTags;
    applyAutomatedScoring(record);

    if (existing) {
      const previousStage = existing.stageId;
      Object.assign(existing, record);
      ensureStageHistory(existing);
      if (stageId && previousStage !== stageId) {
        existing.stageHistory.push({
          pipelineId,
          stageId,
          probability: stage?.probability ?? existing.probability ?? 0,
          changedAt: now,
          changedBy: lead.actorId || 'system'
        });
        assignLeadToStage({ leadId: id, pipelineId, stageId, actorId: lead.actorId || 'system' });
      }
      ensureEntitiesForLead(existing, { actorId: lead.actorId || 'system' });
    } else {
      record.stageHistory = stageId
        ? [
            {
              pipelineId,
              stageId,
              probability: stage?.probability ?? record.probability ?? 0,
              changedAt: now,
              changedBy: lead.actorId || 'system'
            }
          ]
        : [];
      record.auditTrail = [
        {
          action: 'imported',
          actorId: lead.actorId || 'system',
          timestamp: now
        }
      ];
      collection.unshift(record);
      ensureEntitiesForLead(record, { actorId: lead.actorId || 'system' });
      if (pipelineId && stageId) {
        assignLeadToStage({ leadId: id, pipelineId, stageId, actorId: lead.actorId || 'system' });
      }
      if (record.priority >= 80) {
        scheduleFollowUpTask(record, { actorId: lead.actorId || 'system' });
        queueLeadNotification(record);
      }
    }
  }

  writeDb();
}

export function calculatePriorityScore(lead) {
  let score = 50;
  const quantity = Number(lead.estimatedQuantity ?? 0);
  score += Math.min(Math.round(quantity / 10), 25);

  const sourceWeights = {
    'LinkedIn': 8,
    'Professional Referral': 12,
    'Reddit (r/sysadmin)': 10,
    'Reddit (r/ITManagers)': 10,
    'SAM.gov': 9,
    'Data.gov': 6,
    'Community Tip': 14
  };
  score += sourceWeights[lead.source] || 5;

  const timeline = (lead.timeline || '').toLowerCase();
  if (timeline.includes('urgent')) score += 10;
  if (timeline.includes('immediate')) score += 12;

  return Math.max(10, Math.min(100, Math.round(score)));
}

function normalizeIncomingPriority(incoming, fallback, lead) {
  if (typeof incoming === 'number' && Number.isFinite(incoming)) {
    return incoming;
  }
  if (typeof incoming === 'string') {
    const normalized = incoming.toLowerCase();
    if (normalized === 'high') return 85;
    if (normalized === 'medium') return 70;
    if (normalized === 'low') return 55;
  }
  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return fallback;
  }
  return calculatePriorityScore(lead);
}

function applyAutomatedScoring(record) {
  let score = Number.isFinite(record.priority) ? record.priority : calculatePriorityScore(record);
  const quantity = Number(record.estimatedQuantity ?? 0);
  if (quantity >= 1000) score += 12;
  else if (quantity >= 500) score += 9;
  else if (quantity >= 200) score += 6;

  const personaBonus = {
    'Tech Refresh Donor': 10,
    'Corporate IT Partner': 8,
    'Healthcare System': 8,
    'Education Partner': 6,
    'Logistics Hotshot': 7,
    'Government Procurement': 5,
    'Government Surplus': 4
  }[record.persona] || 0;
  score += personaBonus;

  if (record.logistics?.onsitePickup) score += 6;
  if (record.logistics?.freightFriendly) score += 4;

  const notes = (record.notes || '').toLowerCase();
  const timeline = (record.timeline || '').toLowerCase();
  if (record.grantFlag || notes.includes('digital literacy') || notes.includes('grant county')) {
    score += 8;
  }
  if (timeline.includes('urgent') || timeline.includes('immediate')) {
    score += 5;
  }

  if (record.followUpDate) {
    const followUp = new Date(record.followUpDate);
    if (!Number.isNaN(followUp.getTime())) {
      const daysOut = Math.round((followUp.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      if (daysOut <= 7) score += 4;
    }
  }

  score = Math.max(10, Math.min(100, Math.round(score)));
  record.priority = score;
  record.priorityLabel = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low';
}

function selectOwnerId(lead, existing, defaultOwnerId) {
  if (lead.ownerId) return lead.ownerId;
  if (existing?.ownerId) return existing.ownerId;
  const personaOwner = PERSONA_OWNER_MAP[lead.persona];
  return personaOwner || defaultOwnerId;
}

function resolveOwnerName(ownerId, existing) {
  if (existing?.ownerName && existing.ownerId === ownerId) {
    return existing.ownerName;
  }
  const user = getUserById(ownerId);
  return user?.name || 'Outreach Lead';
}

function scheduleFollowUpTask(lead, { actorId }) {
  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const task = createTask(
    {
      title: `Call ${lead.company} about ${lead.estimatedQuantity} devices`,
      description: `Auto-generated follow-up for ${lead.persona} lead (${lead.source}).`,
      leadId: lead.id,
      dueDate,
      priority: 'high',
      workspaceId: lead.workspaceId
    },
    { actorId }
  );

  addActivity({
    text: `Automation scheduled follow-up task "${task.title}" (due ${dueDate}).`,
    type: 'automation'
  });
}

function queueLeadNotification(lead) {
  setTimeout(() => {
    notifyNewLead(lead).catch((error) => {
      console.warn('Lead notification failed:', error.message);
    });
  }, 0);
}

export function convertLeadStatus(status) {
  if (CLOSED_STATUSES.has(status)) return 'Closed';
  if (ACTIVE_STATUSES.has(status)) return 'Active';
  return 'Other';
}

export function generateLeadId() {
  return 'L' + crypto.randomInt(0, 999999).toString().padStart(6, '0');
}

function categorizeLeadPersona(lead) {
  const source = (lead.source || '').toLowerCase();
  const equipment = (lead.equipmentType || '').toLowerCase();
  const company = (lead.company || '').toLowerCase();
  const notes = (lead.notes || '').toLowerCase();
  const title = (lead.title || '').toLowerCase();
  const location = (lead.location || '').toLowerCase();
  const timeline = (lead.timeline || '').toLowerCase();
  const text = `${title} ${company} ${notes} ${location}`;
  const priority = lead.priority ?? 0;
  const followUpDate = lead.followUpDate ? new Date(lead.followUpDate) : null;
  const followUpDays = followUpDate && !Number.isNaN(followUpDate.getTime())
    ? Math.round((followUpDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;
  const logistics = lead.logistics || {};

  const context = { source, equipment, company, text, location, timeline, priority, followUpDays, logistics };

  const settings = getSettings();
  const enabledMap = settings?.personas?.enabled || {};
  const weightMap = settings?.personas?.weights || {};

  let persona = DEFAULT_PERSONA;
  for (const rule of PERSONA_RULES) {
    if (rule.predicate(context)) {
      persona = rule.name;
      break;
    }
  }

  if (
    persona === DEFAULT_PERSONA &&
    ((followUpDays !== null && followUpDays <= 3) || timeline.includes('urgent') || timeline.includes('immediate'))
  ) {
    persona = LOGISTICS_PERSONA;
  }

  if (enabledMap[persona] === false) {
    persona = DEFAULT_PERSONA;
  }

  const definition = PERSONA_DEFINITIONS[persona] || PERSONA_DEFINITIONS[DEFAULT_PERSONA];
  const tags = new Set(definition?.tags || []);

  if (priority >= 80) tags.add('high-priority');
  if (followUpDays !== null && followUpDays <= 3) tags.add('urgent');
  if (timeline.includes('grant')) tags.add('grant');
  if (source) tags.add(`source:${source}`);
  if (equipment) tags.add(`equipment:${equipment.replace(/\s+/g, '-')}`);
  if (logistics.onsitePickup) tags.add('onsite-pickup');
  if (logistics.freightFriendly) tags.add('freight-friendly');

  const weight = Number(weightMap[persona] ?? 1);
  if (Number.isFinite(weight) && weight !== 1) {
    tags.add(`weight:${weight}`);
  }

  tags.add(`persona:${persona.toLowerCase().replace(/\s+/g, '-')}`);

  return { persona, personaTags: [...tags] };
}

function probabilityFromStatus(status = '') {
  const map = new Map([
    ['New', 0.1],
    ['Researching', 0.2],
    ['Initial Contact', 0.3],
    ['Qualified', 0.5],
    ['Proposal Sent', 0.6],
    ['Negotiating', 0.75],
    ['Committed', 0.9],
    ['Donated', 1],
    ['Not Interested', 0],
    ['Invalid', 0]
  ]);
  return map.get(status) ?? 0.2;
}
