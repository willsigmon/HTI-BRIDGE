import { differenceInDays, normalizeIsoDate, todayIso } from './time-utils.js';

export const GRANT_ID_PREFIX = 'GRANTSGOV-';

export function parseKeywordList(value, fallback = ['digital equity', 'device donation', 'computer recycling', 'broadband adoption']) {
  if (!value) return [...fallback];
  return value
    .split(/[|,]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export function createMilestoneFromOpportunity(opportunity, { keyword } = {}) {
  if (!opportunity) return null;
  const id = buildMilestoneId(opportunity);
  const dueDate = inferDueDate(opportunity);
  const status = determineStatus(opportunity.oppStatus, dueDate);
  const priority = determinePriority(dueDate);
  const detailUrl = buildDetailUrl(opportunity);
  const description = buildDescription(opportunity, { dueDate });

  return {
    id,
    title: opportunity.title?.trim() || 'Grants.gov Opportunity',
    dueDate,
    status,
    description,
    priority,
    url: detailUrl,
    matchedKeywords: keyword ? [keyword] : [],
    source: 'Grants.gov'
  };
}

export function buildMilestoneId(opportunity) {
  const raw = (opportunity?.number || opportunity?.id || '').toString().toUpperCase();
  const cleaned = raw.replace(/[^A-Z0-9-]/g, '');
  const suffix = cleaned || String(opportunity?.id || Date.now());
  return `${GRANT_ID_PREFIX}${suffix}`;
}

export function inferDueDate(opportunity) {
  const close = normalizeGrantsDate(opportunity?.closeDate);
  if (close) return close;

  const open = normalizeGrantsDate(opportunity?.openDate);
  if (open) {
    return addDays(open, 120);
  }

  return addDays(todayIso(), 120);
}

export function determineStatus(oppStatus, dueDate) {
  if (dueDate) {
    const diff = differenceInDays(dueDate, todayIso());
    if (Number.isFinite(diff) && diff < 0) return 'Completed';
    if (Number.isFinite(diff) && diff <= 45) return 'In Progress';
  }
  if (typeof oppStatus === 'string' && oppStatus.toLowerCase() === 'forecasted') {
    return 'Planned';
  }
  return 'Upcoming';
}

export function determinePriority(dueDate) {
  if (!dueDate) return 'Medium';
  const diff = differenceInDays(dueDate, todayIso());
  if (!Number.isFinite(diff)) return 'Medium';
  if (diff <= 30) return 'High';
  if (diff <= 90) return 'Medium';
  return 'Low';
}

export function buildDescription(opportunity, { dueDate } = {}) {
  const sections = [];
  if (opportunity?.agency) {
    sections.push(`Agency: ${opportunity.agency}`);
  }
  if (Array.isArray(opportunity?.cfdaList) && opportunity.cfdaList.length) {
    sections.push(`CFDA: ${opportunity.cfdaList.join(', ')}`);
  }
  if (opportunity?.number) {
    sections.push(`Opportunity #: ${opportunity.number}`);
  }
  if (dueDate) {
    sections.push(`Close Date: ${dueDate}`);
  }
  return sections.join(' • ');
}

export function buildDetailUrl(opportunity) {
  if (!opportunity?.id) return null;
  return `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${opportunity.id}`;
}

export function normalizeGrantsDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parts = value.split('/').map((part) => part.trim());
  if (parts.length !== 3) return null;
  const [month, day, year] = parts.map(Number);
  if (!month || !day || !year) return null;
  const iso = new Date(Date.UTC(year, month - 1, day)).toISOString();
  return iso.split('T')[0];
}

export function addDays(dateIso, days) {
  const base = normalizeIsoDate(dateIso);
  if (!base) return null;
  const result = new Date(`${base}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + Number(days || 0));
  return result.toISOString().split('T')[0];
}
