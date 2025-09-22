import crypto from 'node:crypto';
import { db, writeDb } from '../db.js';

const MAX_LOG_LENGTH = 2000;

function getCollection() {
  return db.data.auditLog;
}

function clampLogLength(collection) {
  if (collection.length > MAX_LOG_LENGTH) {
    collection.length = MAX_LOG_LENGTH;
  }
}

export function logAuditEvent({
  actorId = 'system',
  action,
  entityType,
  entityId,
  before,
  after,
  meta
}) {
  const collection = getCollection();
  const record = {
    id: crypto.randomUUID(),
    actorId,
    action,
    entityType,
    entityId,
    before,
    after,
    meta,
    createdAt: new Date().toISOString()
  };

  collection.unshift(record);
  clampLogLength(collection);
  writeDb();
  return record;
}

export function listAuditLog({ limit = 100, entityId, actorId } = {}) {
  let collection = [...getCollection()];
  if (entityId) {
    collection = collection.filter((entry) => entry.entityId === entityId);
  }
  if (actorId) {
    collection = collection.filter((entry) => entry.actorId === actorId);
  }
  return collection.slice(0, limit);
}

export function summarizeAuditLog() {
  const collection = getCollection();
  const counts = collection.reduce((acc, entry) => {
    const key = `${entry.entityType}:${entry.action}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return counts;
}
