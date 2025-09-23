import 'dotenv/config';
import fetch from 'node-fetch';
import { upsertMultiple as upsertLeads } from '../src/repositories/leads.js';
import { bulkUpsertCorporateTargets } from '../src/repositories/corporateTargets.js';
import { startSyncRun, finishSyncRun } from '../src/repositories/sync.js';
import { mapAwardToLead, mapAwardToCorporateTarget } from './lib/usaspending-utils.js';

const SOURCE = 'usaspending-awards';
const KEYWORDS = parseList(process.env.HTI_USA_KEYWORDS, [
  'information technology',
  'computer',
  'digital equity',
  'broadband'
]);
const AWARD_TYPE_CODES = parseList(process.env.HTI_USA_AWARD_TYPES, ['A', 'B', 'C', 'D']);
const LIMIT = Number(process.env.HTI_USA_LIMIT || 25);
const PAGES = Number(process.env.HTI_USA_PAGES || 2);
const START_DATE = process.env.HTI_USA_START_DATE || '2023-10-01';
const END_DATE = process.env.HTI_USA_END_DATE || new Date().toISOString().slice(0, 10);
const REQUEST_TIMEOUT_MS = Number(process.env.HTI_USA_TIMEOUT || 20000);

function parseList(value, fallback = []) {
  if (!value) return [...fallback];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

async function run() {
  const syncRun = startSyncRun(SOURCE);
  try {
    const leads = [];
    const targets = [];
    let totalFetched = 0;

    for (let page = 1; page <= PAGES; page += 1) {
      const payload = buildRequestPayload(page);
      const response = await fetchWithTimeout('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'hti-newdash-usaspending/0.1 (contact: engineering@hubzonetech.org)'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`USAspending request failed ${response.status}: ${text.slice(0, 160)}`);
      }

      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      if (!results.length) {
        break;
      }

      totalFetched += results.length;
      results.forEach((award) => {
        const lead = mapAwardToLead(award);
        if (lead) {
          leads.push(lead);
        }
        const target = mapAwardToCorporateTarget(award);
        if (target) {
          targets.push(target);
        }
      });

      await sleep(1000);
    }

    if (leads.length) {
      upsertLeads(leads);
    }
    if (targets.length) {
      bulkUpsertCorporateTargets(targets);
    }

    finishSyncRun(syncRun.id, {
      success: true,
      itemCount: leads.length,
      notes: `Synced ${leads.length} leads (${targets.length} corporate targets) from USAspending across ${Math.min(PAGES, Math.ceil(totalFetched / LIMIT) || 0)} pages.`
    });

    console.log(`USAspending ingestion complete: ${leads.length} leads, ${targets.length} targets.`);
  } catch (error) {
    finishSyncRun(syncRun.id, {
      success: false,
      itemCount: 0,
      notes: error.message
    });
    console.error('USAspending ingestion failed:', error);
    process.exitCode = 1;
  }
}

function buildRequestPayload(page) {
  return {
    limit: LIMIT,
    page,
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Awarding Agency',
      'Period of Performance Start Date',
      'Period of Performance Current End Date',
      'Description',
      'CFDA Number'
    ],
    filters: {
      keywords: KEYWORDS,
      award_type_codes: AWARD_TYPE_CODES,
      time_period: [
        {
          start_date: START_DATE,
          end_date: END_DATE
        }
      ]
    },
    sort: 'Award Amount',
    order: 'desc'
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error(`USAspending request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

run();
