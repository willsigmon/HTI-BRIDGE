/**
 * Grants.gov API Integration
 * HTI-BRIDGE CRM - Grant Discovery System
 */

import fetch from 'node-fetch';

const GRANTS_GOV_API = 'https://api.grants.gov/v1/api';

/**
 * HTI Profile for grant matching
 */
const HTI_PROFILE = {
  mission: 'Bridge the digital divide by providing refurbished Chromebooks to underserved HUBZone communities',
  location: 'Henderson, North Carolina',
  state: 'NC',
  focusAreas: [
    'digital equity',
    'technology access',
    'education technology',
    'Chromebook distribution',
    'digital literacy',
    'workforce development'
  ],
  eligibility: ['501c3', 'nonprofit', 'HUBZone'],
  geographicFocus: ['North Carolina', 'Southeast', 'HUBZone communities'],
  annualBudget: 750000,
  currentGrant: {
    funder: 'NC Department of Information Technology',
    amount: 600000,
    purpose: 'Deliver 5,000 Chromebooks to HUBZone communities'
  },
  capacity: {
    chromebooksDelivered: 1600,
    chromebooksRemaining: 3400,
    processingCapacity: 500 // per month
  }
};

/**
 * Search Grants.gov for opportunities
 */
async function searchGrants(keywords, options = {}) {
  try {
    const searchParams = {
      keyword: keywords.join(' OR '),
      eligibilityCode: '25', // Nonprofits
      fundingInstrumentType: 'G', // Grant
      oppStatus: options.status || 'forecasted|posted',
      sortBy: options.sortBy || 'openDate|desc',
      rows: options.rows || 50,
      offset: options.offset || 0
    };

    // Add optional filters
    if (options.cfda) {
      searchParams.cfdaNumber = options.cfda;
    }
    if (options.agencyCode) {
      searchParams.agencyCode = options.agencyCode;
    }

    const response = await fetch(`${GRANTS_GOV_API}/search2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchParams)
    });

    if (!response.ok) {
      throw new Error(`Grants.gov API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      total: data.totalHits || 0,
      grants: (data.oppHits || []).map(formatGrant)
    };
  } catch (error) {
    console.error('Error searching Grants.gov:', error);
    return { total: 0, grants: [] };
  }
}

/**
 * Fetch detailed grant opportunity
 */
