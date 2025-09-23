import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mapAwardToLead, mapAwardToCorporateTarget, normalizeText } from '../scripts/lib/usaspending-utils.js';

test('normalizeText collapses whitespace', () => {
  assert.equal(normalizeText('  hello\nworld  '), 'hello world');
  assert.equal(normalizeText(null), '');
});

test('mapAwardToLead maps key persona fields', () => {
  const award = {
    'Award ID': 'ABC123',
    'Recipient Name': 'Example IT Services, LLC',
    'Award Amount': 750000,
    'Awarding Agency': 'Department of Education',
    Description: 'Comprehensive laptop refresh for rural broadband labs.',
    'Period of Performance Start Date': '2024-01-01',
    'Period of Performance Current End Date': '2024-12-31',
    'CFDA Number': '84.425'
  };

  const lead = mapAwardToLead(award);
  assert.equal(lead.source, 'USAspending');
  assert.equal(lead.persona, 'Government Procurement');
  assert.equal(lead.personaTags.includes('persona:government-procurement'), true);
  assert.equal(lead.company, 'Example IT Services, LLC');
  assert.equal(lead.timeline.includes('Start 2024-01-01'), true);
  assert.ok(lead.priority >= 80);
});

test('mapAwardToCorporateTarget captures metrics', () => {
  const award = {
    'Recipient Name': 'Example IT Services, LLC',
    'Award Amount': 1500000,
    'Awarding Agency': 'Department of Education',
    Description: 'Digital equity procurement',
    'CFDA Number': '84.425'
  };

  const target = mapAwardToCorporateTarget(award);
  assert.equal(target.company, 'Example IT Services, LLC');
  assert.equal(target.priority, 'High');
  assert.equal(target.metrics.awardAmount, 1500000);
  assert.equal(target.metrics.cfda, '84.425');
});
