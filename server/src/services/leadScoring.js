/**
 * Advanced Lead Scoring Engine
 * 100-point system across 4 categories: Alignment, Engagement, Capacity, Timing
 */

// HubZone qualified counties (sample - expand as needed)
const HUBZONE_COUNTIES = new Set([
  'Robeson County, NC',
  'Columbus County, NC',
  'Scotland County, NC',
  'Hoke County, NC',
  'Anson County, NC',
  'Richmond County, NC',
  'Bladen County, NC',
  'Sampson County, NC'
]);

// Target industries for technology donation
const TARGET_INDUSTRIES = new Set([
  'construction',
  'horticulture',
  'retail',
  'healthcare',
  'education',
  'technology',
  'manufacturing',
  'logistics'
]);

// Disqualification rules
const DISQUALIFICATION_RULES = {
  maxDistanceMiles: 500,
  minRevenue: 100000,
  excludedTypes: ['political', 'religious', 'gambling', 'tobacco', 'weapons']
};

/**
 * Calculate comprehensive lead score with category breakdown
 * @param {Object} lead Lead object with all available data
 * @returns {Object} Score breakdown and total
 */
export function calculateLeadScore(lead) {
  // Check disqualification first
  const disqualification = checkDisqualification(lead);
  if (disqualification.disqualified) {
    return {
      total: 0,
      breakdown: {
        alignment: 0,
        engagement: 0,
        capacity: 0,
        timing: 0
      },
      disqualified: true,
      disqualificationReason: disqualification.reason,
      lastScoredAt: new Date().toISOString()
    };
  }

  // Calculate each category (0-25 points each)
  const alignment = scoreAlignment(lead);
  const engagement = scoreEngagement(lead);
  const capacity = scoreCapacity(lead);
  const timing = scoreTiming(lead);

  const total = Math.round(alignment + engagement + capacity + timing);

  return {
    total,
    breakdown: {
      alignment: Math.round(alignment),
      engagement: Math.round(engagement),
      capacity: Math.round(capacity),
      timing: Math.round(timing)
    },
    disqualified: false,
    disqualificationReason: null,
    lastScoredAt: new Date().toISOString()
  };
}

/**
 * CATEGORY 1: Alignment (0-25 points)
 * Mission fit, industry targeting, HubZone proximity
 */
function scoreAlignment(lead) {
  let score = 0;

  // Industry alignment (0-10 points)
  const industries = lead.enrichment?.industries || [];
  const industry = lead.enrichment?.industry || lead.industry || '';
  const industryMatch = industries.some(i => TARGET_INDUSTRIES.has(i.toLowerCase())) ||
                        TARGET_INDUSTRIES.has(industry.toLowerCase());

  if (industryMatch) {
    score += 10;
  } else if (industries.length > 0 || industry) {
    score += 5; // Partial credit for having industry data
  }

  // HubZone proximity (0-8 points)
  const location = lead.location || lead.enrichment?.contactInfo?.headquarters || '';
  if (location && HUBZONE_COUNTIES.has(location)) {
    score += 8;
  } else if (location.includes('NC') || location.includes('North Carolina')) {
    score += 4;
  } else if (location) {
    score += 2;
  }

  // Persona alignment (0-7 points)
  const personaBonus = {
    'Tech Refresh Donor': 7,
    'Corporate IT Partner': 6,
    'Healthcare System': 5,
    'Education Partner': 5,
    'Government Procurement': 4,
    'Government Surplus': 3,
    'Logistics Hotshot': 3
  }[lead.persona] || 0;
  score += personaBonus;

  return Math.min(25, score);
}

/**
 * CATEGORY 2: Engagement (0-25 points)
 * Contact quality, communication history, relationship strength
 */
function scoreEngagement(lead) {
  let score = 0;

  // Contact completeness (0-8 points)
  const hasEmail = Boolean(lead.email);
  const hasPhone = Boolean(lead.phone);
  const hasContact = Boolean(lead.contact);
  const hasCompany = Boolean(lead.company);

  if (hasEmail) score += 3;
  if (hasPhone) score += 2;
  if (hasContact) score += 2;
  if (hasCompany) score += 1;

  // Source quality (0-10 points)
  const sourceWeights = {
    'Professional Referral': 10,
    'LinkedIn': 9,
    'Reddit (r/sysadmin)': 8,
    'Reddit (r/ITManagers)': 8,
    'Community Tip': 8,
    'SAM.gov': 7,
    'Corporate Refresh Monitor': 7,
    'Data.gov': 5,
    'GovDeals': 4,
    'Reddit': 6
  };
  score += sourceWeights[lead.source] || 3;

  // Interaction history (0-7 points)
  const status = lead.status || 'New';
  const statusPoints = {
    'Qualified': 7,
    'Proposal Sent': 6,
    'Negotiating': 6,
    'Initial Contact': 4,
    'Researching': 3,
    'New': 1
  }[status] || 0;
  score += statusPoints;

  return Math.min(25, score);
}

/**
 * CATEGORY 3: Capacity (0-25 points)
 * Device volume, logistics viability, revenue size
 */
