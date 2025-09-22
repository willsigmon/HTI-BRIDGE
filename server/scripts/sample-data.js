export const sampleLeads = [
  {
    id: 'L001',
    date: '2025-09-22',
    source: 'Reddit (r/sysadmin)',
    title: 'Corporate laptop refresh - 200 ThinkPads',
    company: 'Anonymous IT Company',
    contact: 'ITManager_RTP',
    location: 'Research Triangle Park, NC',
    equipmentType: 'Business Laptops',
    estimatedQuantity: 200,
    priority: 95,
    status: 'New',
    notes: 'Corporate refresh cycle, 3-year-old ThinkPads, NIST data wipe required.',
    timeline: 'Immediate',
    followUpDate: '2025-09-23',
    potentialValue: 'High'
  },
  {
    id: 'L002',
    date: '2025-09-21',
    source: 'LinkedIn',
    title: 'Healthcare system equipment upgrade',
    company: 'Regional Healthcare Network',
    contact: 'Sarah Chen - IT Director',
    location: 'Durham, NC',
    equipmentType: 'Mixed Equipment',
    estimatedQuantity: 150,
    priority: 88,
    status: 'Initial Contact',
    notes: 'Annual refresh cycle, HIPAA compliant destruction needed.',
    timeline: 'Q4 2025',
    followUpDate: '2025-09-25',
    potentialValue: 'High'
  },
  {
    id: 'L003',
    date: '2025-09-20',
    source: 'Professional Referral',
    title: 'Manufacturing company office closure',
    company: 'Triangle Manufacturing Corp',
    contact: 'Mike Rodriguez - Facilities Manager',
    location: 'Raleigh, NC',
    equipmentType: 'Business Laptops',
    estimatedQuantity: 75,
    priority: 82,
    status: 'Qualified',
    notes: 'Office consolidation, immediate pickup needed.',
    timeline: 'Urgent',
    followUpDate: '2025-09-22',
    potentialValue: 'Medium-High'
  }
];

export const sampleCorporateTargets = [
  {
    company: 'SAS Institute',
    location: 'Cary, NC',
    type: 'Technology',
    employees: '14,000+',
    priority: 'High',
    focus: 'Education outreach',
    status: 'Research',
    notes: 'Deep analytics bench with STEM education funds; pursue analytics academy sponsorship.'
  },
  {
    company: 'Cisco Systems',
    location: 'Research Triangle Park, NC',
    type: 'Technology',
    employees: '1,000+',
    priority: 'High',
    focus: 'Digital inclusion',
    status: 'Discovery Call',
    notes: 'Leverage existing refurbisher alliance and sustainability commitments.'
  },
  {
    company: 'Red Hat',
    location: 'Raleigh, NC',
    type: 'Technology',
    employees: '1,400+',
    priority: 'High',
    focus: 'Open source education',
    status: 'Initial Contact',
    notes: 'Offer co-branded open hardware labs; align with diversity in tech goals.'
  },
  {
    company: 'Truist Bank',
    location: 'Charlotte/Triangle, NC',
    type: 'Financial Services',
    employees: '7000+',
    priority: 'High',
    focus: 'Community development',
    status: 'Research',
    notes: 'Bank foundation funds education equity; pitch workforce re-entry cohort.'
  }
];

export const sampleMilestones = [
  {
    id: 'G001',
    title: 'Q4 2024 Progress Report',
    dueDate: '2024-12-31',
    status: 'Upcoming',
    description: 'Quarterly progress and expenditure report to NCDIT',
    priority: 'High'
  },
  {
    id: 'G002',
    title: 'Equipment Distribution Milestone',
    dueDate: '2025-03-31',
    status: 'In Progress',
    description: 'Target: 500 additional Chromebook conversions',
    priority: 'High'
  },
  {
    id: 'G003',
    title: 'Annual Compliance Audit',
    dueDate: '2025-08-02',
    status: 'Planned',
    description: 'Annual review of grant compliance and documentation',
    priority: 'Medium'
  }
];

export const sampleActivities = [
  {
    id: 'A001',
    timestamp: '2025-09-22T09:05:00-04:00',
    text: 'New lead from Reddit r/sysadmin - 200 ThinkPads available',
    type: 'lead'
  },
  {
    id: 'A002',
    timestamp: '2025-09-21T15:45:00-04:00',
    text: 'Follow-up scheduled with Regional Healthcare Network',
    type: 'outreach'
  },
  {
    id: 'A003',
    timestamp: '2025-09-20T11:30:00-04:00',
    text: 'Qualified lead from Triangle Manufacturing Corp',
    type: 'lead'
  }
];
