/**
 * Perplexity API Integration
 * Automated business research for lead enrichment
 */

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'llama-3.1-sonar-small-128k-online';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Research a company using Perplexity's web-connected AI
 * @param {Object} params Research parameters
 * @param {string} params.companyName Company name to research
 * @param {string} [params.location] Company location for context
 * @param {string} [params.industry] Industry vertical
 * @returns {Promise<Object>} Enrichment data
 */
export async function researchCompany({ companyName, location, industry }) {
  const apiKey = process.env.HTI_PERPLEXITY_API_KEY;

  if (!apiKey) {
    console.warn('[Perplexity] API key not configured, skipping enrichment');
    return {
      success: false,
      error: 'API key not configured',
      data: null
    };
  }

  const prompt = buildResearchPrompt({ companyName, location, industry });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a business research assistant specializing in technology donation prospects. Provide concise, factual information in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 800
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Perplexity] API error ${response.status}:`, errorText);
      return {
        success: false,
        error: `API returned ${response.status}`,
        data: null
      };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('[Perplexity] Empty response from API');
      return {
        success: false,
        error: 'Empty response',
        data: null
      };
    }

    // Parse JSON response
    const enrichmentData = parseEnrichmentResponse(content);

    console.log(`[Perplexity] Successfully researched ${companyName}`);

    return {
      success: true,
      error: null,
      data: enrichmentData,
      rawResponse: content
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[Perplexity] Request timeout');
      return { success: false, error: 'Request timeout', data: null };
    }

    console.error('[Perplexity] Request failed:', error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Build research prompt for company enrichment
 */
function buildResearchPrompt({ companyName, location, industry }) {
  const locationContext = location ? ` located in ${location}` : '';
  const industryContext = industry ? ` in the ${industry} sector` : '';

  return `Research ${companyName}${locationContext}${industryContext} and provide the following information in JSON format:

{
  "revenue": "estimated annual revenue (e.g. '$50M', 'Unknown')",
  "employees": "employee count or range (e.g. '500-1000', 'Unknown')",
  "industry": "primary industry/sector",
  "industries": ["array", "of", "industry", "tags"],
  "description": "one sentence company description",
  "csr_programs": "corporate social responsibility or donation programs (if known)",
  "tech_focus": "technology focus areas or products",
  "recent_news": "any recent refresh cycles, office moves, or tech upgrades",
  "contact_info": {
    "website": "company website",
    "headquarters": "HQ location"
  },
  "donation_likelihood": "Low|Medium|High - likelihood of device donation based on industry and size",
  "disqualification_reason": "null or reason to disqualify (e.g. 'Political organization', 'Too small', 'Wrong industry')"
}

Focus on facts relevant to technology donation prospects. If information is unavailable, use "Unknown" or null.`;
}

/**
 * Parse Perplexity response into structured data
 */
function parseEnrichmentResponse(content) {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    const parsed = JSON.parse(jsonString);

    return {
      revenue: parsed.revenue || 'Unknown',
      employees: parsed.employees || 'Unknown',
      industry: parsed.industry || 'Unknown',
      industries: Array.isArray(parsed.industries) ? parsed.industries : [],
      description: parsed.description || '',
      csrPrograms: parsed.csr_programs || parsed.csrPrograms || null,
      techFocus: parsed.tech_focus || parsed.techFocus || null,
      recentNews: parsed.recent_news || parsed.recentNews || null,
      contactInfo: parsed.contact_info || parsed.contactInfo || {},
      donationLikelihood: parsed.donation_likelihood || parsed.donationLikelihood || 'Unknown',
      disqualificationReason: parsed.disqualification_reason || parsed.disqualificationReason || null
    };
  } catch (error) {
    console.warn('[Perplexity] Failed to parse JSON response:', error.message);

    // Return raw text as description if JSON parsing fails
    return {
      revenue: 'Unknown',
      employees: 'Unknown',
      industry: 'Unknown',
      industries: [],
      description: content.substring(0, 500),
      csrPrograms: null,
      techFocus: null,
      recentNews: null,
      contactInfo: {},
      donationLikelihood: 'Unknown',
      disqualificationReason: null
    };
  }
}

/**
 * Batch research multiple companies with rate limiting
 * @param {Array} companies Array of {companyName, location, industry}
 * @param {Object} options Rate limiting options
 * @returns {Promise<Array>} Array of enrichment results
 */
export async function batchResearchCompanies(companies, options = {}) {
  const {
    concurrency = 2,
    delayMs = 1000
  } = options;

  const results = [];

  for (let i = 0; i < companies.length; i += concurrency) {
    const batch = companies.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(company => researchCompany(company))
    );

    results.push(...batchResults);

    // Rate limiting delay between batches
    if (i + concurrency < companies.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}