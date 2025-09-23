import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, test } from 'node:test';
import supertest from 'supertest';

process.env.NODE_ENV = 'test';
process.env.HTI_REQUIRE_AUTH = 'false';

const tmpDir = path.join(os.tmpdir(), 'hti-newdash-tests');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}
const testDbPath = path.join(tmpDir, `hti-db-${process.pid}.json`);
process.env.HTI_DB_PATH = testDbPath;

const { default: app } = await import('../src/server.js');
const { db, writeDb } = await import('../src/db.js');
const { bootstrapSecurity } = await import('../src/repositories/security.js');
const { ensureDefaultPipelines } = await import('../src/repositories/pipelines.js');
const { ensureDefaultJobs } = await import('../src/repositories/admin.js');
const { createLead } = await import('../src/repositories/leads.js');
const { upsertCorporateTarget } = await import('../src/repositories/corporateTargets.js');
const { addActivity } = await import('../src/repositories/activities.js');
const { resetSettings } = await import('../src/repositories/settings.js');
const {
  sampleLeads,
  sampleCorporateTargets,
  sampleMilestones,
  sampleActivities,
  sampleGrantMetrics
} = await import('../scripts/sample-data.js');

const request = supertest(app);

beforeEach(() => {
  seedDatabase();
});

test('GET /api/bootstrap provides aggregated CRM payload', async () => {
  const response = await request.get('/api/bootstrap').set('x-user-id', 'hti-admin').expect(200);
  const body = response.body;
  assert.ok(Array.isArray(body.leads) && body.leads.length === sampleLeads.length, 'should return seeded leads');
  assert.ok(Array.isArray(body.activities) && body.activities.length === sampleActivities.length, 'should include activity timeline');
  assert.ok(body.settings?.personas, 'should include persona settings snapshot');
  const lead = body.leads.find((item) => item.id === 'L001');
  assert.equal(lead?.persona, 'Tech Refresh Donor');
  assert.ok(Array.isArray(body.pipelines) && body.pipelines.length > 0, 'should include pipelines');
});

test('GET /api/leads filters by persona bucket', async () => {
  const response = await request
    .get('/api/leads')
    .set('x-user-id', 'hti-admin')
    .query({ persona: 'Healthcare System' })
    .expect(200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, 'L002');
  assert.equal(response.body[0].persona, 'Healthcare System');
});

test('GET /api/security/api-keys denies contributor access', async () => {
  const response = await request.get('/api/security/api-keys').set('x-user-id', 'hti-fellow').expect(403);
  assert.equal(response.body.error, 'forbidden');
  assert.match(response.body.message, /Missing permission: security:manage/);
});

test('GET /api/bootstrap requires sign-in when HTI_REQUIRE_AUTH is true', async () => {
  const original = process.env.HTI_REQUIRE_AUTH;
  process.env.HTI_REQUIRE_AUTH = 'true';
  try {
    const response = await request.get('/api/bootstrap').expect(401);
    assert.equal(response.body.error, 'signin-required');
    assert.match(response.body.message, /Sign in/);
  } finally {
    process.env.HTI_REQUIRE_AUTH = original || 'false';
  }
});

function seedDatabase() {
  resetCollections();
  bootstrapSecurity();
  ensureDefaultPipelines();
  ensureDefaultJobs();
  resetSettings();

  const workspaceId = db.data.workspaces[0]?.id || null;
  const pipelineId = db.data.pipelines[0]?.id || null;
  const timestamp = new Date().toISOString();

  db.data.grantMilestones = sampleMilestones.map((milestone) => ({
    ...milestone,
    createdAt: timestamp,
    updatedAt: timestamp
  }));

  db.data.grantMetrics = {
    digitalLiteracyHours: {
      required: sampleGrantMetrics.digitalLiteracyHours.required,
      completed: sampleGrantMetrics.digitalLiteracyHours.completed,
      updatedAt: timestamp
    }
  };

  sampleCorporateTargets.forEach((target) => {
    upsertCorporateTarget(target);
  });

  sampleLeads.forEach((lead) => {
    createLead(
      {
        ...lead,
        workspaceId,
        pipelineId
      },
      { actorId: 'test-suite' }
    );
  });

  db.data.activities = [];
  sampleActivities.forEach((activity) => {
    addActivity(activity);
  });

  writeDb();
}

function resetCollections() {
  db.data.leads = [];
  db.data.corporateTargets = [];
  db.data.grantMilestones = [];
  db.data.grantMetrics = {
    digitalLiteracyHours: {
      required: 170,
      completed: 0,
      updatedAt: null
    }
  };
  db.data.activities = [];
  db.data.syncLog = [];
  db.data.ingestCursor = {};
  db.data.contacts = [];
  db.data.organizations = [];
  db.data.households = [];
  db.data.pipelines = [];
  db.data.pipelineStages = [];
  db.data.leadAssignments = [];
  db.data.automations = [];
  db.data.automationExecutions = [];
  db.data.workspaces = [];
  db.data.users = [];
  db.data.auditLog = [];
  db.data.ingestionJobs = [];
  db.data.apiKeys = [];
  db.data.intakeForms = [];
  db.data.connectors = [];
  db.data.interactionEvents = [];
  db.data.calendarEvents = [];
  db.data.tasks = [];
  db.data.notificationLog = [];
  delete db.data.settings;
  writeDb();
}
