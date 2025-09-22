import crypto from 'node:crypto';
import { db, writeDb } from '../db.js';
import { logAuditEvent } from './audit.js';

function getAutomations() {
  return db.data.automations;
}

function getExecutions() {
  return db.data.automationExecutions;
}

function getTasks() {
  return db.data.tasks;
}

function ensureWorkspaceId(inputWorkspaceId) {
  const workspaces = db.data.workspaces;
  if (inputWorkspaceId && workspaces.some((ws) => ws.id === inputWorkspaceId)) {
    return inputWorkspaceId;
  }
  return workspaces.length ? workspaces[0].id : null;
}

export function listAutomations({ workspaceId, status } = {}) {
  let automations = [...getAutomations()];
  if (workspaceId) {
    automations = automations.filter((automation) => automation.workspaceId === workspaceId);
  }
  if (status) {
    automations = automations.filter((automation) => automation.status === status);
  }
  automations.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return automations;
}

export function createAutomation(payload, { actorId = 'system' } = {}) {
  const now = new Date().toISOString();
  const automation = {
    id: crypto.randomUUID(),
    name: payload.name,
    description: payload.description || '',
    workspaceId: ensureWorkspaceId(payload.workspaceId),
    status: payload.status || 'active',
    trigger: payload.trigger,
    conditions: payload.conditions || {},
    actions: payload.actions || [],
    createdAt: now,
    updatedAt: now,
    createdBy: actorId
  };
  getAutomations().push(automation);
  writeDb();
  logAuditEvent({
    actorId,
    action: 'automation.created',
    entityType: 'automation',
    entityId: automation.id,
    after: { name: automation.name }
  });
  return automation;
}

export function updateAutomation(id, updates, { actorId = 'system' } = {}) {
  const automation = getAutomations().find((row) => row.id === id);
  if (!automation) return null;
  const before = { ...automation };
  automation.name = updates.name || automation.name;
  automation.description = updates.description ?? automation.description;
  automation.status = updates.status || automation.status;
  automation.trigger = updates.trigger || automation.trigger;
  automation.conditions = updates.conditions || automation.conditions;
  automation.actions = updates.actions || automation.actions;
  automation.updatedAt = new Date().toISOString();
  writeDb();
  logAuditEvent({
    actorId,
    action: 'automation.updated',
    entityType: 'automation',
    entityId: automation.id,
    before,
    after: { ...automation }
  });
  return automation;
}

export function deleteAutomation(id, { actorId = 'system' } = {}) {
  const automations = getAutomations();
  const index = automations.findIndex((row) => row.id === id);
  if (index === -1) return false;
  const [removed] = automations.splice(index, 1);
  writeDb();
  logAuditEvent({
    actorId,
    action: 'automation.deleted',
    entityType: 'automation',
    entityId: id,
    before: { name: removed?.name }
  });
  return true;
}

export function recordAutomationExecution({
  automationId,
  leadId,
  status,
  result,
  actorId = 'system'
}) {
  const execution = {
    id: crypto.randomUUID(),
    automationId,
    leadId,
    status,
    result,
    executedAt: new Date().toISOString(),
    actorId
  };
  getExecutions().unshift(execution);
  if (getExecutions().length > 2000) {
    getExecutions().length = 2000;
  }
  writeDb();
  return execution;
}

export function listAutomationExecutions({ automationId, limit = 100 } = {}) {
  let executions = [...getExecutions()];
  if (automationId) {
    executions = executions.filter((row) => row.automationId === automationId);
  }
  return executions.slice(0, limit);
}

export function createTask(payload, { actorId = 'system' } = {}) {
  const tasks = getTasks();
  const now = new Date().toISOString();
  const task = {
    id: crypto.randomUUID(),
    title: payload.title,
    description: payload.description || '',
    leadId: payload.leadId || null,
    dueDate: payload.dueDate || null,
    status: payload.status || 'open',
    priority: payload.priority || 'medium',
    workspaceId: ensureWorkspaceId(payload.workspaceId),
    createdBy: actorId,
    createdAt: now,
    updatedAt: now
  };
  tasks.push(task);
  writeDb();
  logAuditEvent({
    actorId,
    action: 'task.created',
    entityType: 'task',
    entityId: task.id,
    after: { title: task.title }
  });
  return task;
}

export function completeTask(taskId, { actorId = 'system' } = {}) {
  const tasks = getTasks();
  const task = tasks.find((row) => row.id === taskId);
  if (!task) return null;
  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  task.updatedAt = task.completedAt;
  writeDb();
  logAuditEvent({
    actorId,
    action: 'task.completed',
    entityType: 'task',
    entityId: taskId,
    after: { status: 'completed' }
  });
  return task;
}

export function listTasks({ workspaceId, status } = {}) {
  let tasks = [...getTasks()];
  if (workspaceId) {
    tasks = tasks.filter((task) => task.workspaceId === workspaceId);
  }
  if (status) {
    tasks = tasks.filter((task) => task.status === status);
  }
  tasks.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  return tasks;
}
