import crypto from 'node:crypto';
import { db, writeDb } from '../db.js';

function getCollection() {
  return db.data.activities;
}

export function listActivities(limit = 20) {
  const collection = [...getCollection()];
  collection.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  return collection.slice(0, limit);
}

export function addActivity({ text, type = 'note', timestamp = new Date().toISOString() }) {
  const record = {
    id: 'A' + crypto.randomInt(0, 999999999).toString().padStart(9, '0'),
    timestamp,
    text,
    type,
    createdAt: timestamp
  };
  getCollection().unshift(record);
  writeDb();
  return record;
}

export function addActivityIfNotExists({ text, type = 'note', timestamp = new Date().toISOString() }) {
  const existing = getCollection().find((activity) => activity.text === text && activity.type === type);
  if (existing) return existing.id;
  const activity = addActivity({ text, type, timestamp });
  return activity.id;
}
