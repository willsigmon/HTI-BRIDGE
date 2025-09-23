import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CORPORATE_REFRESH_PROSPECTS } from '../scripts/lib/corporate-refresh-sources.js';
import { prospectToLead, prospectToCorporateTarget, buildLeadId } from '../scripts/lib/corporate-refresh-utils.js';

const sampleProspect = CORPORATE_REFRESH_PROSPECTS[0];

test('prospectToLead maps core fields and contacts', () => {
  const lead = prospectToLead(sampleProspect);
  assert.equal(lead.id, buildLeadId(sampleProspect.company));
  assert.equal(lead.company, sampleProspect.company);
  assert.equal(lead.source, 'Corporate Refresh Monitor');
  assert.equal(lead.equipmentType, sampleProspect.equipmentType);
  assert.ok(lead.notes.includes(sampleProspect.contacts[0].name));
  assert.equal(lead.status, 'Researching');
});

test('prospectToLead respects region filter', () => {
  const regionFilter = new Set(['NC']);
  const lead = prospectToLead(sampleProspect, { regionFilter });
  assert.equal(lead, null);
});

test('prospectToCorporateTarget inherits focus and notes', () => {
  const target = prospectToCorporateTarget(sampleProspect);
  assert.equal(target.company, sampleProspect.company);
  assert.ok(target.focus.includes(sampleProspect.equipmentType));
  assert.ok(target.notes.includes(sampleProspect.notes.split(' ')[0]));
});
