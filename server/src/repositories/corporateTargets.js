import { db, writeDb } from '../db.js';

function getCollection() {
  return db.data.corporateTargets;
}

function rowToTarget(row) {
  if (!row) return null;
  return { ...row };
}

export function listCorporateTargets({ priority } = {}) {
  let collection = [...getCollection()];
  if (priority && priority !== 'all') {
    collection = collection.filter((target) => target.priority === priority);
  }
  collection.sort((a, b) => (a.company || '').localeCompare(b.company || '', undefined, { sensitivity: 'base' }));
  return collection;
}

export function getCorporateTarget(company) {
  return rowToTarget(getCollection().find((target) => target.company === company));
}

export function upsertCorporateTarget(payload) {
  const collection = getCollection();
  const now = new Date().toISOString();
  const index = collection.findIndex((target) => target.company === payload.company);
  const record = {
    company: payload.company,
    location: payload.location,
    type: payload.type,
    employees: payload.employees,
    status: payload.status || 'Research',
    priority: payload.priority || 'Medium',
    focus: payload.focus,
    notes: payload.notes,
    createdAt: index === -1 ? now : collection[index].createdAt,
    updatedAt: now
  };

  if (index === -1) {
    collection.push(record);
  } else {
    collection[index] = record;
  }

  writeDb();
  return record;
}

export function countHighPriorityTargets() {
  return getCollection().filter((target) => target.priority === 'High').length;
}

export function bulkUpsertCorporateTargets(targets = []) {
  if (!Array.isArray(targets) || !targets.length) return;
  const collection = getCollection();
  const map = new Map(collection.map((target) => [target.company, target]));
  const now = new Date().toISOString();

  for (const target of targets) {
    if (!target.company) continue;
    const existing = map.get(target.company);
    const record = {
      company: target.company,
      location: target.location,
      type: target.type,
      employees: target.employees,
      status: target.status || existing?.status || 'Research',
      priority: target.priority || existing?.priority || 'Medium',
      focus: target.focus || existing?.focus,
      notes: target.notes || existing?.notes,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    if (existing) {
      Object.assign(existing, record);
    } else {
      collection.push(record);
      map.set(record.company, record);
    }
  }

  writeDb();
}
