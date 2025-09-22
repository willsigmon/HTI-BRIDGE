import 'dotenv/config';
import fetch from 'node-fetch';
import { upsertMultiple as upsertLeads } from '../src/repositories/leads.js';
import { bulkUpsertCorporateTargets } from '../src/repositories/corporateTargets.js';
import { startSyncRun, finishSyncRun } from '../src/repositories/sync.js';

const SOURCE = 'data-gov-digital-equity';
const QUERY = process.env.HTI_DATAGOV_QUERY || 'computer donation';
const ROWS = Number(process.env.HTI_DATAGOV_ROWS || 20);

async function searchDataGov() {
  const url = new URL('https://catalog.data.gov/api/3/action/package_search');
  url.searchParams.set('q', QUERY);
  url.searchParams.set('rows', ROWS.toString());
  const res = await fetch(url.href, { headers: { 'User-Agent': 'hti-newdash/0.1 (contact: engineering@hubzonetech.org)' } });
  if (!res.ok) {
    throw new Error(`data.gov request failed ${res.status}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error('data.gov response unsuccessful');
  }
  return json.result.results || [];
}

function datasetToLead(dataset) {
  const title = dataset.title || 'Unnamed initiative';
  const org = dataset.organization?.title || dataset.organization?.name || 'Unknown organization';
  const description = dataset.notes || '';
  const location = dataset.extras?.find?.((ex) => ex.key === 'spatial')?.value || 'United States';
  const estimatedQuantity = extractQuantity(description) || 0;
  return {
    id: `DG${dataset.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase()}`,
    title,
    company: org,
    source: 'Data.gov',
    location,
    equipmentType: inferEquipmentType(description),
    estimatedQuantity,
    status: 'Researching',
    timeline: 'Public program',
    notes: dataset.url || dataset.resources?.[0]?.url,
    followUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    potentialValue: 'High'
  };
}

function datasetToCorporateTarget(dataset) {
  const org = dataset.organization?.title || dataset.organization?.name;
  if (!org) return null;
  return {
    company: org,
    location: dataset.metadata_created?.slice(0, 10) || 'N/A',
    type: 'Public Sector',
    employees: 'N/A',
    status: 'Research',
    priority: 'Medium',
    focus: dataset.title,
    notes: dataset.notes || ''
  };
}

function extractQuantity(text = '') {
  const match = text.match(/(\d{2,5})\s+(devices|computers|laptops|tablets)/i);
  if (match) return Number(match[1]);
  return 0;
}

function inferEquipmentType(text = '') {
  const lowered = text.toLowerCase();
  if (lowered.includes('tablet')) return 'Tablets';
  if (lowered.includes('chromebook')) return 'Chromebooks';
  if (lowered.includes('desktop')) return 'Desktop Computers';
  if (lowered.includes('laptop')) return 'Business Laptops';
  return 'Mixed Equipment';
}

async function run() {
  const syncRun = startSyncRun(SOURCE);
  try {
    const datasets = await searchDataGov();
    const leads = [];
    const targets = [];

    for (const dataset of datasets) {
      leads.push(datasetToLead(dataset));
      const target = datasetToCorporateTarget(dataset);
      if (target) targets.push(target);
    }

    upsertLeads(leads);
    bulkUpsertCorporateTargets(targets);

    finishSyncRun(syncRun.id, {
      success: true,
      itemCount: leads.length,
      notes: `Synced ${leads.length} leads and ${targets.length} corporate targets`
    });

    console.log(`Data.gov ingestion complete: ${leads.length} leads, ${targets.length} corporate targets.`);
  } catch (error) {
    console.error('Data.gov ingestion failed', error);
    finishSyncRun(syncRun.id, {
      success: false,
      itemCount: 0,
      notes: error.message
    });
    process.exitCode = 1;
  }
}

run();
