import 'dotenv/config';
import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import { upsertMultiple as upsertLeads } from '../src/repositories/leads.js';
import { bulkUpsertCorporateTargets } from '../src/repositories/corporateTargets.js';
import { startSyncRun, finishSyncRun } from '../src/repositories/sync.js';
import { mapGovDealsItemToLead, mapGovDealsItemToCorporateTarget, parseFeedLabel, collectItems } from './lib/govdeals-utils.js';

const SOURCE = 'govdeals-rss';
const FEEDS = parseList(process.env.HTI_GOVDEALS_FEEDS, [
  'https://www.govdeals.com/rss/index.cfm?fa=RSS&init=11&site_type=general&CatID=20'
]);
const REQUEST_TIMEOUT_MS = Number(process.env.HTI_GOVDEALS_TIMEOUT || 15000);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text'
});

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

    for (const feedUrl of FEEDS) {
      try {
        const feedLabel = parseFeedLabel(feedUrl);
        const response = await fetchWithTimeout(feedUrl, {
          headers: {
            'User-Agent': 'hti-newdash-govdeals/0.1 (contact: engineering@hubzonetech.org)'
          }
        });
        if (!response.ok) {
          throw new Error(`GovDeals feed failed ${response.status}`);
        }
        const xml = await response.text();
        const tree = parser.parse(xml);
        const items = extractItems(tree);
        if (!items.length) {
          console.warn(`GovDeals feed returned no items: ${feedUrl}`);
          continue;
        }
        items.forEach((item) => {
          const lead = mapGovDealsItemToLead(item, { feedLabel });
          if (lead) {
            leads.push(lead);
          }
          const target = mapGovDealsItemToCorporateTarget(item, { feedLabel });
          if (target) {
            targets.push(target);
          }
        });
        await sleep(1000);
      } catch (feedError) {
        console.error(`GovDeals feed error for ${feedUrl}:`, feedError.message);
      }
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
      notes: `Processed ${leads.length} GovDeals listings across ${FEEDS.length} feeds.`
    });

    console.log(`GovDeals ingestion complete: ${leads.length} leads, ${targets.length} targets.`);
  } catch (error) {
    finishSyncRun(syncRun.id, {
      success: false,
      itemCount: 0,
      notes: error.message
    });
    console.error('GovDeals ingestion failed:', error);
    process.exitCode = 1;
  }
}

function extractItems(tree) {
  let items = [];
  if (tree?.rss?.channel?.item) {
    items = collectItems(tree.rss.channel.item);
  } else if (tree?.feed?.entry) {
    items = collectItems(tree.feed.entry);
  }
  return items;
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
      throw new Error(`GovDeals request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

run();