async function fetchGrantDetails(opportunityId) {
  try {
    const response = await fetch(`${GRANTS_GOV_API}/fetchOpportunity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunityId })
    });

    if (!response.ok) {
      throw new Error(`Grants.gov API error: ${response.statusText}`);
    }

    const data = await response.json();
    return formatGrantDetails(data);
  } catch (error) {
    console.error('Error fetching grant details:', error);
    return null;
  }
}

/**
 * Format grant data from Grants.gov API
 */
function formatGrant(grant) {
  return {
    title: grant.title || grant.opportunityTitle,
    funder: grant.agencyName || grant.agencyCode,
    funder_type: 'federal',
    amount_min: grant.awardFloor || 0,
    amount_max: grant.awardCeiling || 0,
    deadline: grant.closeDate || grant.archiveDate,
    source: 'grants.gov',
    source_id: grant.opportunityNumber,
    url: `https://grants.gov/search-results-detail/${grant.opportunityId}`,
    description: grant.description || grant.synopsis,
    eligibility: grant.eligibilityDescription || '',
    geographic_focus: grant.additionalInformationOnEligibility || '',
    cfda_number: grant.cfdaNumbers || '',
    mission_keywords: extractKeywords(grant.description || grant.synopsis)
  };
}

/**
 * Format detailed grant data
 */
function formatGrantDetails(data) {
  const grant = data.oppHit || data;
  return {
    ...formatGrant(grant),
    full_description: grant.description,
    award_info: {
      estimated_awards: grant.estimatedTotalProgram,
      award_floor: grant.awardFloor,
      award_ceiling: grant.awardCeiling,
      cost_sharing: grant.costSharingOrMatchingRequirement
    },
    dates: {
      posted: grant.postDate,
      close: grant.closeDate,
      archive: grant.archiveDate
    },
    contact: {
      name: grant.grantsGovContactName,
      email: grant.grantsGovContactEmail,
      phone: grant.grantsGovContactPhone
    },
    application_info: {
      instructions: grant.additionalInformationText,
      version: grant.version
    }
  };
}

/**
 * Extract keywords from grant description
 */
function extractKeywords(text) {
  if (!text) return JSON.stringify([]);
  
  const keywords = [];
  const lowercaseText = text.toLowerCase();
  
  // Check for HTI-relevant keywords
  const relevantTerms = [
    'digital equity',
    'digital divide',
    'technology access',
    'broadband',
    'internet access',
    'computer',
    'laptop',
    'chromebook',
    'device',
    'education technology',
    'edtech',
    'digital literacy',
    'stem',
    'workforce development',
    'rural',
    'underserved',
    'low-income',
    'hubzone',
    'economic development',
    'community development'
  ];
  
  relevantTerms.forEach(term => {
    if (lowercaseText.includes(term)) {
      keywords.push(term);
    }
  });
  
  return JSON.stringify(keywords);
}

/**
 * Search for HTI-relevant grants
 */
async function searchHTIGrants() {
  const keywords = [
    'digital equity',
    'technology access',
    'education technology',
    'digital literacy',
    'broadband access',
    'computer donation',
    'workforce development'
  ];
  
  // Search with HTI keywords
  const results = await searchGrants(keywords, {
    rows: 100
  });
  
  // Filter for North Carolina or national grants
  const relevantGrants = results.grants.filter(grant => {
    const desc = (grant.description || '').toLowerCase();
    const geo = (grant.geographic_focus || '').toLowerCase();
    const eligibility = (grant.eligibility || '').toLowerCase();
    
    // Check if grant is relevant to NC or national
    const isGeographicallyRelevant = 
      geo.includes('north carolina') ||
      geo.includes('nc') ||
      geo.includes('southeast') ||
      geo.includes('national') ||
      geo.includes('all states') ||
      eligibility.includes('all states');
    
    // Check if grant is relevant to HTI's mission
    const isMissionRelevant = 
      desc.includes('digital') ||
      desc.includes('technology') ||
      desc.includes('computer') ||
      desc.includes('internet') ||
      desc.includes('broadband') ||
      desc.includes('education');
    
    return isGeographicallyRelevant && isMissionRelevant;
  });
  
  return {
    total: relevantGrants.length,
    grants: relevantGrants
  };
}

/**
 * Calculate match score for a grant
 */
function calculateMatchScore(grant) {
  let score = 0;
  const reasons = [];
  
  const desc = (grant.description || '').toLowerCase();
  const title = (grant.title || '').toLowerCase();
  const keywords = JSON.parse(grant.mission_keywords || '[]');
  
  // 1. Mission Alignment (30 points)
  const perfectMatchTerms = ['digital equity', 'chromebook', 'laptop donation', 'technology access'];
  const strongMatchTerms = ['education technology', 'digital literacy', 'workforce development'];
  const moderateMatchTerms = ['education', 'community development', 'economic development'];
  
  let missionScore = 0;
  if (perfectMatchTerms.some(term => desc.includes(term) || title.includes(term))) {
    missionScore = 30;
    reasons.push('Perfect mission alignment (digital equity/technology access)');
  } else if (strongMatchTerms.some(term => desc.includes(term) || title.includes(term))) {
    missionScore = 20;
    reasons.push('Strong mission alignment (education technology)');
  } else if (moderateMatchTerms.some(term => desc.includes(term) || title.includes(term))) {
    missionScore = 10;
    reasons.push('Moderate mission alignment (education/community development)');
  }
  score += missionScore;
  
  // 2. Geographic Eligibility (25 points)
  const geo = (grant.geographic_focus || '').toLowerCase();
  const eligibility = (grant.eligibility || '').toLowerCase();
  
  let geoScore = 0;
  if (geo.includes('north carolina') || geo.includes('nc') || eligibility.includes('north carolina')) {
    geoScore = 25;
    reasons.push('North Carolina-specific grant');
  } else if (geo.includes('southeast') || geo.includes('southern states')) {
    geoScore = 20;
    reasons.push('Southeast region eligible');
  } else if (geo.includes('national') || geo.includes('all states') || eligibility.includes('all states')) {
    geoScore = 15;
    reasons.push('National grant (NC eligible)');
  }
  score += geoScore;
  
  // 3. Funding Amount (15 points)
  const amount = grant.amount_max || grant.amount_min || 0;
  let amountScore = 0;
  if (amount >= 100000) {
    amountScore = 15;
    reasons.push(`Major funding opportunity ($${(amount/1000).toFixed(0)}K)`);
  } else if (amount >= 50000) {
    amountScore = 12;
    reasons.push(`Significant funding ($${(amount/1000).toFixed(0)}K)`);
  } else if (amount >= 25000) {
    amountScore = 8;
    reasons.push(`Moderate funding ($${(amount/1000).toFixed(0)}K)`);
  } else if (amount >= 10000) {
    amountScore = 5;
    reasons.push(`Small grant ($${(amount/1000).toFixed(0)}K)`);
  }
  score += amountScore;
  
  // 4. Application Complexity (10 points) - estimate based on description
  let complexityScore = 7; // Default to moderate
  if (desc.includes('letter of inquiry') || desc.includes('simple application')) {
    complexityScore = 10;
    reasons.push('Simple application process');
  } else if (desc.includes('full proposal') || desc.includes('detailed application')) {
    complexityScore = 3;
    reasons.push('Complex application required');
  }
  score += complexityScore;
  
  // 5. Deadline Feasibility (10 points)
  if (grant.deadline) {
    const daysUntilDeadline = Math.floor((new Date(grant.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    let deadlineScore = 0;
    if (daysUntilDeadline >= 60) {
      deadlineScore = 10;
      reasons.push(`Plenty of time to apply (${daysUntilDeadline} days)`);
    } else if (daysUntilDeadline >= 30) {
      deadlineScore = 7;
      reasons.push(`Manageable timeline (${daysUntilDeadline} days)`);
    } else if (daysUntilDeadline >= 15) {
      deadlineScore = 3;
      reasons.push(`Tight deadline (${daysUntilDeadline} days)`);
    }
    score += deadlineScore;
  }
  
  // 6. Eligibility Match (10 points)
  let eligibilityScore = 0;
  if (eligibility.includes('501(c)(3)') || eligibility.includes('nonprofit')) {
    eligibilityScore = 10;
    reasons.push('501(c)(3) nonprofit eligible');
  } else if (eligibility.includes('organization') || eligibility.includes('entity')) {
    eligibilityScore = 5;
    reasons.push('Organization eligible (verify 501c3)');
  }
  score += eligibilityScore;
  
  return {
    score: Math.min(100, Math.round(score)),
    reasons: JSON.stringify(reasons)
  };
}

export {
  searchGrants,
  fetchGrantDetails,
  searchHTIGrants,
  calculateMatchScore,
  HTI_PROFILE
};

