import 'dotenv/config';
import { sampleLeads, sampleCorporateTargets, sampleMilestones, sampleActivities } from './sample-data.js';
import { db, writeDb } from '../src/db.js';
import { bootstrapSecurity } from '../src/repositories/security.js';
import { ensureDefaultPipelines } from '../src/repositories/pipelines.js';
import { ensureDefaultJobs } from '../src/repositories/admin.js';
import { createLead } from '../src/repositories/leads.js';
import { upsertCorporateTarget } from '../src/repositories/corporateTargets.js';
import { addActivity } from '../src/repositories/activities.js';
import { resetSettings } from '../src/repositories/settings.js';

function resetData() {
  db.data.leads = [];
  db.data.corporateTargets = [];
  db.data.grantMilestones = [];
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
}

function seed() {
  resetData();
  bootstrapSecurity();
  ensureDefaultPipelines();
  ensureDefaultJobs();
  resetSettings();

  sampleCorporateTargets.forEach((target) => {
    upsertCorporateTarget(target);
  });

  const now = new Date().toISOString();
  db.data.grantMilestones = sampleMilestones.map((milestone) => ({
    ...milestone,
    createdAt: now,
    updatedAt: now
  }));

  sampleLeads.forEach((lead) => {
    createLead(
      {
        ...lead,
        workspaceId: db.data.workspaces[0]?.id,
        pipelineId: db.data.pipelines[0]?.id
      },
      { actorId: 'seed-script' }
    );
  });

  sampleActivities.forEach((activity) => {
    addActivity(activity);
  });

  writeDb();
  console.log('Seed complete.');
}

seed();
