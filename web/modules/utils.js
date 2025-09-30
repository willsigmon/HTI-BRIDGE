import {
  PERSONA_TAG_DEFINITIONS,
  USER_DIRECTORY,
  UPCOMING_THRESHOLD
} from '../config.js';

// Date formatting utilities
export function formatDate(value) {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatFollowUp(dateString) {
  if (!dateString) return 'N/A';
  const relative = formatRelativeDate(dateString);
  return `${formatDate(dateString)}${relative ? ` (${relative})` : ''}`;
}

export function formatRelativeDate(dateString) {
  if (!dateString) return '';
  const today = new Date();
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return '';
  const diffDays = Math.round((target - today) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays > 1) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

export function formatDueLabel(dateString) {
  const diff = daysUntil(dateString);
  if (Number.isNaN(diff)) return '';
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff === 0) return 'due today';
  if (diff === 1) return 'due tomorrow';
  if (diff <= UPCOMING_THRESHOLD) return `due in ${diff} days`;
  return '';
}

export function formatActivityDate(timestamp) {
  if (!timestamp) return '—';
  const diff = daysUntil(timestamp);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  return formatDate(timestamp);
}

export function formatRelativeTime(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const diffMs = Date.now() - date.getTime();
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minutes = Math.round(diffMs / (60 * 1000));
  if (Math.abs(minutes) < 60) {
    return rtf.format(-minutes, 'minute');
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) {
    return rtf.format(-hours, 'hour');
  }
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 60) {
    return rtf.format(-days, 'day');
  }
  const months = Math.round(days / 30);
  if (Math.abs(months) < 24) {
    return rtf.format(-months, 'month');
  }
  const years = Math.round(months / 12);
  return rtf.format(-years, 'year');
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

export function daysUntil(dateString) {
  if (!dateString) return NaN;
  const today = new Date();
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return NaN;
  const diffMs = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

// Number and math utilities
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// String utilities
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function escapeQuotes(value) {
  return String(value ?? '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
}

export function sanitizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(String(url), window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch (error) {
    return '';
  }
}

// Object utilities
export function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

export function mergeSettings(target = {}, source = {}) {
  const result = clone(target);
  if (!source || typeof source !== 'object') return result;
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergeSettings(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Collection utilities
export function aggregateBy(collection, key) {
  if (!collection.length) return { 'No Data': 1 };
  return collection.reduce((acc, item) => {
    const value = item[key] || 'Other';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

export function aggregateEquipmentTotals(leadsCollection) {
  if (!leadsCollection.length) return { 'No Data': 1 };

  const totals = leadsCollection.reduce((acc, lead) => {
    const type = lead.equipmentType || 'Other';
    const quantity = Number(lead.estimatedQuantity) || 0;
    acc[type] = (acc[type] || 0) + quantity;
    return acc;
  }, {});

  const totalQuantity = Object.values(totals).reduce((sum, value) => sum + value, 0);
  if (totalQuantity === 0) {
    return { 'No Data': 1 };
  }

  return totals;
}

// Persona and lead utilities
export function assignPersonaMetadata(lead = {}) {
  if (!lead) return lead;
  const source = (lead.source || '').toLowerCase();
  const equipment = (lead.equipmentType || '').toLowerCase();
  const company = (lead.company || '').toLowerCase();
  const notes = (lead.notes || '').toLowerCase();
  const title = (lead.title || '').toLowerCase();
  const location = (lead.location || '').toLowerCase();
  const timeline = (lead.timeline || '').toLowerCase();
  const text = `${title} ${company} ${notes} ${location}`;
  const priority = lead.priority ?? 0;
  const followUpDate = lead.followUpDate ? new Date(lead.followUpDate) : null;
  const followUpDays = followUpDate && !Number.isNaN(followUpDate.getTime())
    ? Math.round((followUpDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  let persona = 'Corporate IT Partner';
  if (source.includes('gsa') || text.includes('auction') || text.includes('surplus') || text.includes('state agency')) {
    persona = 'Government Surplus';
  } else if (source.includes('sam.gov') || source.includes('data.gov') || text.includes('federal')) {
    persona = 'Government Procurement';
  } else if (
    text.includes('hospital') ||
    text.includes('clinic') ||
    text.includes('health') ||
    equipment.includes('medical') ||
    company.includes('health')
  ) {
    persona = 'Healthcare System';
  } else if (
    text.includes('school') ||
    text.includes('district') ||
    text.includes('college') ||
    text.includes('university') ||
    text.includes('education') ||
    equipment.includes('chromebook') ||
    equipment.includes('lab')
  ) {
    persona = 'Education Partner';
  } else if (
    source.includes('reddit') ||
    source.includes('linkedin') ||
    text.includes('refresh') ||
    text.includes('upgrade') ||
    text.includes('laptop refresh')
  ) {
    persona = 'Tech Refresh Donor';
  } else if (
    persona === 'Corporate IT Partner' &&
    ((followUpDays !== null && followUpDays <= 3) || timeline.includes('urgent') || timeline.includes('immediate'))
  ) {
    persona = 'Logistics Hotshot';
  }

  const predefinedTags = PERSONA_TAG_DEFINITIONS[persona] || PERSONA_TAG_DEFINITIONS['Corporate IT Partner'] || [];
  const tags = new Set(predefinedTags);
  if (priority >= 80) tags.add('high-priority');
  if (followUpDays !== null && followUpDays <= 3) tags.add('urgent');
  if (timeline.includes('grant')) tags.add('grant');
  if (source) tags.add(`source:${source}`);
  if (equipment) tags.add(`equipment:${equipment.replace(/\s+/g, '-')}`);
  tags.add(`persona:${persona.toLowerCase().replace(/\s+/g, '-')}`);

  lead.persona = persona;
  lead.personaTags = [...tags];
  return lead;
}

export function buildPersonaBreakdown(leads = []) {
  return leads.reduce((acc, lead) => {
    if (!lead.persona) assignPersonaMetadata(lead);
    const persona = lead.persona || 'Uncategorized';
    acc[persona] = (acc[persona] || 0) + 1;
    return acc;
  }, {});
}

export function getTopPersona(breakdown = {}) {
  const entries = Object.entries(breakdown);
  if (!entries.length) return null;
  return entries.sort(([, countA], [, countB]) => countB - countA)[0];
}

export function calculatePriorityScore(lead) {
  let score = 50;
  const quantity = Number(lead.estimatedQuantity) || 0;
  if (quantity >= 100) score += 30;
  else if (quantity >= 50) score += 20;
  else if (quantity >= 10) score += 10;

  const status = lead.status || '';
  if (['Qualified', 'Proposal Sent', 'Negotiating', 'Committed'].includes(status)) {
    score += 15;
  }

  const followUpDate = lead.followUpDate ? new Date(lead.followUpDate) : null;
  const followUpDays = followUpDate && !Number.isNaN(followUpDate.getTime())
    ? Math.round((followUpDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  if (followUpDays !== null && followUpDays <= 3) score += 20;
  else if (followUpDays !== null && followUpDays <= 7) score += 10;

  return Math.min(100, score);
}

export function leadAgeDays(lead) {
  const created = lead.createdAt ? new Date(lead.createdAt) : null;
  if (!created || Number.isNaN(created.getTime())) return 0;
  const diffMs = Date.now() - created.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

export function leadWithinDays(lead, windowDays) {
  const age = leadAgeDays(lead);
  return age <= windowDays;
}

// Grant utilities
export function normalizeGrantMetrics(metrics = {}) {
  const source = metrics && typeof metrics === 'object' ? metrics : {};
  const hours = source.digitalLiteracyHours && typeof source.digitalLiteracyHours === 'object'
    ? source.digitalLiteracyHours
    : source;
  const required = Number.isFinite(hours.required) && hours.required > 0 ? hours.required : 170;
  const completed = Number.isFinite(hours.completed) && hours.completed >= 0 ? hours.completed : 0;
  const remaining = Math.max(0, required - completed);
  const percent = required === 0 ? 0 : Math.round(Math.min(1, completed / required) * 100);
  return {
    digitalLiteracyHours: {
      required,
      completed,
      remaining,
      percent,
      updatedAt: hours.updatedAt || null
    }
  };
}

// Map utilities
export function hashLocationToCoords(seed) {
  const value = (seed || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  const lat = 25 + ((hash >>> 8) % 2000) / 100;
  const lng = -125 + (hash % 3000) / 100;
  return {
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4))
  };
}

export function deriveMapPointsFromLeads(leads = []) {
  return leads.map((lead) => {
    if (!lead.persona) assignPersonaMetadata(lead);
    const coords = hashLocationToCoords(lead.location || lead.company || lead.id);
    return {
      id: lead.id,
      title: lead.title,
      company: lead.company,
      location: lead.location,
      estimatedQuantity: lead.estimatedQuantity,
      followUpDate: lead.followUpDate,
      priority: lead.priority,
      persona: lead.persona || null,
      personaTags: lead.personaTags || [],
      lat: coords.lat,
      lng: coords.lng
    };
  });
}

// UI utilities
export function lookupOwnerName(ownerId) {
  return USER_DIRECTORY[ownerId] || ownerId || 'CRM User';
}

export function getPriorityClass(priority) {
  if (priority >= 80) return 'high';
  if (priority >= 60) return 'medium';
  return 'low';
}

export function renderPersonaBadge(lead) {
  if (!lead.persona) assignPersonaMetadata(lead);
  const persona = lead.persona || 'Uncategorized';
  const tags = (lead.personaTags || []).filter((tag) => !tag.startsWith('persona:'));
  const title = tags.length ? `title="${escapeHtml(tags.join(', '))}"` : '';
  return `<span class="persona-chip" ${title}>${escapeHtml(persona)}</span>`;
}

export function getPriorityBadgeClass(priority) {
  const map = { High: 'error', Medium: 'warning', Low: 'info' };
  return map[priority] || 'info';
}

export function getStatusClass(status) {
  const map = {
    'New': 'info',
    'Researching': 'info',
    'Initial Contact': 'info',
    'Qualified': 'success',
    'Proposal Sent': 'warning',
    'Negotiating': 'warning',
    'Committed': 'success',
    'Donated': 'success',
    'Not Interested': 'error',
    'Invalid': 'error',
    'Upcoming': 'warning',
    'In Progress': 'info',
    'Completed': 'success',
    'Overdue': 'error',
    'Planned': 'info',
    'Discovery Call': 'info',
    'Strategic Partner': 'success'
  };
  return map[status] || 'info';
}

export function getMilestoneStatus(milestone) {
  const baseStatus = milestone.status || 'Upcoming';
  const dueDiff = daysUntil(milestone.dueDate);
  if (baseStatus === 'Completed') return 'Completed';
  if (dueDiff < 0) return 'Overdue';
  if (dueDiff <= UPCOMING_THRESHOLD && baseStatus !== 'In Progress') return 'Upcoming';
  return baseStatus;
}

export function variantIcon(variant) {
  switch (variant) {
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '⛔️';
    default:
      return 'ℹ️';
  }
}

export function createToast(title, message, variant = 'info', timeout = 4000) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${variant}`;
  toast.innerHTML = `
    <div class="toast__icon">${variantIcon(variant)}</div>
    <div class="toast__body">
      <div class="toast__title">${escapeHtml(title)}</div>
      ${message ? `<div>${escapeHtml(message)}</div>` : ''}
    </div>
  `;
  toast.addEventListener('click', () => {
    toast.remove();
  });
  stack.appendChild(toast);
  if (timeout > 0) {
    setTimeout(() => {
      toast.remove();
    }, timeout);
  }
}

// Modal utilities
export function openModal(id, openModalCount) {
  const modal = document.getElementById(id);
  if (!modal) return openModalCount;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  openModalCount += 1;
  document.body.style.overflow = 'hidden';
  return openModalCount;
}

export function closeModal(id, openModalCount) {
  const modal = document.getElementById(id);
  if (!modal) return openModalCount;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = '';
  }
  return openModalCount;
}

export function lockModal() {
  document.body.classList.add('is-modal-open');
}

export function unlockModal(openModalCount) {
  if (openModalCount === 0) {
    document.body.classList.remove('is-modal-open');
  }
}

export function lockDrawer() {
  document.body.classList.add('is-drawer-open');
}

export function unlockDrawer() {
  document.body.classList.remove('is-drawer-open');
}

// Service worker
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .register('service-worker.js')
    .catch((error) => console.warn('Service worker registration failed', error));
}

// DOM utilities
export function getInputValue(id) {
  const element = document.getElementById(id);
  return element ? element.value : '';
}

export function setInputValue(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.value = value ?? '';
  }
}
