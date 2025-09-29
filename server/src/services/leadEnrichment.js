/**
 * Lead Enrichment Orchestration
 * Coordinates data gathering from multiple sources and applies scoring
 */

import { researchCompany, batchResearchCompanies } from './perplexity.js';
import { calculateLeadScore, getPriorityLabel } from './leadScoring.js';

/**
 * Enrich a single lead with external data and recalculate score
 * @param {Object} lead Lead object to enrich
 * @param {Object} options Enrichment options
 * @returns {Promise<Object>} Enrichment result
 */
export async function enrichLead(lead, options = {}) {
  const {
    skipPerplexity = false,
    updateScore = true
  } = options;

  const enrichmentData = {
    enrichedAt: new Date().toISOString(),
    sources: []
  };

  // 1. Perplexity company research
  if (!skipPerplexity && lead.company) {
    const research = await researchCompany({
      companyName: lead.company,
      location: lead.location,
      industry: lead.industry
    });

    if (research.success) {
      enrichmentData.sources.push('perplexity');
      enrichmentData.perplexity = research.data;
      enrichmentData.rawPerplexityResponse = research.rawResponse;
    } else {
      enrichmentData.perplexityError = research.error;
    }
  }

  // 2. Consolidate enrichment data
  const consolidatedEnrichment = {
    ...(lead.enrichment || {}),
    ...enrichmentData.perplexity,
    enrichedAt: enrichmentData.enrichedAt,
    sources: [...(lead.enrichment?.sources || []), ...enrichmentData.sources]
  };

  // 3. Recalculate score with enriched data
  let scoreData = null;
  if (updateScore) {
    const enrichedLead = {
      ...lead,
      enrichment: consolidatedEnrichment
    };
    scoreData = calculateLeadScore(enrichedLead);
  }

  return {
    success: true,
    enrichment: consolidatedEnrichment,
    score: scoreData,
    metadata: {
      sourcesUsed: enrichmentData.sources,
      enrichedAt: enrichmentData.enrichedAt,
      perplexityError: enrichmentData.perplexityError || null
    }
  };
}

/**
 * Enrich multiple leads in batch with rate limiting
 * @param {Array} leads Array of lead objects
 * @param {Object} options Batch options
 * @returns {Promise<Array>} Array of enrichment results
 */
export async function batchEnrichLeads(leads, options = {}) {
  const {
    concurrency = 2,
    delayMs = 1000,
    skipPerplexity = false,
    updateScore = true,
    filterFn = null
  } = options;

  // Filter leads if needed
  const leadsToEnrich = filterFn ? leads.filter(filterFn) : leads;

  console.log(`[Enrichment] Starting batch enrichment for ${leadsToEnrich.length} leads`);

  const results = [];

  for (let i = 0; i < leadsToEnrich.length; i += concurrency) {
    const batch = leadsToEnrich.slice(i, i + concurrency);

    console.log(`[Enrichment] Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(leadsToEnrich.length / concurrency)}`);

    const batchResults = await Promise.all(
      batch.map(lead => enrichLead(lead, { skipPerplexity, updateScore }))
    );

    results.push(...batchResults);

    // Rate limiting between batches
    if (i + concurrency < leadsToEnrich.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`[Enrichment] Batch complete: ${successCount}/${results.length} succeeded`);

  return results;
}

/**
 * Smart enrichment: Only enrich leads that need it
 * @param {Array} leads Array of lead objects
 * @param {Object} options Enrichment options
 */
export async function smartEnrichLeads(leads, options = {}) {
  const {
    maxAge = 30 * 24 * 60 * 60 * 1000, // 30 days
    minPriority = 60, // Only enrich medium+ priority leads
    ...batchOptions
  } = options;

  const now = Date.now();

  const filterFn = (lead) => {
    // Skip if recently enriched
    if (lead.enrichment?.enrichedAt) {
      const enrichedAt = new Date(lead.enrichment.enrichedAt).getTime();
      if (now - enrichedAt < maxAge) {
        return false;
      }
    }

    // Skip low priority unless no enrichment exists
    if (lead.priority < minPriority && lead.enrichment?.enrichedAt) {
      return false;
    }

    // Must have company name
    if (!lead.company) {
      return false;
    }

    return true;
  };

  return batchEnrichLeads(leads, {
    ...batchOptions,
    filterFn
  });
}

/**
 * Recalculate score for a lead without enrichment
 * @param {Object} lead Lead object
 * @returns {Object} Score data
 */
export function rescoreLead(lead) {
  const scoreData = calculateLeadScore(lead);

  return {
    success: true,
    score: scoreData,
    priority: scoreData.total,
    priorityLabel: getPriorityLabel(scoreData.total),
    scoredAt: scoreData.lastScoredAt
  };
}

/**
 * Batch rescore leads
 * @param {Array} leads Array of lead objects
 * @returns {Array} Array of score results
 */
export function batchRescoreLeads(leads) {
  return leads.map(lead => ({
    id: lead.id,
    ...rescoreLead(lead)
  }));
}

/**
 * Get enrichment summary for a lead
 * @param {Object} lead Lead object
 * @returns {Object} Summary of enrichment status
 */
export function getEnrichmentSummary(lead) {
  const enrichment = lead.enrichment || {};

  return {
    isEnriched: Boolean(enrichment.enrichedAt),
    enrichedAt: enrichment.enrichedAt || null,
    sources: enrichment.sources || [],
    hasRevenue: Boolean(enrichment.revenue && enrichment.revenue !== 'Unknown'),
    hasEmployees: Boolean(enrichment.employees && enrichment.employees !== 'Unknown'),
    hasIndustry: Boolean(enrichment.industry && enrichment.industry !== 'Unknown'),
    hasDescription: Boolean(enrichment.description),
    donationLikelihood: enrichment.donationLikelihood || 'Unknown',
    disqualificationReason: enrichment.disqualificationReason || null,
    completeness: calculateEnrichmentCompleteness(enrichment)
  };
}

/**
 * Calculate enrichment data completeness (0-100)
 */
function calculateEnrichmentCompleteness(enrichment) {
  if (!enrichment || !enrichment.enrichedAt) return 0;

  let score = 0;
  const fields = [
    { key: 'revenue', weight: 15 },
    { key: 'employees', weight: 15 },
    { key: 'industry', weight: 15 },
    { key: 'description', weight: 10 },
    { key: 'industries', weight: 10, check: (v) => Array.isArray(v) && v.length > 0 },
    { key: 'csrPrograms', weight: 10 },
    { key: 'techFocus', weight: 10 },
    { key: 'contactInfo', weight: 10, check: (v) => v && Object.keys(v).length > 0 },
    { key: 'donationLikelihood', weight: 5 }
  ];

  for (const field of fields) {
    const value = enrichment[field.key];
    const check = field.check || ((v) => v && v !== 'Unknown');

    if (check(value)) {
      score += field.weight;
    }
  }

  return Math.min(100, score);
}