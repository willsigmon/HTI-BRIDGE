import 'dotenv/config';
import fetch from 'node-fetch';

const DEFAULT_BASE = 'http://localhost:4000/api';
const baseUrl = (process.env.HTI_SMOKE_API || process.env.HTI_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
const bootstrapUrl = `${baseUrl}/bootstrap`;
const userId = process.env.HTI_SMOKE_USER || 'hti-admin';
const timeoutMs = Number(process.env.HTI_SMOKE_TIMEOUT || 10000);

async function main() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(bootstrapUrl, {
      headers: { 'x-user-id': userId },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const body = await safeReadJson(response);
      throw new Error(
        `Bootstrap failed ${response.status}: ${body?.error || body?.message || 'no message'}`
      );
    }

    const payload = await response.json();
    printSummary(payload);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`Request timed out after ${timeoutMs}ms => ${bootstrapUrl}`);
      process.exitCode = 1;
      return;
    }
    console.error('Smoke check failed:', error.message);
    if (error.stack) {
      console.error(error.stack.split('\n').slice(1).join('\n'));
    }
    process.exitCode = 1;
  }
}

function printSummary(data = {}) {
  const leads = Array.isArray(data.leads) ? data.leads : [];
  const activities = Array.isArray(data.activities) ? data.activities : [];
  const pipelines = Array.isArray(data.pipelines) ? data.pipelines : [];
  const ingestion = Array.isArray(data.ingestionJobs) ? data.ingestionJobs : [];
  const personas = data.settings?.personas?.enabled || {};

  console.log('✅ Bootstrap reachable:', bootstrapUrl);
  console.log(`→ Leads: ${leads.length}`);
  console.log(`→ Pipelines: ${pipelines.length}`);
  console.log(`→ Recent activities: ${activities.length}`);
  console.log(`→ Persona toggles enabled: ${countEnabled(personas)}`);

  if (leads.length) {
    const top = [...leads]
      .filter((lead) => lead.priority != null)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 5);
    console.log('\nTop leads by priority:');
    top.forEach((lead, index) => {
      console.log(
        `  ${index + 1}. ${lead.title} › ${lead.company || 'Unknown'} (priority ${lead.priority})`
      );
    });
  }

  if (ingestion.length) {
    console.log('\nIngestion jobs:');
    ingestion.forEach((job) => {
      const status = job.enabled === false ? 'paused' : 'active';
      const recent = job.lastRunAt ? new Date(job.lastRunAt).toISOString() : 'never';
      console.log(`  • ${job.id || job.name} (${status}) last run ${recent}`);
    });
  }
}

function countEnabled(map) {
  return Object.values(map).filter((value) => value !== false).length;
}

async function safeReadJson(response) {
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

main();