function scoreCapacity(lead) {
  let score = 0;

  // Device quantity (0-12 points)
  const quantity = Number(lead.estimatedQuantity || 0);
  if (quantity >= 1000) {
    score += 12;
  } else if (quantity >= 500) {
    score += 10;
  } else if (quantity >= 200) {
    score += 8;
  } else if (quantity >= 100) {
    score += 6;
  } else if (quantity >= 50) {
    score += 4;
  } else if (quantity > 0) {
    score += 2;
  }

  // Logistics (0-6 points)
  if (lead.logistics?.onsitePickup) score += 4;
  if (lead.logistics?.freightFriendly) score += 2;

  // Company size (0-7 points)
  const employees = parseEmployeeCount(lead.enrichment?.employees);
  if (employees >= 1000) {
    score += 7;
  } else if (employees >= 500) {
    score += 6;
  } else if (employees >= 100) {
    score += 4;
  } else if (employees >= 50) {
    score += 2;
  }

  return Math.min(25, score);
}

/**
 * CATEGORY 4: Timing (0-25 points)
 * Urgency, follow-up proximity, grant alignment
 */
function scoreTiming(lead) {
  let score = 0;

  // Timeline urgency (0-10 points)
  const timeline = (lead.timeline || '').toLowerCase();
  if (timeline.includes('immediate') || timeline.includes('asap')) {
    score += 10;
  } else if (timeline.includes('urgent') || timeline.includes('this month')) {
    score += 8;
  } else if (timeline.includes('quarter') || timeline.includes('q1') || timeline.includes('q2')) {
    score += 5;
  } else if (timeline.includes('year')) {
    score += 3;
  }

  // Follow-up proximity (0-8 points)
  if (lead.followUpDate) {
    const followUp = new Date(lead.followUpDate);
    if (!isNaN(followUp.getTime())) {
      const daysOut = Math.round((followUp.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      if (daysOut <= 3) {
        score += 8;
      } else if (daysOut <= 7) {
        score += 6;
      } else if (daysOut <= 14) {
        score += 4;
      } else if (daysOut <= 30) {
        score += 2;
      }
    }
  }

  // Grant/program alignment (0-7 points)
  const notes = (lead.notes || '').toLowerCase();
  if (lead.grantFlag || notes.includes('grant county') || notes.includes('digital literacy')) {
    score += 7;
  } else if (notes.includes('nonprofit') || notes.includes('community')) {
    score += 4;
  }

  return Math.min(25, score);
}

/**
 * Check if lead should be disqualified
 */
function checkDisqualification(lead) {
  const enrichment = lead.enrichment || {};

  // Distance check (if coordinates available)
  if (lead.distance && lead.distance > DISQUALIFICATION_RULES.maxDistanceMiles) {
    return {
      disqualified: true,
      reason: `Distance exceeds ${DISQUALIFICATION_RULES.maxDistanceMiles} miles`
    };
  }

  // Revenue check
  const revenue = parseRevenue(enrichment.revenue);
  if (revenue > 0 && revenue < DISQUALIFICATION_RULES.minRevenue) {
    return {
      disqualified: true,
      reason: 'Company revenue too low'
    };
  }

  // Industry exclusions (political, religious, etc.)
  const disqualificationReason = enrichment.disqualificationReason;
  if (disqualificationReason) {
    return {
      disqualified: true,
      reason: disqualificationReason
    };
  }

  // Type exclusions
  const description = (enrichment.description || '').toLowerCase();
  const industry = (enrichment.industry || '').toLowerCase();
  const company = (lead.company || '').toLowerCase();

  const combinedText = `${description} ${industry} ${company}`;

  for (const excludedType of DISQUALIFICATION_RULES.excludedTypes) {
    if (combinedText.includes(excludedType)) {
      return {
        disqualified: true,
        reason: `Excluded type: ${excludedType}`
      };
    }
  }

  return { disqualified: false, reason: null };
}

/**
 * Helper: Parse employee count from various formats
 */
function parseEmployeeCount(employeesStr) {
  if (!employeesStr || employeesStr === 'Unknown') return 0;

  // Handle ranges like "500-1000"
  const rangeMatch = employeesStr.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) {
    return parseInt(rangeMatch[1], 10);
  }

  // Handle "1000+" format
  const plusMatch = employeesStr.match(/(\d+)\+/);
  if (plusMatch) {
    return parseInt(plusMatch[1], 10);
  }

  // Direct number
  const numMatch = employeesStr.match(/\d+/);
  return numMatch ? parseInt(numMatch[0], 10) : 0;
}

/**
 * Helper: Parse revenue from various formats
 */
function parseRevenue(revenueStr) {
  if (!revenueStr || revenueStr === 'Unknown') return 0;

  const cleaned = revenueStr.replace(/[$,\s]/g, '');

  // Handle "50M" format
  if (cleaned.includes('M')) {
    const num = parseFloat(cleaned.replace('M', ''));
    return num * 1000000;
  }

  // Handle "1B" format
  if (cleaned.includes('B')) {
    const num = parseFloat(cleaned.replace('B', ''));
    return num * 1000000000;
  }

  // Direct number
  return parseFloat(cleaned) || 0;
}

/**
 * Get priority label from score
 */
export function getPriorityLabel(score) {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium';
  if (score >= 40) return 'Low';
  return 'Very Low';
}

/**
 * Batch score multiple leads
 */
export function batchScoreLeads(leads) {
  return leads.map(lead => ({
    id: lead.id,
    score: calculateLeadScore(lead)
  }));
}