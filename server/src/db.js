import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultPath = path.resolve(__dirname, '..', 'data', 'hti.json');
const configuredPath = process.env.HTI_DB_PATH
  ? path.resolve(process.cwd(), process.env.HTI_DB_PATH)
  : defaultPath;
const DB_PATH = configuredPath;

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
  settings: {
    personas: {
      enabled: {
        'Corporate IT Partner': true,
        'Tech Refresh Donor': true,
        'Government Surplus': true,
        'Government Procurement': true,
        'Healthcare System': true,
        'Education Partner': true,
        'Logistics Hotshot': true
      },
      weights: {
        'Corporate IT Partner': 1,
        'Tech Refresh Donor': 1,
        'Government Surplus': 1,
        'Government Procurement': 1,
        'Healthcare System': 1,
        'Education Partner': 1,
        'Logistics Hotshot': 1
      }
    },
    assignment: {
      defaultOwnerId: 'hti-outreach'
    },
    preferences: {
      enableMap: true,
      enableAutomations: true
    }
  }
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
