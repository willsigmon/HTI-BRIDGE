import { db, writeDb } from '../db.js';

export function getGrantMetrics() {
  const metrics = db.data.grantMetrics || {};
  return {
    digitalLiteracyHours: normalizeDigitalLiteracy(metrics.digitalLiteracyHours)
  };
}

export function updateDigitalLiteracyHours({ completed, required } = {}) {
  if (!db.data.grantMetrics) {
    db.data.grantMetrics = {};
  }
  const record = normalizeDigitalLiteracy(db.data.grantMetrics.digitalLiteracyHours);
  const next = { ...record };
  if (typeof completed === 'number' && completed >= 0) {
    next.completed = completed;
  }
  if (typeof required === 'number' && required > 0) {
    next.required = required;
  }
  next.updatedAt = new Date().toISOString();
  db.data.grantMetrics.digitalLiteracyHours = next;
  writeDb();
  return next;
}

function normalizeDigitalLiteracy(value = {}) {
  const required = Number.isFinite(value.required) && value.required > 0 ? value.required : 170;
  const completed = Number.isFinite(value.completed) && value.completed >= 0 ? value.completed : 0;
  const updatedAt = value.updatedAt || null;
  return { required, completed, updatedAt };
}
