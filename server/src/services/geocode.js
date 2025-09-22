import crypto from 'node:crypto';

export function deriveCoordinates(location = '') {
  if (!location) {
    return { lat: 35.7796, lng: -78.6382 };
  }
  const hash = crypto.createHash('md5').update(location).digest();
  const lat = 25 + (hash[0] / 255) * 20; // between 25 and 45 roughly covers US
  const lng = -125 + (hash[1] / 255) * 30; // between -125 and -95
  return {
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4))
  };
}

export function mapLeadsToGeo(leads = []) {
  return leads.map((lead) => ({
    id: lead.id,
    title: lead.title,
    company: lead.company,
    location: lead.location,
    estimatedQuantity: lead.estimatedQuantity,
    stageId: lead.stageId,
    pipelineId: lead.pipelineId,
    persona: lead.persona || null,
    personaTags: lead.personaTags || [],
    ...deriveCoordinates(lead.location || lead.company || lead.id)
  }));
}
