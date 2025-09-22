import { db, writeDb } from '../db.js';

function getCollection() {
  return db.data.grantMilestones;
}

export function listMilestones() {
  const collection = [...getCollection()];
  collection.sort((a, b) => new Date(a.dueDate || a.due_date || 0) - new Date(b.dueDate || b.due_date || 0));
  return collection.map((milestone) => ({
    ...milestone,
    dueDate: milestone.dueDate || milestone.due_date
  }));
}

export function upsertMilestones(milestones) {
  if (!Array.isArray(milestones) || !milestones.length) return;
  const collection = getCollection();
  const map = new Map(collection.map((m) => [m.id, m]));
  const now = new Date().toISOString();

  for (const milestone of milestones) {
    const existing = map.get(milestone.id);
    const record = {
      id: milestone.id,
      title: milestone.title,
      dueDate: milestone.dueDate,
      status: milestone.status,
      description: milestone.description,
      priority: milestone.priority,
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

export function summarizeMilestones() {
  const summary = {};
  for (const milestone of getCollection()) {
    summary[milestone.status] = (summary[milestone.status] || 0) + 1;
  }
  return summary;
}
