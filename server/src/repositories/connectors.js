import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';
import * as ical from 'node-ical';
import { db, writeDb } from '../db.js';
import { logAuditEvent } from './audit.js';

function getConnectors() {
  return db.data.connectors;
}

function getInteractionEvents() {
  return db.data.interactionEvents;
}

function getCalendarEvents() {
  return db.data.calendarEvents;
}

function ensureWorkspaceId(inputWorkspaceId) {
  const workspaces = db.data.workspaces;
  if (inputWorkspaceId && workspaces.some((ws) => ws.id === inputWorkspaceId)) {
    return inputWorkspaceId;
  }
  return workspaces.length ? workspaces[0].id : null;
}

export function listConnectors({ workspaceId } = {}) {
  let connectors = [...getConnectors()];
  if (workspaceId) {
    connectors = connectors.filter((connector) => connector.workspaceId === workspaceId);
  }
  connectors.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return connectors;
}

export function registerConnector(payload, { actorId = 'system' } = {}) {
  const connectors = getConnectors();
  const now = new Date().toISOString();
  const connector = {
    id: crypto.randomUUID(),
    type: payload.type,
    name: payload.name,
    status: payload.status || 'connected',
    workspaceId: ensureWorkspaceId(payload.workspaceId),
    settings: payload.settings || {},
    lastSyncAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: actorId
  };
  connectors.push(connector);
  writeDb();
  logAuditEvent({
    actorId,
    action: 'connector.registered',
    entityType: 'connector',
    entityId: connector.id,
    after: { type: connector.type, name: connector.name }
  });
  return connector;
}

export function updateConnector(id, updates, { actorId = 'system' } = {}) {
  const connector = getConnectors().find((row) => row.id === id);
  if (!connector) return null;
  const before = { ...connector };
  connector.status = updates.status || connector.status;
  connector.settings = { ...connector.settings, ...(updates.settings || {}) };
  connector.lastSyncAt = updates.lastSyncAt || connector.lastSyncAt;
  connector.updatedAt = new Date().toISOString();
  writeDb();
  logAuditEvent({
    actorId,
    action: 'connector.updated',
    entityType: 'connector',
    entityId: id,
    before,
    after: { ...connector }
  });
  return connector;
}

export function ingestCsvInteractions({ csvContent, mapping = {}, workspaceId, source = 'csv-upload' }, { actorId = 'system' } = {}) {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });
  const interactions = [];
  for (const record of records) {
    const interaction = normalizeInteractionRecord(record, mapping, workspaceId, source);
    if (interaction) {
      getInteractionEvents().push(interaction);
      interactions.push(interaction);
    }
  }
  writeDb();
  logAuditEvent({
    actorId,
    action: 'connector.ingest.csv',
    entityType: 'connector',
    entityId: source,
    after: { count: interactions.length }
  });
  return interactions;
}

export function ingestIcsCalendar({ icsContent, workspaceId, source = 'calendar-upload' }, { actorId = 'system' } = {}) {
  const parsed = ical.parseICS(icsContent);
  const events = [];
  for (const key of Object.keys(parsed)) {
    const entry = parsed[key];
    if (!entry || entry.type !== 'VEVENT') continue;
    const event = {
      id: crypto.randomUUID(),
      source,
      externalId: entry.uid || key,
      summary: entry.summary || 'Untitled Meeting',
      leadId: null,
      startAt: entry.start?.toISOString?.() || new Date(entry.start).toISOString(),
      endAt: entry.end?.toISOString?.() || new Date(entry.end || entry.start).toISOString(),
      location: entry.location || null,
      attendees: Array.isArray(entry.attendee)
        ? entry.attendee.map((attendee) => (typeof attendee === 'string' ? attendee : attendee?.val))
        : [],
      workspaceId: ensureWorkspaceId(workspaceId),
      createdAt: new Date().toISOString()
    };
    getCalendarEvents().push(event);
    events.push(event);
  }
  writeDb();
  logAuditEvent({
    actorId,
    action: 'connector.ingest.ics',
    entityType: 'connector',
    entityId: source,
    after: { count: events.length }
  });
  return events;
}

export function listInteractionEvents({ leadId, limit = 100 } = {}) {
  let events = [...getInteractionEvents()];
  if (leadId) {
    events = events.filter((event) => event.leadId === leadId);
  }
  events.sort((a, b) => (b.occurredAt || '').localeCompare(a.occurredAt || ''));
  return events.slice(0, limit);
}

function normalizeInteractionRecord(record, mapping, workspaceId, source) {
  const leadId = record[mapping.leadId || 'Lead ID'] || null;
  const occurredAt = record[mapping.occurredAt || 'Date'] || new Date().toISOString();
  const summary = record[mapping.summary || 'Summary'] || record[mapping.subject || 'Subject'];
  if (!summary) return null;
  return {
    id: crypto.randomUUID(),
    leadId,
    entityId: record[mapping.entityId || 'Contact ID'] || null,
    type: (record[mapping.type || 'Type'] || 'note').toLowerCase(),
    direction: record[mapping.direction || 'Direction'] || 'outbound',
    occurredAt,
    summary,
    metadata: record,
    source,
    workspaceId: ensureWorkspaceId(workspaceId),
    createdAt: new Date().toISOString()
  };
}
