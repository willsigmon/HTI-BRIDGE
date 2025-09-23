import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';

if (!process.env.HTI_DB_PATH) {
  const tmpDir = path.join(os.tmpdir(), 'hti-newdash-grants-tests');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  process.env.HTI_DB_PATH = path.join(tmpDir, `hti-db-${process.pid}.json`);
}

const { createMilestoneFromOpportunity, parseKeywordList, buildMilestoneId } =
  await import('../scripts/lib/grants-utils.js');
const { autoCloseExpiredMilestones, upsertMilestones } = await import('../src/repositories/milestones.js');
const { db, writeDb } = await import('../src/db.js');

const ISO_NOW = new Date().toISOString();
let snapshot;

beforeEach(() => {
  snapshot = JSON.parse(JSON.stringify(db.data.grantMilestones));
});

afterEach(() => {
  db.data.grantMilestones = snapshot;
  writeDb();
});

test('parseKeywordList handles pipes and commas with trimming', () => {
  const input = 'digital equity| broadband adoption, device donation , '; // trailing whitespace
  const keywords = parseKeywordList(input);
  assert.deepEqual(keywords, ['digital equity', 'broadband adoption', 'device donation']);
});

test('createMilestoneFromOpportunity maps Grants.gov payload to milestone record', () => {
  const opportunity = {
    id: '12345',
    number: 'DE-FOA-0001',
    title: 'Community Digital Equity Pilot',
    agency: 'Department of Energy',
    cfdaList: ['81.086'],
    openDate: '01/15/2025',
    closeDate: '09/30/2030',
    oppStatus: 'posted'
  };

  const milestone = createMilestoneFromOpportunity(opportunity, { keyword: 'digital equity' });

  assert.equal(milestone.id, 'GRANTSGOV-DE-FOA-0001');
  assert.equal(milestone.dueDate, '2030-09-30');
  assert.equal(milestone.status, 'Upcoming');
  assert.equal(milestone.priority, 'Low');
  assert.equal(milestone.url, 'https://www.grants.gov/web/grants/view-opportunity.html?oppId=12345');
  assert.deepEqual(milestone.matchedKeywords, ['digital equity']);
  assert.equal(milestone.source, 'Grants.gov');
  assert.ok(milestone.description.includes('Department of Energy'));
  assert.ok(milestone.description.includes('CFDA: 81.086'));
});

test('createMilestoneFromOpportunity auto-completes past opportunities', () => {
  const opportunity = {
    id: '987',
    number: 'OLD-GRANT',
    title: 'Legacy Device Donation',
    agency: 'General Services Administration',
    closeDate: '01/15/2010',
    oppStatus: 'posted'
  };

  const milestone = createMilestoneFromOpportunity(opportunity);
  assert.equal(milestone.status, 'Completed');
  assert.equal(milestone.priority, 'High');
  assert.equal(milestone.dueDate, '2010-01-15');
  assert.deepEqual(milestone.matchedKeywords, []);
});

test('autoCloseExpiredMilestones only updates Grants.gov records past due', () => {
  db.data.grantMilestones = [
    {
      id: 'GRANTSGOV-PAST',
      title: 'Expired Posting',
      dueDate: '2020-06-01',
      status: 'Upcoming',
      description: 'Agency: Test',
      priority: 'High',
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
      matchedKeywords: ['digital equity']
    },
    {
      id: 'LOCAL-M001',
      title: 'Local Compliance Check',
      dueDate: '2020-06-01',
      status: 'Upcoming',
      description: 'Internal milestone',
      priority: 'High',
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
      matchedKeywords: []
    }
  ];

  const updated = autoCloseExpiredMilestones({ idPrefix: 'GRANTSGOV-' });

  assert.equal(updated, 1);
  const [grantsMilestone, localMilestone] = db.data.grantMilestones;
  assert.equal(grantsMilestone.status, 'Completed');
  assert.equal(localMilestone.status, 'Upcoming');
});

test('buildMilestoneId falls back to opportunity ID when number missing', () => {
  const opportunity = { id: '456789', title: 'Broadband Planning Grant' };
  const id = buildMilestoneId(opportunity);
  assert.equal(id, 'GRANTSGOV-456789');
});

test('upsertMilestones merges keyword matches and preserves URLs', () => {
  db.data.grantMilestones = [];

  upsertMilestones([
    {
      id: 'GRANTSGOV-ABC123',
      title: 'Digital Equity Pilot',
      dueDate: '2025-11-01',
      status: 'Upcoming',
      description: 'Agency: NSF',
      priority: 'High',
      url: 'https://www.grants.gov/web/grants/view-opportunity.html?oppId=111',
      matchedKeywords: ['digital equity'],
      source: 'Grants.gov'
    }
  ]);

  upsertMilestones([
    {
      id: 'GRANTSGOV-ABC123',
      title: 'Digital Equity Pilot',
      dueDate: '2025-11-01',
      status: 'In Progress',
      description: 'Agency: NSF',
      priority: 'High',
      url: 'https://www.grants.gov/web/grants/view-opportunity.html?oppId=111',
      matchedKeywords: ['device donation'],
      source: 'Grants.gov'
    }
  ]);

  const [record] = db.data.grantMilestones;
  assert.equal(record.url, 'https://www.grants.gov/web/grants/view-opportunity.html?oppId=111');
  assert.deepEqual(record.matchedKeywords.sort(), ['device donation', 'digital equity']);
  assert.equal(record.status, 'In Progress');
});

test('upsertMilestones preserves advanced status when ingest regresses', () => {
  const id = 'GRANTSGOV-KEEP-STATUS';
  db.data.grantMilestones = [
    {
      id,
      title: 'Manual Progress Milestone',
      dueDate: '2025-06-01',
      status: 'In Progress',
      description: 'Tracked internally',
      priority: 'High',
      matchedKeywords: ['digital equity'],
      url: 'https://www.grants.gov/web/grants/view-opportunity.html?oppId=999',
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW
    }
  ];

  upsertMilestones([
    {
      id,
      title: 'Manual Progress Milestone',
      dueDate: '2025-06-01',
      status: 'Upcoming',
      description: 'Tracked internally',
      priority: 'High',
      matchedKeywords: ['device donation'],
      url: 'https://www.grants.gov/web/grants/view-opportunity.html?oppId=999'
    }
  ]);

  const [record] = db.data.grantMilestones;
  assert.equal(record.status, 'In Progress');
  assert.deepEqual(record.matchedKeywords.sort(), ['device donation', 'digital equity']);
});
