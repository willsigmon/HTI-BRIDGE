/**
 * BRIDGE CRM - Professional Services Multi-Vertical Scraper
 * Focuses on accessible, realistic laptop donors in NC/Southeast
 * 
 * Target Verticals:
 * 1. Legal Services
 * 2. Accounting & Finance
 * 3. Healthcare Private Practices
 * 4. Public Safety
 * 5. Real Estate & Property
 * 6. Engineering & Architecture
 * 7. Marketing & Creative
 * 8. IT & Technology Services
 * 9. Construction & Trades
 * 10. Insurance Agencies
 * 11. Nonprofit Organizations
 * 12. Private Education
 * 13. Hospitality Management
 * 14. Manufacturing & Distribution
 */

import { createLead } from '../src/repositories/leads.js';
import { recordIngestionRun } from '../src/repositories/admin.js';

// NC/Southeast Professional Services - High-probability laptop donors
const PROFESSIONAL_SERVICES_TARGETS = [
  
  // ===== LEGAL SERVICES =====
  {
    name: 'Smith Anderson Law Firm',
    vertical: 'Legal Services',
    type: 'Law Firm',
    employees: 200,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.95,
    notes: 'Major NC law firm, all attorneys have laptops, regular refresh'
  },
  {
    name: 'Robinson Bradshaw',
    vertical: 'Legal Services',
    type: 'Law Firm',
    employees: 180,
    location: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.95,
    notes: 'Charlotte-based law firm, corporate practice'
  },
  {
    name: 'Brooks Pierce',
    vertical: 'Legal Services',
    type: 'Law Firm',
    employees: 150,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.95,
    notes: 'Raleigh law firm, business and litigation'
  },
  {
    name: 'Ward and Smith PA',
    vertical: 'Legal Services',
    type: 'Law Firm',
    employees: 120,
    location: 'New Bern, NC',
    distance: 95,
    laptopRatio: 0.95,
    notes: 'Eastern NC law firm, multiple offices'
  },
  {
    name: 'Womble Bond Dickinson',
    vertical: 'Legal Services',
    type: 'Law Firm',
    employees: 300,
    location: 'Winston-Salem, NC',
    distance: 120,
    laptopRatio: 0.95,
    notes: 'Large regional law firm, international presence'
  },
  
  // ===== ACCOUNTING & FINANCE =====
  {
    name: 'Cherry Bekaert LLP',
    vertical: 'Accounting & Finance',
    type: 'CPA Firm',
    employees: 250,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.90,
    notes: 'Top regional CPA firm, tax and audit services'
  },
  {
    name: 'Dixon Hughes Goodman',
    vertical: 'Accounting & Finance',
    type: 'CPA Firm',
    employees: 400,
    location: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.90,
    notes: 'Large accounting firm, multiple SE offices'
  },
  {
    name: 'Elliott Davis',
    vertical: 'Accounting & Finance',
    type: 'CPA Firm',
    employees: 180,
    location: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.90,
    notes: 'Regional CPA and consulting firm'
  },
  {
    name: 'Martin Starnes & Associates',
    vertical: 'Accounting & Finance',
    type: 'CPA Firm',
    employees: 100,
    location: 'Hickory, NC',
    distance: 140,
    laptopRatio: 0.90,
    notes: 'Western NC accounting firm'
  },
  {
    name: 'Edward Jones (Raleigh Branch)',
    vertical: 'Accounting & Finance',
    type: 'Financial Advisory',
    employees: 80,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.85,
    notes: 'Financial advisors, all advisors have laptops'
  },
  
  // ===== HEALTHCARE PRIVATE PRACTICES =====
  {
    name: 'Raleigh Orthopedic Clinic',
    vertical: 'Healthcare Private Practices',
    type: 'Medical Practice',
    employees: 120,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.70,
    notes: 'Large orthopedic practice, admin + clinical laptops'
  },
  {
    name: 'Carolina Dental Arts',
    vertical: 'Healthcare Private Practices',
    type: 'Dental Practice',
    employees: 45,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.65,
    notes: 'Multi-location dental practice'
  },
  {
    name: 'Banfield Pet Hospital (Regional)',
    vertical: 'Healthcare Private Practices',
    type: 'Veterinary',
    employees: 200,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.60,
    notes: 'Veterinary chain, regional offices'
  },
  {
    name: 'Carolina Physical Therapy',
    vertical: 'Healthcare Private Practices',
    type: 'Physical Therapy',
    employees: 85,
    location: 'Durham, NC',
    distance: 50,
    laptopRatio: 0.65,
    notes: 'PT clinic network, multiple locations'
  },
  {
    name: 'Triangle Psychiatry',
    vertical: 'Healthcare Private Practices',
    type: 'Mental Health',
    employees: 60,
    location: 'Cary, NC',
    distance: 50,
    laptopRatio: 0.80,
    notes: 'Mental health practice, telehealth laptops'
  },
  
  // ===== PUBLIC SAFETY =====
  {
    name: 'Wake County Sheriff Office',
    vertical: 'Public Safety',
    type: 'Sheriff',
    employees: 850,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.40,
    notes: 'County sheriff, vehicle laptops + admin'
  },
  {
    name: 'Durham County Sheriff Office',
    vertical: 'Public Safety',
    type: 'Sheriff',
    employees: 600,
    location: 'Durham, NC',
    distance: 50,
    laptopRatio: 0.40,
    notes: 'County law enforcement'
  },
  {
    name: 'Raleigh Police Department',
    vertical: 'Public Safety',
    type: 'Police',
    employees: 750,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.35,
    notes: 'Municipal police, patrol laptops'
  },
  {
    name: 'Cary Police Department',
    vertical: 'Public Safety',
    type: 'Police',
    employees: 180,
    location: 'Cary, NC',
    distance: 50,
    laptopRatio: 0.35,
    notes: 'Town police department'
  },
  {
    name: 'Wake County EMS',
    vertical: 'Public Safety',
    type: 'EMS',
    employees: 400,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.30,
    notes: 'Emergency medical services, reporting laptops'
  },
  
  // ===== REAL ESTATE & PROPERTY =====
  {
    name: 'Allen Tate Realtors',
    vertical: 'Real Estate & Property',
    type: 'Real Estate Brokerage',
    employees: 300,
    location: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.85,
    notes: 'Large real estate brokerage, agents need laptops'
  },
  {
    name: 'Fonville Morisey Realty',
    vertical: 'Real Estate & Property',
    type: 'Real Estate Brokerage',
    employees: 200,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.85,
    notes: 'Triangle area real estate, mobile agents'
  },
  {
    name: 'Greystar Real Estate Partners',
    vertical: 'Real Estate & Property',
    type: 'Property Management',
    employees: 150,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.75,
    notes: 'Property management, field + office laptops'
  },
  {
    name: 'Lincoln Property Company (Raleigh)',
    vertical: 'Real Estate & Property',
    type: 'Property Management',
    employees: 120,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.75,
    notes: 'Commercial property management'
  },
  
  // ===== ENGINEERING & ARCHITECTURE =====
  {
    name: 'Stewart Engineering',
    vertical: 'Engineering & Architecture',
    type: 'Civil Engineering',
    employees: 180,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.85,
    notes: 'Civil engineering firm, CAD workstations'
  },
  {
    name: 'Kimley-Horn',
    vertical: 'Engineering & Architecture',
    type: 'Civil Engineering',
    employees: 400,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.85,
    notes: 'Major engineering firm, HQ in Raleigh'
  },
  {
    name: 'Clearscapes',
    vertical: 'Engineering & Architecture',
    type: 'Architecture',
    employees: 80,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.90,
    notes: 'Architecture and planning firm'
  },
  {
    name: 'LS3P Associates',
    vertical: 'Engineering & Architecture',
    type: 'Architecture',
    employees: 150,
    location: 'Charleston, SC',
    distance: 280,
    laptopRatio: 0.90,
    notes: 'Regional architecture firm'
  },
  
  // ===== MARKETING & CREATIVE =====
  {
    name: 'Luquire George Andrews',
    vertical: 'Marketing & Creative',
    type: 'Advertising Agency',
    employees: 90,
    location: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.95,
    notes: 'Full-service ad agency, all creatives have laptops'
  },
  {
    name: 'French/West/Vaughan',
    vertical: 'Marketing & Creative',
    type: 'PR & Marketing',
    employees: 100,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.95,
    notes: 'PR and marketing agency'
  },
  {
    name: 'Kompleks Creative',
    vertical: 'Marketing & Creative',
    type: 'Digital Agency',
    employees: 60,
    location: 'Durham, NC',
    distance: 50,
    laptopRatio: 0.95,
    notes: 'Digital marketing and web development'
  },
  {
    name: 'Capstrat',
    vertical: 'Marketing & Creative',
    type: 'Marketing Agency',
    employees: 75,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.95,
    notes: 'Integrated marketing agency'
  },
  
  // ===== IT & TECHNOLOGY SERVICES =====
  {
    name: 'Skyland Solutions',
    vertical: 'IT & Technology Services',
    type: 'MSP',
    employees: 50,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.95,
    notes: 'Managed IT services, all techs have laptops'
  },
  {
    name: 'Sageworks',
    vertical: 'IT & Technology Services',
    type: 'Software Company',
    employees: 200,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.95,
    notes: 'Financial software company'
  },
  {
    name: 'Bandwidth Inc.',
    vertical: 'IT & Technology Services',
    type: 'Technology',
    employees: 600,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.90,
    notes: 'Communications platform, tech company'
  },
  {
    name: 'Pendo',
    vertical: 'IT & Technology Services',
    type: 'Software Company',
    employees: 500,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.95,
    notes: 'Product analytics software'
  },
  
  // ===== CONSTRUCTION & TRADES =====
  {
    name: 'Clancy & Theys Construction',
    vertical: 'Construction & Trades',
    type: 'General Contractor',
    employees: 300,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.50,
    notes: 'Large construction firm, project managers have laptops'
  },
  {
    name: 'Barnhill Contracting',
    vertical: 'Construction & Trades',
    type: 'General Contractor',
    employees: 400,
    location: 'Rocky Mount, NC',
    distance: 55,
    laptopRatio: 0.50,
    notes: 'Heavy civil construction'
  },
  {
    name: 'T.A. Loving Company',
    vertical: 'Construction & Trades',
    type: 'HVAC/Mechanical',
    employees: 800,
    location: 'Goldsboro, NC',
    distance: 70,
    laptopRatio: 0.40,
    notes: 'Large HVAC contractor, field + office'
  },
  {
    name: 'Holt Brothers Construction',
    vertical: 'Construction & Trades',
    type: 'General Contractor',
    employees: 150,
    location: 'Durham, NC',
    distance: 50,
    laptopRatio: 0.50,
    notes: 'Commercial construction'
  },
  
  // ===== INSURANCE AGENCIES =====
  {
    name: 'BB&T Insurance Services',
    vertical: 'Insurance Agencies',
    type: 'Insurance Brokerage',
    employees: 250,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.80,
    notes: 'Insurance brokerage, agents have laptops'
  },
  {
    name: 'USI Insurance Services',
    vertical: 'Insurance Agencies',
    type: 'Insurance Brokerage',
    employees: 180,
    location: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.80,
    notes: 'Commercial insurance broker'
  },
  {
    name: 'Marsh & McLennan (Raleigh)',
    vertical: 'Insurance Agencies',
    type: 'Insurance Brokerage',
    employees: 120,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.85,
    notes: 'Global insurance broker, local office'
  },
  
  // ===== NONPROFIT ORGANIZATIONS =====
  {
    name: 'United Way of the Greater Triangle',
    vertical: 'Nonprofit Organizations',
    type: 'Community Foundation',
    employees: 50,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.85,
    notes: 'United Way chapter, mission-aligned'
  },
  {
    name: 'Food Bank of Central & Eastern NC',
    vertical: 'Nonprofit Organizations',
    type: 'Food Bank',
    employees: 120,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.60,
    notes: 'Large food bank, admin staff'
  },
  {
    name: 'Triangle Community Foundation',
    vertical: 'Nonprofit Organizations',
    type: 'Community Foundation',
    employees: 35,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.85,
    notes: 'Community foundation, mission-aligned'
  },
  {
    name: 'Boys & Girls Clubs of Wake County',
    vertical: 'Nonprofit Organizations',
    type: 'Youth Programs',
    employees: 80,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.65,
    notes: 'Youth programs, potential partnership'
  },
  
  // ===== PRIVATE EDUCATION =====
  {
    name: 'Cary Academy',
    vertical: 'Private Education',
    type: 'Private School',
    employees: 150,
    location: 'Cary, NC',
    distance: 50,
    laptopRatio: 0.75,
    notes: 'Private K-12 school, tech-forward'
  },
  {
    name: 'Ravenscroft School',
    vertical: 'Private Education',
    type: 'Private School',
    employees: 180,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.75,
    notes: 'Independent school, regular tech refresh'
  },
  {
    name: 'Durham Academy',
    vertical: 'Private Education',
    type: 'Private School',
    employees: 200,
    location: 'Durham, NC',
    distance: 50,
    laptopRatio: 0.75,
    notes: 'Private school, 1:1 device programs'
  },
  {
    name: 'Sylvan Learning Centers (Regional)',
    vertical: 'Private Education',
    type: 'Tutoring',
    employees: 60,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.70,
    notes: 'Tutoring centers, educational mission'
  },
  
  // ===== HOSPITALITY MANAGEMENT =====
  {
    name: 'Sage Hospitality Group (RTP)',
    vertical: 'Hospitality Management',
    type: 'Hotel Management',
    employees: 150,
    location: 'Research Triangle Park, NC',
    distance: 40,
    laptopRatio: 0.60,
    notes: 'Hotel management, corporate office'
  },
  {
    name: 'Good Food on Montford',
    vertical: 'Hospitality Management',
    type: 'Restaurant Group',
    employees: 80,
    location: 'Charlotte, NC',
    distance: 180,
    laptopRatio: 0.50,
    notes: 'Restaurant group, admin laptops'
  },
  {
    name: 'Pinehurst Resort',
    vertical: 'Hospitality Management',
    type: 'Resort',
    employees: 1200,
    location: 'Pinehurst, NC',
    distance: 80,
    laptopRatio: 0.30,
    notes: 'Large resort, admin and management'
  },
  
  // ===== MANUFACTURING & DISTRIBUTION =====
  {
    name: 'Martin Marietta Materials',
    vertical: 'Manufacturing & Distribution',
    type: 'Manufacturing',
    employees: 350,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.45,
    notes: 'Construction materials, office staff'
  },
  {
    name: 'Advance Auto Parts (Corporate)',
    vertical: 'Manufacturing & Distribution',
    type: 'Distribution',
    employees: 800,
    location: 'Raleigh, NC',
    distance: 45,
    laptopRatio: 0.55,
    notes: 'Auto parts distribution, corporate HQ'
  },
  {
    name: 'Dole Fresh Vegetables',
    vertical: 'Manufacturing & Distribution',
    type: 'Food Processing',
    employees: 200,
    location: 'Bessemer City, NC',
    distance: 200,
    laptopRatio: 0.40,
    notes: 'Food processing, office staff'
  }
];

