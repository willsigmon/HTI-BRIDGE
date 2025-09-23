import { startOfNextMonth } from './date-utils.js';

export function prospectToLead(prospect, { regionFilter = null } = {}) {
  if (!prospect) return null;
  if (regionFilter && !prospect.regions.some((region) => regionFilter.has(region))) {
    return null;
  }

  const id = buildLeadId(prospect.company);
  const followUpDate = startOfNextMonth();
  const contactsNote = prospect.contacts
    .map((contact) => `${contact.name} (${contact.title})`)
    .join(' | ');

  return {
    id,
    title: `${prospect.company} laptop refresh (${prospect.annualRefreshWindow})`,
    company: prospect.company,
    source: 'Corporate Refresh Monitor',
    location: prospect.headquarters,
    equipmentType: prospect.equipmentType,
    estimatedQuantity: prospect.estimatedQuantity,
    status: 'Researching',
    persona: (prospect.personas && prospect.personas[0]) || 'Tech Refresh Donor',
    timeline: `Refresh window: ${prospect.annualRefreshWindow}`,
    followUpDate,
    priority: 'High',
    notes: `${prospect.notes} Contacts: ${contactsNote}`,
    logistics: {
      freightFriendly: prospect.logistics?.freightFriendly ?? false,
      onsitePickup: prospect.logistics?.onsitePickup ?? false
    },
    grantFlag: false
  };
}

export function prospectToCorporateTarget(prospect, { regionFilter = null } = {}) {
  if (!prospect) return null;
  if (regionFilter && !prospect.regions.some((region) => regionFilter.has(region))) {
    return null;
  }

  return {
    company: prospect.company,
    location: prospect.headquarters,
    type: 'Corporate Prospect',
    priority: 'High',
    focus: `${prospect.equipmentType} refresh`,
    status: 'Research',
    notes: `${prospect.notes}`
  };
}

export function buildLeadId(company) {
  return `CORPREFRESH-${slugify(company)}`;
}

function slugify(value) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
