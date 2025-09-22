import crypto from 'node:crypto';
import { db, writeDb } from '../db.js';
import { logAuditEvent } from './audit.js';
import { ensureLeadAssignment } from './entities.js';

function getPipelines() {
  return db.data.pipelines;
}

function getStages() {
  return db.data.pipelineStages;
}

function getLeadAssignments() {
  return db.data.leadAssignments;
}

export function getPipelineById(pipelineId) {
  return getPipelines().find((row) => row.id === pipelineId) || null;
}

export function getStageById(stageId) {
  return getStages().find((row) => row.id === stageId) || null;
}

function ensureWorkspaceId(inputWorkspaceId) {
  const workspaces = db.data.workspaces;
  if (inputWorkspaceId && workspaces.some((ws) => ws.id === inputWorkspaceId)) {
    return inputWorkspaceId;
  }
  return workspaces.length ? workspaces[0].id : null;
}

export function ensureDefaultPipelines() {
  if (getPipelines().length) return;
  const workspaceId = ensureWorkspaceId();
  const now = new Date().toISOString();
  const defaultPipelineId = crypto.randomUUID();
  const stageOrder = [];
  const stages = [
    { name: 'Discovery', probability: 0.1, category: 'Prospecting' },
    { name: 'Qualification', probability: 0.3, category: 'Prospecting' },
    { name: 'Proposal', probability: 0.5, category: 'Negotiation' },
    { name: 'Commitment', probability: 0.8, category: 'Commitment' },
    { name: 'Donation Closed', probability: 1, category: 'Closed Won' }
  ];

  stages.forEach((stage, index) => {
    const stageId = crypto.randomUUID();
    stageOrder.push(stageId);
    getStages().push({
      id: stageId,
      pipelineId: defaultPipelineId,
      name: stage.name,
      probability: stage.probability,
      category: stage.category,
      ordinal: index,
      createdAt: now,
      updatedAt: now
    });
  });

  getPipelines().push({
    id: defaultPipelineId,
    name: 'Corporate Donations',
    description: 'Primary equipment donation pipeline',
    workspaceId,
    type: 'equipment',
    stageOrder,
    defaultStageId: stageOrder[0],
    color: '#14532d',
    createdAt: now,
    updatedAt: now
  });

  writeDb();
}

export function listPipelines({ workspaceId } = {}) {
  let pipelines = [...getPipelines()];
  if (workspaceId) {
    pipelines = pipelines.filter((pipeline) => pipeline.workspaceId === workspaceId);
  }
  return pipelines.map((pipeline) => ({
    ...pipeline,
    stages: pipeline.stageOrder
      .map((stageId) => getStages().find((stage) => stage.id === stageId))
      .filter(Boolean)
  }));
}

export function createPipeline(payload, { actorId = 'system' } = {}) {
  const now = new Date().toISOString();
  const workspaceId = ensureWorkspaceId(payload.workspaceId);
  const pipelineId = crypto.randomUUID();
  const stageOrder = [];

  (payload.stages || []).forEach((stage, index) => {
    const stageId = crypto.randomUUID();
    stageOrder.push(stageId);
    getStages().push({
      id: stageId,
      pipelineId,
      name: stage.name,
      probability: stage.probability ?? 0,
      category: stage.category || 'Prospecting',
      ordinal: index,
      createdAt: now,
      updatedAt: now
    });
  });

  const pipeline = {
    id: pipelineId,
    name: payload.name,
    description: payload.description || '',
    workspaceId,
    type: payload.type || 'equipment',
    stageOrder,
    defaultStageId: stageOrder[0] || null,
    color: payload.color || '#0f172a',
    createdAt: now,
    updatedAt: now
  };

  getPipelines().push(pipeline);
  writeDb();

  logAuditEvent({
    actorId,
    action: 'pipeline.created',
    entityType: 'pipeline',
    entityId: pipelineId,
    after: { name: pipeline.name }
  });

  return pipeline;
}

export function updatePipeline(pipelineId, updates, { actorId = 'system' } = {}) {
  const pipeline = getPipelines().find((row) => row.id === pipelineId);
  if (!pipeline) return null;
  const before = { ...pipeline };
  pipeline.name = updates.name || pipeline.name;
  pipeline.description = updates.description ?? pipeline.description;
  pipeline.type = updates.type || pipeline.type;
  pipeline.color = updates.color || pipeline.color;
  pipeline.updatedAt = new Date().toISOString();
  if (updates.stageOrder) {
    pipeline.stageOrder = [...updates.stageOrder];
  }
  writeDb();

  logAuditEvent({
    actorId,
    action: 'pipeline.updated',
    entityType: 'pipeline',
    entityId: pipelineId,
    before,
    after: { ...pipeline }
  });

  return pipeline;
}

