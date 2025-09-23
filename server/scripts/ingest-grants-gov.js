import 'dotenv/config';
import fetch from 'node-fetch';

import { upsertMilestones, autoCloseExpiredMilestones } from '../src/repositories/milestones.js';
import { startSyncRun, finishSyncRun } from '../src/repositories/sync.js';
import {
  createMilestoneFromOpportunity,
  parseKeywordList,
  GRANT_ID_PREFIX
} from './lib/grants-utils.js';

const SOURCE = 'grants-gov';
const ENDPOINT = process.env.HTI_GRANTS_ENDPOINT || 'https://api.grants.gov/v1/api/search2';
const KEYWORDS = parseKeywordList(process.env.HTI_GRANTS_KEYWORDS);
const MAX_RESULTS_PER_KEYWORD = Number(process.env.HTI_GRANTS_MAX_RESULTS || 40);
const ROWS_PER_PAGE = Math.min(Number(process.env.HTI_GRANTS_PAGE_SIZE) || 20, 100);
const OPP_STATUSES = process.env.HTI_GRANTS_STATUSES || 'forecasted|posted';
const SORT_BY = process.env.HTI_GRANTS_SORT_BY || 'closeDate|asc';
const USER_AGENT =
  process.env.HTI_GRANTS_USER_AGENT || 'hti-newdash-grants-ingestor/0.1 (contact: engineering@hubzonetech.org)';

async function run() {
  const syncRun = startSyncRun(SOURCE);
  try {
    const milestones = await collectMilestones();
    if (milestones.length) {
      upsertMilestones(milestones);
    }
    const autoClosed = autoCloseExpiredMilestones({ idPrefix: GRANT_ID_PREFIX });

    finishSyncRun(syncRun.id, {
      success: true,
      itemCount: milestones.length,
      notes: `Synced ${milestones.length} Grants.gov opportunities; auto-closed ${autoClosed} milestones.`
    });
    console.log(
      `Grants.gov ingestion complete: ${milestones.length} milestones updated. Auto-closed ${autoClosed} expired items.`
    );
  } catch (error) {
    finishSyncRun(syncRun.id, {
      success: false,
      itemCount: 0,
      notes: error.message
    });
    console.error('Grants.gov ingestion failed:', error);
    process.exitCode = 1;
  }
}

async function collectMilestones() {
  if (!KEYWORDS.length) {
    console.warn('No Grants.gov keywords configured; skipping milestone sync.');
    return [];
  }
  const results = new Map();

  for (const keyword of KEYWORDS) {
    const hits = await fetchOpportunities(keyword);
    for (const hit of hits) {
      const milestone = createMilestoneFromOpportunity(hit, { keyword });
      if (!milestone) continue;
      if (!results.has(milestone.id)) {
        results.set(milestone.id, milestone);
        continue;
      }
      const existing = results.get(milestone.id);
      results.set(milestone.id, pickMoreUrgentMilestone(existing, milestone));
    }
    await sleep(400);
  }

  return Array.from(results.values());
}

async function fetchOpportunities(keyword) {
  const collected = [];
  let startRecordNum = 0;

  while (collected.length < MAX_RESULTS_PER_KEYWORD) {
    const rows = Math.min(ROWS_PER_PAGE, MAX_RESULTS_PER_KEYWORD - collected.length);
    const payload = {
      keyword,
      rows,
      startRecordNum,
      oppStatuses: OPP_STATUSES,
      sortBy: SORT_BY
    };
    const { hits } = await callSearch(payload);
    if (!hits.length) {
      break;
    }
    collected.push(...hits);
    if (hits.length < rows) {
      break;
    }
    startRecordNum += rows;
    await sleep(350);
  }

  return collected;
}

async function callSearch(payload) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Grants.gov request failed (${response.status})`);
  }

  const data = await response.json();
  if (data?.errorcode && data.errorcode !== 0) {
    throw new Error(`Grants.gov API error ${data.errorcode}: ${data?.msg || 'Unknown error'}`);
  }

  const hits = data?.data?.oppHits || [];
  return { hits, hitCount: data?.data?.hitCount ?? hits.length };
}

function pickMoreUrgentMilestone(existing, incoming) {
  const priorityRank = { High: 3, Medium: 2, Low: 1 };
  const statusRank = { Completed: 3, 'In Progress': 2, Upcoming: 1, Planned: 0 };

  const mergedKeywords = mergeKeywords(existing, incoming);
  const withKeywords = (record) => ({ ...record, matchedKeywords: mergedKeywords });

  const existingPriority = priorityRank[existing.priority] || 0;
  const incomingPriority = priorityRank[incoming.priority] || 0;
  const existingStatus = statusRank[existing.status] || 0;
  const incomingStatus = statusRank[incoming.status] || 0;

  if (incoming.status === 'Completed' && existing.status !== 'Completed') {
    return withKeywords(incoming);
  }
  if (incomingPriority > existingPriority) {
    return withKeywords(incoming);
  }
  if (incomingPriority === existingPriority && incomingStatus > existingStatus) {
    return withKeywords(incoming);
  }
  if (!existing.dueDate && incoming.dueDate) {
    return withKeywords(incoming);
  }
  if (existing.dueDate && incoming.dueDate && incoming.dueDate < existing.dueDate) {
    return withKeywords(incoming);
  }
  return withKeywords(existing);
}

function mergeKeywords(existing, incoming) {
  const previous = Array.isArray(existing?.matchedKeywords) ? existing.matchedKeywords : [];
  const next = Array.isArray(incoming?.matchedKeywords) ? incoming.matchedKeywords : [];
  const set = new Set([...previous, ...next].filter(Boolean));
  return Array.from(set);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

run();
