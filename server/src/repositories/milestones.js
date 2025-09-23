import { db, writeDb } from '../db.js';

function getCollection() {
  return db.data.grantMilestones;
}

export function listMilestones() {
  const collection = [...getCollection()];
  collection.sort((a, b) => new Date(a.dueDate || a.due_date || 0) - new Date(b.dueDate || b.due_date || 0));
  return collection.map((milestone) => ({
    ...milestone,
    dueDate: milestone.dueDate || milestone.due_date,
    matchedKeywords: Array.isArray(milestone.matchedKeywords)
      ? milestone.matchedKeywords
      : milestone.matchedKeyword
        ? [milestone.matchedKeyword].filter(Boolean)
        : [],
    url: milestone.url || null,
    source: milestone.source || 'Grants.gov'
  }));
}

export function upsertMilestones(milestones) {
  if (!Array.isArray(milestones) || !milestones.length) return;
  const collection = getCollection();
  const map = new Map(collection.map((m) => [m.id, m]));
  const now = new Date().toISOString();
  const statusRank = {
    Completed: 4,
    'In Progress': 3,
    Overdue: 3,
    Upcoming: 2,
    Planned: 1
  };

  for (const milestone of milestones) {
    const existing = map.get(milestone.id);
    const incomingKeywords = Array.isArray(milestone.matchedKeywords)
      ? milestone.matchedKeywords.filter(Boolean)
      : milestone.matchedKeyword
        ? [milestone.matchedKeyword].filter(Boolean)
        : [];
    const existingKeywords = Array.isArray(existing?.matchedKeywords)
      ? existing.matchedKeywords.filter(Boolean)
      : [];
    const keywordSet = new Set([...existingKeywords, ...incomingKeywords]);

    const incomingStatus = milestone.status;
    const existingStatus = existing?.status;
    const resolvedStatus = resolveStatus(existingStatus, incomingStatus, statusRank);

    const record = {
      id: milestone.id,
      title: milestone.title,
      dueDate: milestone.dueDate,
      status: resolvedStatus,
      description: milestone.description,
      priority: milestone.priority,
      url: milestone.url,
      matchedKeywords: Array.from(keywordSet),
      source: milestone.source || existing?.source || 'Grants.gov',
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    if (existing) {
      Object.assign(existing, record);
    } else {
      collection.push(record);
      map.set(record.id, record);
    }
  }

  writeDb();
}

function resolveStatus(existingStatus, incomingStatus, rankMap) {
  if (!incomingStatus && existingStatus) return existingStatus;
  if (!existingStatus) return incomingStatus;

  const incomingRank = rankMap[incomingStatus] ?? 0;
  const existingRank = rankMap[existingStatus] ?? 0;

  if (incomingRank >= existingRank) {
    return incomingStatus;
  }
  return existingStatus;
}

export function summarizeMilestones() {
  const summary = {};
  for (const milestone of getCollection()) {
    summary[milestone.status] = (summary[milestone.status] || 0) + 1;
  }
  return summary;
}

export function autoCloseExpiredMilestones({ idPrefix = null } = {}) {
  const collection = getCollection();
  const prefix = typeof idPrefix === 'string' && idPrefix.length ? idPrefix : null;
  const todayIso = new Date().toISOString().split('T')[0];
  const todayMidnight = new Date(`${todayIso}T00:00:00Z`).getTime();
  let updates = 0;

  for (const milestone of collection) {
    if (prefix && !String(milestone.id || '').startsWith(prefix)) continue;
    if (milestone.status === 'Completed') continue;
    const due = milestone.dueDate || milestone.due_date;
    if (!due) continue;
    const parsed = new Date(`${due}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) continue;
    if (parsed.getTime() < todayMidnight) {
      milestone.status = 'Completed';
      milestone.updatedAt = new Date().toISOString();
      updates += 1;
    }
  }

  if (updates > 0) {
    writeDb();
  }

  return updates;
}
