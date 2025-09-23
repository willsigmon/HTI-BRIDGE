import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { upsertMultiple } from '../src/repositories/leads.js';
import { db, writeDb } from '../src/db.js';
import { listTasks } from '../src/repositories/automations.js';

let snapshot;

beforeEach(() => {
  snapshot = JSON.parse(JSON.stringify(db.data.leads));
  db.data.leads = [];
  db.data.tasks = [];
  db.data.notificationLog = [];
});

afterEach(() => {
  db.data.leads = snapshot;
  db.data.tasks = [];
  db.data.notificationLog = [];
  writeDb();
});

test('automated scoring produces high priority and logistics tags', async () => {
  upsertMultiple([
    {
      id: 'AUTO-PRIORITY-1',
      title: 'National CSR Refresh',
      company: 'OptiCore Analytics',
      source: 'Corporate Refresh Monitor',
      estimatedQuantity: 600,
      timeline: 'Urgent relocation',
      notes: 'Digital literacy alignment with grant counties.',
      logistics: { onsitePickup: true, freightFriendly: true }
    }
  ]);

  const lead = db.data.leads.find((item) => item.id === 'AUTO-PRIORITY-1');
  assert.ok(lead, 'lead should be inserted');
  assert.ok(lead.priority >= 80, 'priority should be scored high');
  assert.equal(lead.priorityLabel, 'High');
  assert.ok(lead.personaTags.includes('onsite-pickup'));
  assert.ok(lead.personaTags.includes('freight-friendly'));

  const tasks = listTasks({ status: 'open' });
  const task = tasks.find((row) => row.leadId === 'AUTO-PRIORITY-1');
  assert.ok(task, 'automation should create follow-up task');

  await delay(10);
  const logEntry = db.data.notificationLog.find((entry) => entry.leadId === 'AUTO-PRIORITY-1');
  assert.ok(logEntry, 'notification log should record lead summary');
});

test('persona owner mapping assigns default owners', () => {
  upsertMultiple([
    {
      id: 'AUTO-OWNER-1',
      title: 'Healthcare refresh',
      company: 'Blue Harbor Health Alliance',
      source: 'Corporate Refresh Monitor',
      estimatedQuantity: 300,
      persona: 'Healthcare System'
    }
  ]);

  const lead = db.data.leads.find((item) => item.id === 'AUTO-OWNER-1');
  assert.ok(lead);
  assert.equal(lead.ownerId, 'hti-fellow');
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
