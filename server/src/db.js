import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';

import { createDefaultSettings } from '../../shared/config/statusPersonas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoSnapshotPath = path.resolve(__dirname, '..', 'data', 'hti.json');
const prefersTmpStorage = Boolean((process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) && !process.env.HTI_DB_PATH);
const tmpPath = path.join('/tmp', 'hti-bridge-db.json');
const resolvedPath = process.env.HTI_DB_PATH
  ? path.resolve(process.cwd(), process.env.HTI_DB_PATH)
  : prefersTmpStorage
    ? tmpPath
    : repoSnapshotPath;

if (prefersTmpStorage && !fs.existsSync(tmpPath)) {
  try {
    const tmpDir = path.dirname(tmpPath);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    if (fs.existsSync(repoSnapshotPath)) {
      fs.copyFileSync(repoSnapshotPath, tmpPath);
    }
  } catch (error) {
    console.warn('Unable to prime tmp database path, falling back to repo snapshot.', error);
  }
}

const DB_PATH = resolvedPath;

const defaultData = {
  leads: [],
  corporateTargets: [],
  grantMilestones: [],
  grantMetrics: {
    digitalLiteracyHours: {
      required: 170,
      completed: 0,
      updatedAt: null
    }
  },
  activities: [],
  syncLog: [],
  ingestCursor: {},
  contacts: [],
  organizations: [],
  households: [],
  pipelines: [],
  pipelineStages: [],
  leadAssignments: [],
  automations: [],
  automationExecutions: [],
  workspaces: [],
  users: [],
  auditLog: [],
  ingestionJobs: [],
  apiKeys: [],
  intakeForms: [],
  connectors: [],
  interactionEvents: [],
  calendarEvents: [],
  tasks: [],
  notificationLog: [],
  settings: createDefaultSettings()
};

function initDatabase() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const adapter = new JSONFileSync(DB_PATH);
  const db = new LowSync(adapter, defaultData);
  db.read();
  if (!db.data) {
    db.data = structuredClone(defaultData);
    db.write();
  }
  return db;
}

export const db = initDatabase();

export function writeDb() {
  db.write();
}

function structuredClone(value) {
  return JSON.parse(JSON.stringify(value));
}
