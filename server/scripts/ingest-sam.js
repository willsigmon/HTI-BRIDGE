import 'dotenv/config';
import fetch from 'node-fetch';
import { upsertMultiple as upsertLeads } from '../src/repositories/leads.js';
import { bulkUpsertCorporateTargets } from '../src/repositories/corporateTargets.js';
import { startSyncRun, finishSyncRun } from '../src/repositories/sync.js';

const SOURCE = 'sam-opportunities';
const API_KEY = process.env.HTI_SAM_API_KEY;
const SEARCH_KEYWORDS = process.env.HTI_SAM_KEYWORDS || 'computer donation';
const AGENCY = process.env.HTI_SAM_AGENCY;
const MAX_RESULTS = Number(process.env.HTI_SAM_MAX_RESULTS || 25);

if (!API_KEY) {
  console.error('HTI_SAM_API_KEY not set; skipping SAM.gov ingestion.');
  process.exit(0);
}

function buildUrl() {
  const url = new URL('https://api.sam.gov/prod/opportunities/v2/search');
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('limit', String(Math.min(MAX_RESULTS, 100)));
  url.searchParams.set('postedFrom', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  url.searchParams.set('postedTo', new Date().toISOString().split('T')[0]);
  url.searchParams.set('q', SEARCH_KEYWORDS);
  if (AGENCY) {
    url.searchParams.set('department', AGENCY);
  }
  return url.href;
}

function opportunityToLead(opp) {
  const title = opp.title || 'SAM Opportunity';
  const organization = opp.organizations?.[0]?.name || opp.department || 'SAM.gov';
  const location = opp.placeOfPerformance?.city ? `${opp.placeOfPerformance.city}, ${opp.placeOfPerformance.stateCode || ''}`.trim() : 'United States';
  const closeDate = opp.responseSubmissionDate || opp.closeDate;
  const opportunityId = opp.noticeId || opp.solicitationNumber || opp.externalId;

  return {
    id: `SAM-${opportunityId}`.replace(/[^A-Z0-9-]/gi, '').toUpperCase(),
    title,
    company: organization,
    source: 'SAM.gov',
    location,
    equipmentType: inferEquipmentType(title + ' ' + (opp.description || '')),
    estimatedQuantity: extractQuantity(opp.description || ''),
    status: 'Researching',
    timeline: closeDate ? `Response due ${closeDate}` : 'Active opportunity',
    followUpDate: closeDate || undefined,
    notes: opp.fullParentPath || opp.uiLink,
    potentialValue: 'High'
  };
}

function opportunityToTarget(opp) {
  const organization = opp.organizations?.[0]?.name || opp.department;
  if (!organization) return null;
  return {
    company: organization,
    location: opp.placeOfPerformance?.city ? `${opp.placeOfPerformance.city}, ${opp.placeOfPerformance.stateCode || ''}`.trim() : 'United States',
    type: 'Federal Agency',
    status: 'Research',
    priority: 'High',
    focus: opp.title,
    notes: opp.uiLink || opp.fullParentPath
  };
}

function extractQuantity(text) {
  if (!text) return 0;
  const match = text.match(/(\d{2,5})\s*(devices|computers|laptops|tablets)/i);
  return match ? Number(match[1]) : 0;
}

function inferEquipmentType(text) {
  const value = text.toLowerCase();
  if (value.includes('tablet')) return 'Tablets';
  if (value.includes('printer')) return 'Printers';
  if (value.includes('desktop')) return 'Desktop Computers';
  if (value.includes('chromebook')) return 'Chromebooks';
  if (value.includes('laptop')) return 'Business Laptops';
  return 'Mixed Equipment';
}

async function run() {
  const syncRun = startSyncRun(SOURCE);
  try {
    const url = buildUrl();
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'hti-newdash-sam-ingestor/0.1 (contact: engineering@hubzonetech.org)'
      }
    });
    if (!res.ok) {
      throw new Error(`SAM.gov request failed: ${res.status}`);
    }
    const data = await res.json();
    const notices = data.opportunitiesData || [];
    const leads = notices.map(opportunityToLead);
    const targets = notices.map(opportunityToTarget).filter(Boolean);

    upsertLeads(leads);
    bulkUpsertCorporateTargets(targets);

    finishSyncRun(syncRun.id, {
      success: true,
      itemCount: leads.length,
      notes: `Synced ${leads.length} leads from SAM.gov.`
    });

    console.log(`SAM.gov ingestion complete: ${leads.length} leads, ${targets.length} targets.`);
  } catch (error) {
    finishSyncRun(syncRun.id, {
      success: false,
      itemCount: 0,
      notes: error.message
    });
    console.error('SAM.gov ingestion failed:', error);
    process.exitCode = 1;
  }
}

run();
