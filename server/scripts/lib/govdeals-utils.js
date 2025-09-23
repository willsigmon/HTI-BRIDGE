import { normalizeText } from './usaspending-utils.js';

export function mapGovDealsItemToLead(item, { feedLabel } = {}) {
  const title = normalizeText(item.title || item.Title || 'GovDeals Listing');
  const link = item.link || item.guid || null;
  const city = normalizeText(item['gd:City'] || item.City);
  const state = normalizeText(item['gd:State'] || item.State);
  const location = buildLocation(city, state);
  const description = cleanDescription(item.description || item.Description || '');
  const quantity = extractQuantity(title) || extractQuantity(description);
  const postedAt = normalizeText(item.pubDate || item.pubdate || item['dc:date']);

  return {
    id: buildListingId(item),
    title,
    company: feedLabel || 'GovDeals Auction',
    source: 'GovDeals',
    location: location || feedLabel || 'United States',
    equipmentType: inferEquipmentType(title, description),
    estimatedQuantity: quantity,
    priority: quantity >= 50 ? 85 : quantity >= 10 ? 75 : 65,
    status: 'Researching',
    timeline: postedAt ? `Posted ${postedAt}` : 'Active auction',
    followUpDate: undefined,
    notes: link || description.slice(0, 140),
    potentialValue: classifyValue(quantity),
    persona: 'Logistics Hotshot',
    personaTags: ['logistics', 'fast-turn', 'persona:logistics-hotshot']
  };
}

export function mapGovDealsItemToCorporateTarget(item, { feedLabel } = {}) {
  const link = item.link || item.guid || null;
  const city = normalizeText(item['gd:City'] || item.City);
  const state = normalizeText(item['gd:State'] || item.State);
  const location = buildLocation(city, state);
  const title = normalizeText(item.title || 'GovDeals Listing');

  const loweredTitle = title.toLowerCase();
  const highValue = /computer|laptop|tablet|server|electronics/.test(loweredTitle);

  return {
    company: feedLabel || 'GovDeals Seller',
    location: location || 'United States',
    type: 'Public Surplus',
    status: 'Research',
    priority: highValue ? 'High' : 'Medium',
    focus: title,
    notes: link || undefined,
    tags: ['govdeals']
  };
}

function buildListingId(item) {
  const guid = normalizeText(item.guid || item.link || item.Title);
  if (guid) {
    return `GOV-${guid.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40).toUpperCase()}`;
  }
  return `GOV-${Date.now()}`;
}

function inferEquipmentType(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('laptop')) return 'Business Laptops';
  if (text.includes('desktop')) return 'Desktop Computers';
  if (text.includes('computer')) return 'Mixed Equipment';
  if (text.includes('server')) return 'Servers';
  if (text.includes('printer')) return 'Printers';
  if (text.includes('tablet') || text.includes('ipad')) return 'Tablets';
  return 'Mixed Equipment';
}

function extractQuantity(text) {
  if (!text) return 0;
  const match = String(text).match(/(\d{1,4})\s*(units|laptops|computers|pcs|devices|servers|monitors|items)/i);
  if (match) {
    return Number(match[1]);
  }
  return 0;
}

function classifyValue(quantity) {
  if (quantity >= 100) return 'High';
  if (quantity >= 25) return 'Medium-High';
  if (quantity >= 5) return 'Medium';
  return 'Emerging';
}

function buildLocation(city, state) {
  if (city && state) return `${city}, ${state}`;
  if (state) return state;
  if (city) return city;
  return '';
}

function cleanDescription(description) {
  const text = normalizeText(description.replace(/<[^>]+>/g, ' '));
  return text;
}

export function parseFeedLabel(url) {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has('CatID')) {
      const cat = parsed.searchParams.get('CatID');
      return `GovDeals Category ${cat}`;
    }
    if (parsed.searchParams.has('AgencyID')) {
      return `GovDeals Agency ${parsed.searchParams.get('AgencyID')}`;
    }
    return 'GovDeals Auction Feed';
  } catch (error) {
    return 'GovDeals Auction Feed';
  }
}

export function collectItems(tree) {
  if (!tree) return [];
  if (Array.isArray(tree)) return tree;
  return [tree];
}
