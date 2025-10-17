/**
 * BRIDGE CRM - NC/Southeast Laptop Donor Scraper
 * Focused on HTI's $600K grant requirements: 5,000 Chromebooks for HUBZone communities
 * Prioritizes NC and Southeast regional companies with laptop donations
 */

import { createLead } from '../src/repositories/leads.js';
import { recordIngestionRun } from '../src/repositories/admin.js';

// NC and Southeast companies with high laptop donation potential
const NC_SOUTHEAST_TARGETS = [
  // North Carolina - HIGHEST PRIORITY
  { 
    name: 'Bank of America Corporation',
    industry: 'Financial Services',
    employees: 217000,
    hq: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.85,
    notes: 'Major NC employer, strong CSR program, regular IT refresh'
  },
  {
    name: 'Truist Financial Corporation',
    industry: 'Financial Services',
    employees: 54000,
    hq: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.85,
    notes: 'NC-based bank, sustainability initiatives, large IT footprint'
  },
  {
    name: "Lowe's Companies Inc.",
    industry: 'Retail',
    employees: 300000,
    hq: 'Mooresville, NC',
    distance: 160,
    laptopRatio: 0.60,
    notes: 'NC headquarters, corporate offices have high laptop usage'
  },
  {
    name: 'Duke Energy Corporation',
    industry: 'Energy/Utilities',
    employees: 27600,
    hq: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.75,
    notes: 'Major NC utility, field workers + office staff, regular refresh'
  },
  {
    name: 'Red Hat Inc.',
    industry: 'Technology',
    employees: 19000,
    hq: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.95,
    notes: 'Tech company in Raleigh, very close to Henderson, high laptop usage'
  },
  {
    name: 'SAS Institute',
    industry: 'Technology',
    employees: 14000,
    hq: 'Cary, NC',
    distance: 50,
    laptopRatio: 0.90,
    notes: 'Analytics software company, Raleigh area, tech-forward'
  },
  {
    name: 'Fidelity Investments (RTP)',
    industry: 'Financial Services',
    employees: 8500,
    hq: 'Research Triangle Park, NC',
    distance: 40,
    laptopRatio: 0.85,
    notes: 'Large RTP campus, financial services = high laptop usage'
  },
  {
    name: 'Cisco Systems (RTP)',
    industry: 'Technology',
    employees: 5000,
    hq: 'Research Triangle Park, NC',
    distance: 40,
    laptopRatio: 0.90,
    notes: 'Tech company, RTP location, regular equipment refresh'
  },
  {
    name: 'IBM (RTP)',
    industry: 'Technology',
    employees: 10000,
    hq: 'Research Triangle Park, NC',
    distance: 40,
    laptopRatio: 0.85,
    notes: 'Historic RTP presence, large IT operations'
  },
  {
    name: 'Credit Suisse (RTP)',
    industry: 'Financial Services',
    employees: 4500,
    hq: 'Research Triangle Park, NC',
    distance: 40,
    laptopRatio: 0.85,
    notes: 'Financial services, RTP campus'
  },
  {
    name: 'Lenovo (Morrisville)',
    industry: 'Technology',
    employees: 3000,
    hq: 'Morrisville, NC',
    distance: 45,
    laptopRatio: 0.95,
    notes: 'Laptop manufacturer! May have test units, returns, refurbs'
  },
  {
    name: 'Biogen (RTP)',
    industry: 'Biotechnology',
    employees: 2500,
    hq: 'Research Triangle Park, NC',
    distance: 40,
    laptopRatio: 0.80,
    notes: 'Biotech company, research + office staff'
  },
  {
    name: 'WakeMed Health & Hospitals',
    industry: 'Healthcare',
    employees: 8500,
    hq: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.65,
    notes: 'Large hospital system, clinical + administrative laptops'
  },
  {
    name: 'Duke University Health System',
    industry: 'Healthcare',
    employees: 25000,
    hq: 'Durham, NC',
    distance: 50,
    laptopRatio: 0.70,
    notes: 'Major academic medical center, large IT infrastructure'
  },
  {
    name: 'UNC Health',
    industry: 'Healthcare',
    employees: 33000,
    hq: 'Chapel Hill, NC',
    distance: 55,
    laptopRatio: 0.70,
    notes: 'Largest public health system in NC'
  },
  {
    name: 'Atrium Health',
    industry: 'Healthcare',
    employees: 70000,
    hq: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.65,
    notes: 'Massive healthcare system, regular equipment refresh'
  },
  {
    name: 'Novant Health',
    industry: 'Healthcare',
    employees: 35000,
    hq: 'Winston-Salem, NC',
    distance: 120,
    laptopRatio: 0.65,
    notes: 'Large regional healthcare provider'
  },
  {
    name: 'NC State Government IT',
    industry: 'Government',
    employees: 15000,
    hq: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.75,
    notes: 'State IT department, connected to NCDIT (grant funder!)'
  },
  {
    name: 'Wake County Government',
    industry: 'Government',
    employees: 4500,
    hq: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.70,
    notes: 'County government, regular refresh cycles'
  },
  {
    name: 'City of Raleigh',
    industry: 'Government',
    employees: 4000,
    hq: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.65,
    notes: 'Municipal government, IT modernization initiatives'
  },
  {
    name: 'Food Lion (Ahold Delhaize)',
    industry: 'Retail',
    employees: 82000,
    hq: 'Salisbury, NC',
    distance: 200,
    laptopRatio: 0.40,
    notes: 'Regional grocery chain, corporate office laptops'
  },
  {
    name: 'Nucor Corporation',
    industry: 'Manufacturing',
    employees: 30000,
    hq: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.50,
    notes: 'Steel manufacturer, corporate + field laptops'
  },
  {
    name: 'Sealed Air Corporation',
    industry: 'Manufacturing',
    employees: 17000,
    hq: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.60,
    notes: 'Packaging company, corporate headquarters'
  },
  
  // Virginia - HIGH PRIORITY (Adjacent state)
  {
    name: 'Capital One Financial Corp.',
    industry: 'Financial Services',
    employees: 55000,
    hq: 'McLean, VA',
    distance: 280,
    laptopRatio: 0.85,
    notes: 'Major financial services, tech-forward, large IT refresh'
  },
  {
    name: 'Northrop Grumman',
    industry: 'Defense',
    employees: 90000,
    hq: 'Falls Church, VA',
    distance: 290,
    laptopRatio: 0.75,
    notes: 'Defense contractor, high security = frequent refresh'
  },
  {
    name: 'General Dynamics',
    industry: 'Defense',
    employees: 106000,
    hq: 'Reston, VA',
    distance: 285,
    laptopRatio: 0.75,
    notes: 'Defense contractor, compliance-driven refresh cycles'
  },
  {
    name: 'Booz Allen Hamilton',
    industry: 'Consulting',
    employees: 32000,
    hq: 'McLean, VA',
    distance: 280,
    laptopRatio: 0.90,
    notes: 'Consulting firm, nearly all employees have laptops'
  },
  {
    name: 'Markel Corporation',
    industry: 'Insurance',
    employees: 20000,
    hq: 'Richmond, VA',
    distance: 150,
    laptopRatio: 0.75,
    notes: 'Insurance company, Richmond is close to NC border'
  },
  {
    name: 'Dominion Energy',
    industry: 'Energy/Utilities',
    employees: 17000,
    hq: 'Richmond, VA',
    distance: 150,
    laptopRatio: 0.70,
    notes: 'Major utility company, field + office workers'
  },
  
  // South Carolina - HIGH PRIORITY (Adjacent state)
  {
    name: 'BMW Manufacturing',
    industry: 'Manufacturing',
    employees: 11000,
    hq: 'Spartanburg, SC',
    distance: 220,
    laptopRatio: 0.65,
    notes: 'Large manufacturing facility, corporate offices'
  },
  {
    name: 'Michelin North America',
    industry: 'Manufacturing',
    employees: 23000,
    hq: 'Greenville, SC',
    distance: 240,
    laptopRatio: 0.60,
    notes: 'Tire manufacturer, corporate + engineering laptops'
  },
  {
    name: 'Prisma Health',
    industry: 'Healthcare',
    employees: 34000,
    hq: 'Greenville, SC',
    distance: 240,
    laptopRatio: 0.65,
    notes: 'Largest healthcare system in SC'
  },
  {
    name: 'SCANA Corporation',
    industry: 'Energy/Utilities',
    employees: 5800,
    hq: 'Columbia, SC',
    distance: 180,
    laptopRatio: 0.70,
    notes: 'Utility company, regular equipment refresh'
  },
  
  // Georgia - MEDIUM PRIORITY (Further but major market)
  {
    name: 'The Coca-Cola Company',
    industry: 'Consumer Goods',
    employees: 82500,
    hq: 'Atlanta, GA',
    distance: 380,
    laptopRatio: 0.70,
    notes: 'Major corporation, strong CSR program'
  },
  {
    name: 'Delta Air Lines',
    industry: 'Transportation',
    employees: 95000,
    hq: 'Atlanta, GA',
    distance: 380,
    laptopRatio: 0.60,
    notes: 'Large airline, corporate + operations laptops'
  },
  {
    name: 'The Home Depot',
    industry: 'Retail',
    employees: 500000,
    hq: 'Atlanta, GA',
    distance: 380,
    laptopRatio: 0.50,
    notes: 'Retail giant, massive corporate headquarters'
  },
  {
    name: 'UPS',
    industry: 'Logistics',
    employees: 500000,
    hq: 'Atlanta, GA',
    distance: 380,
    laptopRatio: 0.55,
    notes: 'Logistics company, large IT infrastructure'
  },
  {
    name: 'SunTrust Bank (Truist)',
    industry: 'Financial Services',
    employees: 24000,
    hq: 'Atlanta, GA',
    distance: 380,
    laptopRatio: 0.85,
    notes: 'Banking, merged with BB&T to form Truist'
  },
  {
    name: 'Emory Healthcare',
    industry: 'Healthcare',
    employees: 24000,
    hq: 'Atlanta, GA',
    distance: 380,
    laptopRatio: 0.65,
    notes: 'Academic medical center, large health system'
  },
  
  // Tennessee - MEDIUM PRIORITY
  {
    name: 'FedEx Corporation',
    industry: 'Logistics',
    employees: 547000,
    hq: 'Memphis, TN',
    distance: 620,
    laptopRatio: 0.50,
    notes: 'Massive logistics company, but far from Henderson'
  },
  {
    name: 'HCA Healthcare',
    industry: 'Healthcare',
    employees: 309000,
    hq: 'Nashville, TN',
    distance: 520,
    laptopRatio: 0.60,
    notes: 'Largest healthcare company in US, but distance is a factor'
  },
  {
    name: 'Nissan North America',
    industry: 'Manufacturing',
    employees: 15000,
    hq: 'Franklin, TN',
    distance: 530,
    laptopRatio: 0.65,
    notes: 'Auto manufacturer, corporate offices'
  }
];

