const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { checkSnapshot } = require('../scripts/check-snapshot');

test('committed snapshot has valid parents, counts, and archive provenance', () => {
  const result = checkSnapshot(path.join(__dirname, '..', 'data'), { now: new Date('2026-09-24T00:00:00Z') });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.counts, { states: 36, districts: 784, subdistricts: 7092, blocks: 7338 });
  assert.equal(result.freshness.fresh, true);
});
