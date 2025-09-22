import crypto from 'node:crypto';
import { db, writeDb } from '../db.js';
import { logAuditEvent } from './audit.js';

function getJobs() {
  return db.data.ingestionJobs;
}

export function ensureDefaultJobs() {
  if (getJobs().length) return;
  const now = new Date().toISOString();
  getJobs().push(
    {
      id: 'reddit-ingest',
      source: 'Reddit',
      cron: '0 */4 * * *',
      status: 'idle',
      enabled: true,
      lastRunAt: null,
      nextRunAt: null,
      averageDuration: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'datagov-ingest',
      source: 'Data.gov',
      cron: '0 */12 * * *',
      status: 'idle',
      enabled: true,
      lastRunAt: null,
      nextRunAt: null,
      averageDuration: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'gsa-auctions',
      source: 'GSA Auctions',
      cron: '30 1 * * *',
      status: 'idle',
      enabled: true,
      lastRunAt: null,
      nextRunAt: null,
      averageDuration: null,
      createdAt: now,
      updatedAt: now
    }
  );
  writeDb();
}

export function listIngestionJobs() {
  return [...getJobs()].sort((a, b) => a.source.localeCompare(b.source));
}

export function updateIngestionJob(id, updates, { actorId = 'system' } = {}) {
  const job = getJobs().find((row) => row.id === id);
  if (!job) return null;
  const before = { ...job };
  job.status = updates.status || job.status;
  job.enabled = updates.enabled ?? job.enabled;
  job.cron = updates.cron || job.cron;
  job.nextRunAt = updates.nextRunAt || job.nextRunAt;
  job.updatedAt = new Date().toISOString();
  writeDb();
  logAuditEvent({
    actorId,
    action: 'ingestion.job.updated',
    entityType: 'ingestion-job',
    entityId: id,
    before,
    after: { ...job }
  });
  return job;
}

export function recordIngestionRun(id, { success, itemCount, durationMs, notes }, { actorId = 'system' } = {}) {
  const job = getJobs().find((row) => row.id === id);
  if (!job) return null;
  const now = new Date().toISOString();
  job.lastRunAt = now;
  job.status = success ? 'idle' : 'error';
  job.updatedAt = now;
  if (durationMs) {
    job.averageDuration = job.averageDuration
      ? Math.round((job.averageDuration * 0.7) + durationMs * 0.3)
      : durationMs;
  }
  writeDb();
  logAuditEvent({
    actorId,
    action: 'ingestion.job.run',
    entityType: 'ingestion-job',
    entityId: id,
    after: { success, itemCount, durationMs, notes }
  });
  db.data.syncLog.unshift({
    id: crypto.randomUUID(),
    source: id,
    run_started_at: now,
    run_completed_at: now,
    success: success ? 1 : 0,
    item_count: itemCount || 0,
    notes: notes || null
  });
  if (db.data.syncLog.length > 2000) {
    db.data.syncLog.length = 2000;
  }
  writeDb();
  return job;
}