/**
 * Calculate HTI-specific lead score for professional services
 */
function calculateProfessionalServicesScore(company) {
  let score = 0;
  
  // DISTANCE (Most important)
  if (company.distance <= 50) score += 35;
  else if (company.distance <= 100) score += 28;
  else if (company.distance <= 150) score += 20;
  else if (company.distance <= 200) score += 12;
  else score += 5;
  
  // LAPTOP RATIO (Critical - need laptops!)
  if (company.laptopRatio >= 0.90) score += 25;
  else if (company.laptopRatio >= 0.80) score += 22;
  else if (company.laptopRatio >= 0.70) score += 18;
  else if (company.laptopRatio >= 0.60) score += 14;
  else if (company.laptopRatio >= 0.50) score += 10;
  else score += 5;
  
  // COMPANY SIZE (Volume potential)
  const estimatedLaptops = Math.floor(company.employees * company.laptopRatio * 0.25);
  if (estimatedLaptops >= 50) score += 20;
  else if (estimatedLaptops >= 30) score += 15;
  else if (estimatedLaptops >= 20) score += 12;
  else if (estimatedLaptops >= 10) score += 8;
  else score += 4;
  
  // VERTICAL BONUS (Some verticals are easier)
  const verticalScores = {
    'Legal Services': 10,
    'Accounting & Finance': 10,
    'Marketing & Creative': 10,
    'IT & Technology Services': 10,
    'Healthcare Private Practices': 8,
    'Engineering & Architecture': 8,
    'Real Estate & Property': 7,
    'Insurance Agencies': 7,
    'Nonprofit Organizations': 9, // Mission-aligned
    'Private Education': 8,
    'Public Safety': 6,
    'Construction & Trades': 5,
    'Hospitality Management': 5,
    'Manufacturing & Distribution': 4
  };
  score += verticalScores[company.vertical] || 5;
  
  // NC LOCATION BONUS
  if (company.location.includes(', NC')) score += 10;
  
  return Math.min(score, 100);
}