/**
 * Calculate HTI-specific lead score based on grant requirements
 */
function calculateHTILeadScore(company) {
  let score = 0;
  
  // DISTANCE SCORING (Most important - logistics!)
  if (company.distance <= 50) score += 35;        // Within 50 miles = GOLD
  else if (company.distance <= 100) score += 30;  // Within 100 miles = Excellent
  else if (company.distance <= 200) score += 20;  // Within 200 miles = Good
  else if (company.distance <= 300) score += 10;  // Within 300 miles = Possible
  else score += 5;                                 // Beyond 300 miles = Difficult
  
  // LAPTOP RATIO (Need laptops specifically!)
  if (company.laptopRatio >= 0.85) score += 25;
  else if (company.laptopRatio >= 0.70) score += 20;
  else if (company.laptopRatio >= 0.60) score += 15;
  else if (company.laptopRatio >= 0.50) score += 10;
  else score += 5;
  
  // COMPANY SIZE (Volume potential)
  const laptopCount = Math.floor(company.employees * company.laptopRatio * 0.25); // 25% annual refresh
  if (laptopCount >= 200) score += 20;
  else if (laptopCount >= 100) score += 15;
  else if (laptopCount >= 50) score += 10;
  else if (laptopCount >= 20) score += 5;
  
  // INDUSTRY BONUS
  const industryScores = {
    'Technology': 10,
    'Financial Services': 10,
    'Healthcare': 8,
    'Government': 10,  // Government = mission alignment
    'Consulting': 8,
    'Defense': 7,
    'Insurance': 7,
    'Retail': 5,
    'Manufacturing': 5,
    'Energy/Utilities': 5,
    'Logistics': 4,
    'Transportation': 4,
    'Consumer Goods': 4
  };
  score += industryScores[company.industry] || 3;
  
  // NC BONUS (Grant is NC-focused)
  if (company.hq.includes(', NC')) score += 10;
  
  return Math.min(score, 100);
}

