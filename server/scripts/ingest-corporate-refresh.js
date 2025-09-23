import 'dotenv/config';

import { upsertMultiple as upsertLeads } from '../src/repositories/leads.js';
import { bulkUpsertCorporateTargets } from '../src/repositories/corporateTargets.js';
import { startSyncRun, finishSyncRun } from '../src/repositories/sync.js';
import { CORPORATE_REFRESH_PROSPECTS } from './lib/corporate-refresh-sources.js';
import { prospectToLead, prospectToCorporateTarget } from './lib/corporate-refresh-utils.js';

const SOURCE = 'corporate-refresh';
const STATES_FILTER = parseList(process.env.HTI_CORPREFRESH_STATES);
const MIN_QUANTITY = Number(process.env.HTI_CORPREFRESH_MIN_QTY || 200);
const REQUIRE_ONSITE_PICKUP = parseBoolean(process.env.HTI_CORPREFRESH_REQUIRE_ONSITE_PICKUP || 'false');

async function run() {
  const syncRun = startSyncRun(SOURCE);
  try {
    const leads = [];
    const targets = [];
    const regionFilter = STATES_FILTER.length ? new Set(STATES_FILTER) : null;

    for (const prospect of CORPORATE_REFRESH_PROSPECTS) {
      if (MIN_QUANTITY && Number(prospect.estimatedQuantity || 0) < MIN_QUANTITY) {
        continue;
      }
      if (REQUIRE_ONSITE_PICKUP && prospect.logistics && prospect.logistics.onsitePickup === false) {
        continue;
      }
      const lead = prospectToLead(prospect, { regionFilter });
      if (!lead) continue;
      const target = prospectToCorporateTarget(prospect, { regionFilter });
      if (target) {
        targets.push(target);
      }
      // Enrich lead with persona tags from dataset
      if (Array.isArray(prospect.personas) && prospect.personas.length) {
        lead.persona = prospect.personas[0];
        lead.personaTags = prospect.personas.map((value) => `persona:${value.toLowerCase().replace(/\s+/g, '-')}`);
      }
      lead.priority = 90;
      lead.potentialValue = 'High';
      lead.contact = prospect.contacts?.[0]?.name || null;
      lead.contactEmail = null;
      lead.notes = `${prospect.notes} Contacts: ${prospect.contacts
        .map((contact) => `${contact.name} (${contact.title})`)
        .join(' | ')}`;
      leads.push(lead);
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
      notes: `Queued ${leads.length} corporate refresh prospects.`
    });

    console.log(`Corporate refresh ingestion complete: ${leads.length} leads, ${targets.length} targets.`);
  } catch (error) {
    finishSyncRun(syncRun.id, {
      success: false,
      itemCount: 0,
      notes: error.message
    });
    console.error('Corporate refresh ingestion failed:', error);
    process.exitCode = 1;
  }
}

function parseList(value) {
  if (!value) return [];
  return value
    .split(/[|,]/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
}

function parseBoolean(value) {
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

run();
