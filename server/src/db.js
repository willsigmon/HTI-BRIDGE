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
  activities: [],
  syncLog: [],
  ingestCursor: {}
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
