export function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

export function buildAwardUrl(award) {
  const slug = award?.generated_internal_id || award?.generated_unique_award_id;
  if (!slug) return null;
  return `https://www.usaspending.gov/award/${slug}`;
}

export function mapAwardToLead(award) {
  const awardId = normalizeText(award['Award ID'] || award.award_id || award.internal_id);
  const recipient = normalizeText(award['Recipient Name'] || award.recipient_name);
  const awardingAgency = normalizeText(award['Awarding Agency'] || award.awarding_agency);
  const description = normalizeText(award.Description || award.description);
  const awardAmount = Number(award['Award Amount'] || award.award_amount || 0);
  const startDate = normalizeText(award['Period of Performance Start Date'] || award.performance_start_date);
  const endDate = normalizeText(award['Period of Performance Current End Date'] || award.performance_end_date);
  const timelineParts = [];
  if (startDate) timelineParts.push(`Start ${startDate}`);
  if (endDate) timelineParts.push(`Ends ${endDate}`);
  const timeline = timelineParts.length ? timelineParts.join(' · ') : 'Active federal award';

  const potentialValue = classifyPotentialValue(awardAmount);

  return {
    id: `USA-${awardId || award.generated_internal_id || cryptoFallbackId(award)}`,
    title: recipient ? `${recipient} federal IT engagement` : 'Federal technology engagement',
    company: recipient || awardingAgency || 'Federal Award Recipient',
    source: 'USAspending',
    location: awardingAgency || 'United States',
    equipmentType: inferEquipmentType(description),
    estimatedQuantity: estimateDeviceQuantity(awardAmount),
    priority: scorePriority(awardAmount),
    status: 'Researching',
    timeline,
    followUpDate: endDate || undefined,
    notes: buildAwardUrl(award) || description,
    potentialValue,
    persona: 'Government Procurement',
    personaTags: ['public-sector', 'procurement', 'persona:government-procurement']
  };
}

export function mapAwardToCorporateTarget(award) {
  const recipient = normalizeText(award['Recipient Name'] || award.recipient_name);
  if (!recipient) return null;
  const awardAmount = Number(award['Award Amount'] || award.award_amount || 0);
  const awardingAgency = normalizeText(award['Awarding Agency'] || award.awarding_agency);
  return {
    company: recipient,
    location: awardingAgency || 'United States',
    type: 'Federal Vendor',
    status: 'Research',
    priority: awardAmount >= 500000 ? 'High' : 'Medium',
    focus: normalizeText(award.Description || award.description) || 'Federal technology services',
    notes: buildAwardUrl(award) || undefined,
    metrics: {
      awardAmount,
      cfda: normalizeText(award['CFDA Number'] || award.cfda_number) || undefined
    }
  };
}

function scorePriority(awardAmount) {
  if (!awardAmount) return 60;
  if (awardAmount >= 1000000) return 95;
  if (awardAmount >= 250000) return 85;
  if (awardAmount >= 50000) return 75;
  return 65;
}

function classifyPotentialValue(amount) {
  if (amount >= 1000000) return 'High';
  if (amount >= 250000) return 'Medium-High';
  if (amount >= 50000) return 'Medium';
  return 'Emerging';
}

function inferEquipmentType(description) {
  const lowered = (description || '').toLowerCase();
  if (lowered.includes('laptop') || lowered.includes('notebook')) return 'Business Laptops';
  if (lowered.includes('desktop')) return 'Desktop Computers';
  if (lowered.includes('tablet')) return 'Tablets';
  if (lowered.includes('server')) return 'Servers';
  if (lowered.includes('network')) return 'Networking Equipment';
  return 'Mixed Equipment';
}

function estimateDeviceQuantity(amount) {
  if (!amount || Number.isNaN(amount)) return 0;
  const devices = Math.floor(Number(amount) / 1200); // rough donation conversion factor
  return devices > 0 ? devices : 0;
}

function cryptoFallbackId(award) {
  const raw = JSON.stringify(award || {});
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    const chr = raw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return `F${Math.abs(hash)}`;
}