export function upsertStage(pipelineId, payload, { actorId = 'system' } = {}) {
  const stages = getStages();
  const pipeline = getPipelines().find((row) => row.id === pipelineId);
  if (!pipeline) throw new Error('Pipeline not found');
  const now = new Date().toISOString();
  let stage = null;

  if (payload.id) {
    stage = stages.find((row) => row.id === payload.id && row.pipelineId === pipelineId);
  }

  if (!stage) {
    const stageId = payload.id || crypto.randomUUID();
    stage = {
      id: stageId,
      pipelineId,
      name: payload.name,
      probability: payload.probability ?? 0,
      category: payload.category || 'Prospecting',
      ordinal: payload.ordinal ?? pipeline.stageOrder.length,
      createdAt: now,
      updatedAt: now
    };
    stages.push(stage);
    pipeline.stageOrder.push(stageId);
    if (!pipeline.defaultStageId) {
      pipeline.defaultStageId = stageId;
    }
    logAuditEvent({
      actorId,
      action: 'pipeline.stage.created',
      entityType: 'pipeline',
      entityId: pipelineId,
      after: { stageId, name: stage.name }
    });
  } else {
    const before = { ...stage };
    stage.name = payload.name || stage.name;
    stage.probability = payload.probability ?? stage.probability;
    stage.category = payload.category || stage.category;
    stage.ordinal = payload.ordinal ?? stage.ordinal;
    stage.updatedAt = now;
    logAuditEvent({
      actorId,
      action: 'pipeline.stage.updated',
      entityType: 'pipeline',
      entityId: pipelineId,
      before,
      after: { ...stage }
    });
  }

  pipeline.updatedAt = now;
  writeDb();
  return stage;
}

export function assignLeadToStage({
  leadId,
  pipelineId,
  stageId,
  actorId = 'system'
}) {
  const pipeline = getPipelines().find((row) => row.id === pipelineId);
  if (!pipeline) throw new Error('Pipeline not found');
  const stage = getStages().find((row) => row.id === stageId && row.pipelineId === pipelineId);
  if (!stage) throw new Error('Stage not found for pipeline');
  ensureLeadAssignment({
    leadId,
    entityType: 'pipeline',
    entityId: pipelineId,
    metadata: {
      stageId,
      assignedAt: new Date().toISOString()
    }
  });
  logAuditEvent({
    actorId,
    action: 'pipeline.stage.assigned',
    entityType: 'lead',
    entityId: leadId,
    after: { pipelineId, stageId }
  });
  writeDb();
  return { pipeline, stage };
}

export function getLeadStage(leadId) {
  const assignments = getLeadAssignments();
  const assignment = assignments.find((row) => row.leadId === leadId && row.entityType === 'pipeline');
  if (!assignment) return null;
  const stage = assignment.metadata?.stageId
    ? getStages().find((row) => row.id === assignment.metadata.stageId)
    : null;
  return {
    pipelineId: assignment.entityId,
    stageId: assignment.metadata?.stageId || null,
    stageName: stage?.name || null,
    probability: stage?.probability || 0,
    assignedAt: assignment.metadata?.assignedAt || assignment.updatedAt
  };
}

export function buildPipelineBoard(pipelineId, leads = []) {
  const pipeline = getPipelines().find((row) => row.id === pipelineId);
  if (!pipeline) return null;
  const stages = pipeline.stageOrder
    .map((stageId) => getStages().find((stage) => stage.id === stageId))
    .filter(Boolean)
    .sort((a, b) => a.ordinal - b.ordinal);

  const laneMap = new Map(stages.map((stage) => [stage.id, { ...stage, leads: [] }]));
  const assignments = getLeadAssignments().filter((row) => row.entityType === 'pipeline' && row.entityId === pipelineId);

  for (const assignment of assignments) {
    const stageLane = assignment.metadata?.stageId ? laneMap.get(assignment.metadata.stageId) : null;
    const lead = leads.find((item) => item.id === assignment.leadId);
    if (stageLane && lead) {
      stageLane.leads.push({
        leadId: lead.id,
        title: lead.title,
        company: lead.company,
        priority: lead.priority,
        status: lead.status,
        estimatedQuantity: lead.estimatedQuantity,
        followUpDate: lead.followUpDate,
        probability: stageLane.probability
      });
    }
  }

  return {
    pipeline: { ...pipeline },
    stages: [...laneMap.values()]
  };
}

export function summarizePipelines() {
  const pipelines = getPipelines();
  const assignments = getLeadAssignments().filter((row) => row.entityType === 'pipeline');
  const summary = pipelines.map((pipeline) => {
    const pipelineAssignments = assignments.filter((assignment) => assignment.entityId === pipeline.id);
    const stageCounts = pipeline.stageOrder.reduce((acc, stageId) => {
      acc[stageId] = pipelineAssignments.filter((assignment) => assignment.metadata?.stageId === stageId).length;
      return acc;
    }, {});
    return {
      pipelineId: pipeline.id,
      totalLeads: pipelineAssignments.length,
      stageCounts
    };
  });
  return summary;
}

export function getDefaultStageId(pipelineId) {
  const pipeline = getPipelineById(pipelineId);
  if (!pipeline) return null;
  if (pipeline.defaultStageId) return pipeline.defaultStageId;
  const stageId = pipeline.stageOrder[0];
  return stageId || null;
}