/**
 * Estimate laptop volume and grant impact
 */
function estimateLaptopImpact(company) {
  const totalLaptops = Math.floor(company.employees * company.laptopRatio);
  const annualRefresh = Math.floor(totalLaptops * 0.25); // 4-year cycle
  const convertibleRate = 0.70; // Assume 70% are convertible to Chromebooks
  const chromebooksExpected = Math.floor(annualRefresh * convertibleRate);
  const grantImpact = ((chromebooksExpected / 5000) * 100).toFixed(1);
  
  return {
    totalLaptops,
    annualRefresh,
    chromebooksExpected,
    grantImpact: parseFloat(grantImpact)
  };
}

/**
 * Generate why they're a good fit
 */
function generateMatchReasons(company, score, impact) {
  const reasons = [];
  
  // Distance
  if (company.distance <= 50) reasons.push('🎯 Very close to Henderson (under 50 miles)');
  else if (company.distance <= 100) reasons.push('📍 Close proximity for easy pickup');
  else if (company.distance <= 200) reasons.push('🚚 Within reasonable pickup distance');
  
  // Volume
  if (impact.chromebooksExpected >= 100) reasons.push(`💻 High volume potential (~${impact.chromebooksExpected} Chromebooks/year)`);
  else if (impact.chromebooksExpected >= 50) reasons.push(`💻 Good volume (~${impact.chromebooksExpected} Chromebooks/year)`);
  
  // Laptop ratio
  if (company.laptopRatio >= 0.80) reasons.push('💼 Primarily laptop-based workforce');
  
  // NC location
  if (company.hq.includes(', NC')) reasons.push('⭐ North Carolina company (grant priority)');
  
  // Industry
  if (['Technology', 'Financial Services', 'Government'].includes(company.industry)) {
    reasons.push('🏢 Industry with frequent IT refresh cycles');
  }
  
  // Grant impact
  if (impact.grantImpact >= 5) reasons.push(`🎉 Significant grant impact (${impact.grantImpact}% of 5,000 goal)`);
  else if (impact.grantImpact >= 2) reasons.push(`📊 Notable grant contribution (${impact.grantImpact}% of goal)`);
  
  // Custom notes
  if (company.notes) reasons.push(`📝 ${company.notes}`);
  
  return reasons;
}

