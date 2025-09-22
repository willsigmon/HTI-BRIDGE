import 'dotenv/config';
import { sampleLeads, sampleCorporateTargets, sampleMilestones, sampleActivities } from './sample-data.js';
import { db, writeDb } from '../src/db.js';

function seed() {
  db.data.leads = sampleLeads.map((lead) => ({
    ...lead,
    createdAt: lead.date || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  db.data.corporateTargets = sampleCorporateTargets.map((target) => ({
    ...target,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  db.data.grantMilestones = sampleMilestones.map((milestone) => ({
    ...milestone,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  db.data.activities = sampleActivities.map((activity) => ({
    ...activity,
    createdAt: activity.timestamp || new Date().toISOString()
  }));
  db.data.syncLog = [];
  db.data.ingestCursor = {};
  writeDb();
  console.log('Seed complete.');
}

seed();
