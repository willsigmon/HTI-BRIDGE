import { db, writeDb } from '../db.js';

const DEFAULT_SETTINGS = db.data.settings;

export function getSettings() {
  if (!db.data.settings) {
    db.data.settings = structuredClone(DEFAULT_SETTINGS);
    writeDb();
  }
  return db.data.settings;
}

export function updateSettings(patch = {}, { actorId = 'system' } = {}) {
  const current = getSettings();
  const merged = mergeSettings(current, patch);
  db.data.settings = merged;
  writeDb();
  return merged;
}

export function resetSettings() {
  db.data.settings = structuredClone(DEFAULT_SETTINGS);
  writeDb();
  return db.data.settings;
}

function mergeSettings(target, source) {
  if (!source || typeof source !== 'object') return target;
  const clone = structuredClone(target);
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      clone[key] = mergeSettings(clone[key] || {}, value);
    } else {
      clone[key] = value;
    }
  }
  return clone;
}

function structuredClone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
