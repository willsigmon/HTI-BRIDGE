export const STATUS_CONFIG = {
  active: [
    'New',
    'Researching',
    'Initial Contact',
    'Qualified',
    'Proposal Sent',
    'Negotiating'
  ],
  closed: ['Committed', 'Donated', 'Not Interested', 'Invalid'],
  corporatePriorityRank: { High: 3, Medium: 2, Low: 1 }
};

export const PERSONA_CONFIG = {
  buckets: [
    'Corporate IT Partner',
    'Tech Refresh Donor',
    'Government Surplus',
    'Government Procurement',
    'Healthcare System',
    'Education Partner',
    'Logistics Hotshot'
  ],
  defaultPersona: 'Corporate IT Partner',
  logisticsPersona: 'Logistics Hotshot',
  tagDefinitions: {
    'Corporate IT Partner': ['corporate', 'it'],
    'Tech Refresh Donor': ['technology', 'refresh'],
    'Government Surplus': ['public-sector', 'surplus'],
    'Government Procurement': ['public-sector', 'procurement'],
    'Healthcare System': ['healthcare'],
    'Education Partner': ['education', 'community'],
    'Logistics Hotshot': ['logistics', 'fast-turn']
  },
  ownerMap: {
    'Tech Refresh Donor': 'hti-admin',
    'Corporate IT Partner': 'hti-outreach',
    'Healthcare System': 'hti-fellow',
    'Education Partner': 'hti-fellow',
    'Logistics Hotshot': 'hti-outreach',
    'Government Procurement': 'hti-admin',
    'Government Surplus': 'hti-outreach'
  }
};

export const DEFAULT_USER_DIRECTORY = {
  'hti-admin': 'HTI Admin',
  'hti-outreach': 'Outreach Lead',
  'hti-fellow': 'HUBZone Fellow'
};

export const UPCOMING_THRESHOLD_DAYS = 14;

export function createDefaultSettings() {
  return {
    personas: {
      enabled: Object.fromEntries(PERSONA_CONFIG.buckets.map((name) => [name, true])),
      weights: Object.fromEntries(PERSONA_CONFIG.buckets.map((name) => [name, 1]))
    },
    assignment: {
      defaultOwnerId: 'hti-outreach'
    },
    preferences: {
      enableMap: true,
      enableAutomations: true
    }
  };
}

export function createStatusSets() {
  return {
    active: new Set(STATUS_CONFIG.active),
    closed: new Set(STATUS_CONFIG.closed)
  };
}

export function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(createDefaultSettings()));
}

export function cloneUserDirectory() {
  return JSON.parse(JSON.stringify(DEFAULT_USER_DIRECTORY));
}

export function cloneCorporatePriorityRank() {
  return JSON.parse(JSON.stringify(STATUS_CONFIG.corporatePriorityRank));
}
