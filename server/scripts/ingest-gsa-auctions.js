import 'dotenv/config';
import fetch from 'node-fetch';
import { upsertMultiple as upsertLeads } from '../src/repositories/leads.js';
import { bulkUpsertCorporateTargets } from '../src/repositories/corporateTargets.js';
import { startSyncRun, finishSyncRun } from '../src/repositories/sync.js';

const SOURCE = 'gsa-auctions';
const API_KEY = process.env.HTI_GSA_API_KEY || 'DEMO_KEY';
const PER_PAGE = Number(process.env.HTI_GSA_PER_PAGE || 20);
const STATES_FILTER = process.env.HTI_GSA_STATES?.split(',')?.map((s) => s.trim().toUpperCase()).filter(Boolean);

function buildUrl(page) {
  const base = new URL('https://api.gsa.gov/assets/gsaauctions/v2/auctions');
  base.searchParams.set('api_key', API_KEY);
  base.searchParams.set('format', 'JSON');
  base.searchParams.set('page', String(page));
  base.searchParams.set('per_page', String(PER_PAGE));
  return base.href;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function mapAuctionToLead(auction) {
  const title = normalizeText(auction.itemName || auction.lotTitle || 'Surplus Auction');
  const locationCity = normalizeText(auction.propertyCity || auction.locationCity);
  const locationState = normalizeText(auction.propertyState || auction.locationST);
  const locationZip = normalizeText(auction.propertyZip || auction.locationZip);
  const address = [locationCity, locationState].filter(Boolean).join(', ');
  const closingDate = normalizeText(auction.aucEndDt);

  return {
    id: `GSA-${auction.saleNo}-${auction.lotNo}`.replace(/[^A-Z0-9-]/gi, '').toUpperCase(),
    title,
    company: normalizeText(auction.locationOrg) || 'GSA Auctions',
    source: 'GSA Auctions',
    location: address || 'United States',
    equipmentType: inferEquipmentType(title),
    estimatedQuantity: extractQuantity(title) || 0,
    status: 'Researching',
    timeline: closingDate ? `Auction closes ${closingDate}` : 'Auction open',
    followUpDate: closingDate || undefined,
    notes: `https://gsaauctions.gov/auctions/${auction.saleNo}`,
    potentialValue: 'High'
  };
}

function mapAuctionToCorporateTarget(auction) {
  const company = normalizeText(auction.locationOrg);
  if (!company) return null;
  return {
    company,
    location: normalizeText(auction.locationCity || auction.propertyCity) || 'United States',
    type: 'Public Sector',
    employees: 'N/A',
    status: 'Research',
    priority: 'Medium',
    focus: normalizeText(auction.itemName),
    notes: `Sale ${auction.saleNo}`
  };
}

function extractQuantity(text) {
  if (!text) return 0;
  const match = text.match(/(\d{2,5})\s*(laptops|devices|pcs|units)/i);
  if (match) return Number(match[1]);
  return 0;
}

function inferEquipmentType(text) {
  const value = (text || '').toLowerCase();
  if (value.includes('truck') || value.includes('vehicle')) return 'Vehicles';
  if (value.includes('desktop')) return 'Desktop Computers';
  if (value.includes('tablet')) return 'Tablets';
  if (value.includes('printer')) return 'Printers';
  if (value.includes('laptop') || value.includes('notebook')) return 'Business Laptops';
  return 'Mixed Equipment';
}

async function fetchPage(page) {
  const url = buildUrl(page);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'hti-newdash-gsa-ingestor/0.1 (contact: engineering@hubzonetech.org)'
    }
  });
  if (!res.ok) {
    throw new Error(`GSA Auctions request failed: ${res.status}`);
  }
  const data = await res.json();
  const results = data.Results || [];
  return results;
}

async function run() {
  const syncRun = startSyncRun(SOURCE);
  try {
    let page = 1;
    let totalProcessed = 0;
    const leads = [];
    const targets = [];

    while (page <= 3) { // limit to first 3 pages by default
      const auctions = await fetchPage(page);
      if (!auctions.length) break;

      for (const auction of auctions) {
        if (STATES_FILTER?.length) {
          const state = normalizeText(auction.propertyState || auction.locationST);
          if (state && !STATES_FILTER.includes(state.toUpperCase())) {
            continue;
          }
        }
        const lead = mapAuctionToLead(auction);
        leads.push(lead);
        const target = mapAuctionToCorporateTarget(auction);
        if (target) targets.push(target);
      }

      totalProcessed += auctions.length;
      page += 1;
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
      notes: `Synced ${leads.length} leads and ${targets.length} targets from GSA auctions.`
    });

    console.log(`GSA Auctions ingestion complete: ${leads.length} leads, ${targets.length} targets.`);
  } catch (error) {
    finishSyncRun(syncRun.id, {
      success: false,
      itemCount: 0,
      notes: error.message
    });
    console.error('GSA Auctions ingestion failed:', error);
    process.exitCode = 1;
  }
}

run();