/**
 * Estimate laptop volume and grant impact
 */
function estimateLaptopImpact(company) {
  const totalLaptops = Math.floor(company.employees * company.laptopRatio);
  const annualRefresh = Math.floor(totalLaptops * 0.25);
  const convertibleRate = 0.75; // Professional laptops = better conversion
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
 * Generate match reasons
 */
function generateMatchReasons(company, score, impact) {
  const reasons = [];
  
  // Distance
  if (company.distance <= 50) reasons.push('🎯 Very close to Henderson (under 50 miles)');
  else if (company.distance <= 100) reasons.push('📍 Close proximity for easy pickup');
  else if (company.distance <= 150) reasons.push('🚚 Within reasonable pickup distance');
  
  // Laptop ratio
  if (company.laptopRatio >= 0.85) reasons.push('💼 Nearly all employees have laptops');
  else if (company.laptopRatio >= 0.70) reasons.push('💻 High laptop usage in workforce');
  
  // Volume
  if (impact.chromebooksExpected >= 30) reasons.push(`📦 Good volume potential (~${impact.chromebooksExpected} Chromebooks/year)`);
  else if (impact.chromebooksExpected >= 15) reasons.push(`📦 Moderate volume (~${impact.chromebooksExpected} Chromebooks/year)`);
  
  // NC location
  if (company.location.includes(', NC')) reasons.push('⭐ North Carolina company (grant priority)');
  
  // Vertical-specific
  const verticalReasons = {
    'Legal Services': '⚖️ Law firms refresh regularly for security/compliance',
    'Accounting & Finance': '📊 CPAs upgrade for tax season and audit work',
    'Healthcare Private Practices': '🏥 Private practices easier than hospitals',
    'Public Safety': '🚔 Public safety agencies replace equipment regularly',
    'Marketing & Creative': '🎨 Creative agencies need powerful laptops',
    'IT & Technology Services': '💻 Tech companies = frequent equipment refresh',
    'Nonprofit Organizations': '🤝 Mission-aligned, community-minded donors',
    'Private Education': '🎓 Schools understand educational mission'
  };
  if (verticalReasons[company.vertical]) {
    reasons.push(verticalReasons[company.vertical]);
  }
  
  // Decision maker accessibility
  reasons.push('👤 Decision makers are accessible (no corporate red tape)');
  
  // Tax benefit
  reasons.push('💰 Looking for tax deductions on equipment donations');
  
  // Custom notes
  if (company.notes) reasons.push(`📝 ${company.notes}`);
  
  return reasons;
}

/**
 * Main scraper function
 */
export async function scrapeProfessionalServices() {
  const jobId = 'professional-services';
  const startTime = Date.now();
  let newLeads = 0;
  let errors = [];
  
  console.log('🌉 BRIDGE CRM: Professional Services Multi-Vertical Scraper');
  console.log('🎯 Targeting accessible, realistic laptop donors in NC/Southeast');
  console.log('📋 Verticals: Legal, Accounting, Healthcare, Public Safety, Real Estate, Engineering, Marketing, IT, Construction, Insurance, Nonprofit, Education, Hospitality, Manufacturing');
  
  try {
    for (const company of PROFESSIONAL_SERVICES_TARGETS) {
      try {
        const score = calculateProfessionalServicesScore(company);
        const impact = estimateLaptopImpact(company);
        const matchReasons = generateMatchReasons(company, score, impact);
        
        // Determine priority
        let priority = 'medium';
        if (score >= 85) priority = 'critical';
        else if (score >= 70) priority = 'high';
        else if (score < 55) priority = 'low';
        
        // Determine status
        let status = 'new';
        if (score >= 85) status = 'hot';
        else if (score >= 70) status = 'warm';
        else status = 'cold';
        
        // Generate contact info
        const domain = company.name.toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .replace(/llp|llc|inc|corp|pa|pllc/g, '');
        
        const lead = {
          name: company.name,
          company: company.name,
          email: `info@${domain}.com`,
          source: 'professional-services-scraper',
          persona: company.type,
          status: status,
          priority: priority,
          score: score,
          tags: [company.vertical, company.type, company.location.split(', ')[1]],
          customFields: {
            // Company info
            employees: company.employees,
            headquarters: company.location,
            vertical: company.vertical,
            type: company.type,
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
            dataSource: 'Professional Services Database',
            verificationStatus: 'pending',
            lastEnriched: new Date().toISOString()
          },
          notes: `${matchReasons.join(' • ')}\n\nEstimated annual contribution: ${impact.chromebooksExpected} Chromebooks (${impact.grantImpact}% of 5,000 grant goal). Distance: ${company.distance} miles from Henderson.`
        };
        
        createLead(lead);
        newLeads++;
        
        console.log(`✅ ${company.name} | ${company.vertical} | Score: ${score} | Impact: ${impact.grantImpact}%`);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`❌ Error processing ${company.name}:`, error.message);
        errors.push({ company: company.name, error: error.message });
      }
    }
    
    const duration = Date.now() - startTime;
    recordIngestionRun(jobId, {
      status: 'success',
      recordsProcessed: PROFESSIONAL_SERVICES_TARGETS.length,
      newRecords: newLeads,
      duration: duration,
      errors: errors.length > 0 ? errors : null
    });
    
    console.log(`\n✅ Professional Services scraper complete!`);
    console.log(`   📊 ${newLeads} new leads added`);
    console.log(`   ⏱️  ${duration}ms`);
    console.log(`   🎯 Realistic, accessible laptop donors`);
    
    return {
      success: true,
      newLeads,
      totalProcessed: PROFESSIONAL_SERVICES_TARGETS.length,
      duration,
      errors
    };
    
  } catch (error) {
    console.error('❌ Professional Services scraper failed:', error);
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
  scrapeProfessionalServices()
    .then(result => {
      console.log('\nFinal Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