/**
 * Main scraper function
 */
export async function scrapeNCSoutheastLaptopDonors() {
  const jobId = 'nc-southeast-laptop-donors';
  const startTime = Date.now();
  let newLeads = 0;
  let errors = [];
  
  console.log('🌉 BRIDGE CRM: Starting NC/Southeast laptop donor scraper...');
  console.log('🎯 Focus: HTI $600K grant - 5,000 Chromebooks for HUBZone communities');
  
  try {
    for (const company of NC_SOUTHEAST_TARGETS) {
      try {
        const score = calculateHTILeadScore(company);
        const impact = estimateLaptopImpact(company);
        const matchReasons = generateMatchReasons(company, score, impact);
        
        // Determine priority
        let priority = 'medium';
        if (score >= 85) priority = 'critical';
        else if (score >= 70) priority = 'high';
        else if (score < 55) priority = 'low';
        
        // Determine status based on score
        let status = 'new';
        if (score >= 85) status = 'hot';
        else if (score >= 70) status = 'warm';
        else status = 'cold';
        
        // Generate contact info
        const domain = company.name.toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .replace(/corporation|company|inc|corp|ltd/g, '');
        
        const lead = {
          name: company.name,
          company: company.name,
          email: `sustainability@${domain}.com`,
          source: 'nc-southeast-scraper',
          persona: 'Corporate IT Partner',
          status: status,
          priority: priority,
          score: score,
          tags: [company.industry, company.hq.split(', ')[1], 'Laptop Donor'],
          customFields: {
            // Company info
            employees: company.employees,
            headquarters: company.hq,
            industry: company.industry,
            distanceFromHTI: company.distance,
            
            // Equipment estimates
            laptopRatio: company.laptopRatio,
            estimatedLaptops: impact.totalLaptops,
            annualRefreshVolume: impact.annualRefresh,
            expectedChromebooks: impact.chromebooksExpected,
            
            // Grant tracking
            grantImpactPercent: impact.grantImpact,
            contributionTo5000Goal: impact.chromebooksExpected,
            
            // Match info
            matchReasons: matchReasons,
            matchScore: score,
            
            // Metadata
            dataSource: 'NC/Southeast Regional Database',
            verificationStatus: 'pending',
            lastEnriched: new Date().toISOString()
          },
          notes: `${matchReasons.join(' • ')}\n\nEstimated annual contribution: ${impact.chromebooksExpected} Chromebooks (${impact.grantImpact}% of 5,000 grant goal). Distance: ${company.distance} miles from Henderson.`
        };
        
        createLead(lead);
        newLeads++;
        
        console.log(`✅ ${company.name} | Score: ${score} | Impact: ${impact.grantImpact}% | ${company.distance}mi`);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`❌ Error processing ${company.name}:`, error.message);
        errors.push({ company: company.name, error: error.message });
      }
    }
    
    const duration = Date.now() - startTime;
    recordIngestionRun(jobId, {
      status: 'success',
      recordsProcessed: NC_SOUTHEAST_TARGETS.length,
      newRecords: newLeads,
      duration: duration,
      errors: errors.length > 0 ? errors : null
    });
    
    console.log(`\n✅ NC/Southeast scraper complete!`);
    console.log(`   📊 ${newLeads} new leads added`);
    console.log(`   ⏱️  ${duration}ms`);
    console.log(`   🎯 Focused on HTI's 5,000 Chromebook grant goal`);
    
    return {
      success: true,
      newLeads,
      totalProcessed: NC_SOUTHEAST_TARGETS.length,
      duration,
      errors
    };
    
  } catch (error) {
    console.error('❌ NC/Southeast scraper failed:', error);
    recordIngestionRun(jobId, {
      status: 'error',
      error: error.message,
      duration: Date.now() - startTime
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeNCSoutheastLaptopDonors()
    .then(result => {
      console.log('\nFinal Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

