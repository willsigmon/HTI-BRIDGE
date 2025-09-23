import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mapGovDealsItemToLead, mapGovDealsItemToCorporateTarget, parseFeedLabel } from '../scripts/lib/govdeals-utils.js';

const sampleItem = {
  title: 'Lot #12 - Dell Latitude Laptops (25 Units)',
  link: 'https://www.govdeals.com/some-lot',
  description: '<p>City: Raleigh, NC</p><p>Includes chargers and carts</p>',
  'gd:City': 'Raleigh',
  'gd:State': 'NC',
  pubDate: 'Wed, 18 Sep 2025 10:00:00 EST'
};

test('mapGovDealsItemToLead tags logistics persona', () => {
  const lead = mapGovDealsItemToLead(sampleItem, { feedLabel: 'GovDeals Triangle' });
  assert.equal(lead.source, 'GovDeals');
  assert.equal(lead.persona, 'Logistics Hotshot');
  assert.equal(lead.location, 'Raleigh, NC');
  assert.ok(lead.estimatedQuantity >= 25);
  assert.ok(lead.notes.includes('https://www.govdeals.com'));
});

test('mapGovDealsItemToCorporateTarget sets focus', () => {
  const target = mapGovDealsItemToCorporateTarget(sampleItem, { feedLabel: 'GovDeals Triangle' });
  assert.equal(target.company, 'GovDeals Triangle');
  assert.equal(target.priority, 'High');
  assert.equal(target.focus.includes('Dell Latitude'), true);
});

test('parseFeedLabel decodes category', () => {
  const label = parseFeedLabel('https://www.govdeals.com/rss/index.cfm?fa=RSS&CatID=32');
  assert.equal(label, 'GovDeals Category 32');
});
