import { db, writeDb } from '../db.js';

function getLogCollection() {
  return db.data.syncLog;
}

export function startSyncRun(source) {
  const run = {
    id: getLogCollection().length + 1,
    source,
    run_started_at: new Date().toISOString(),
    success: 0,
    item_count: 0,
    notes: null
  };
  getLogCollection().push(run);
  writeDb();
  return { id: run.id, runStartedAt: run.run_started_at };
}

export function finishSyncRun(id, { success, itemCount, notes }) {
  const run = getLogCollection().find((entry) => entry.id === id);
  if (!run) return;
  run.run_completed_at = new Date().toISOString();
  run.success = success ? 1 : 0;
  run.item_count = itemCount ?? 0;
  run.notes = notes;
  writeDb();
}

export function setCursor(source, cursor) {
  db.data.ingestCursor[source] = {
    cursor,
    updatedAt: new Date().toISOString()
  };
  writeDb();
}

export function getCursor(source) {
  return db.data.ingestCursor[source]?.cursor ?? null;
}

export function listSyncLog(limit = 50) {
  const entries = [...getLogCollection()];
  entries.sort((a, b) => new Date(b.run_started_at || 0) - new Date(a.run_started_at || 0));
  return entries.slice(0, limit);
}
