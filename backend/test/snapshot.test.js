const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { checkSnapshot } = require('../scripts/check-snapshot');

test('committed snapshot has valid parents, counts, and archive provenance', () => {
  const dataDir = path.join(__dirname, '..', 'data');
  const meta = require(path.join(dataDir, 'meta.json'));
  const result = checkSnapshot(dataDir, { now: new Date(meta.ingested_at) });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.counts, meta.row_counts);
  assert.equal(result.freshness.fresh, true);
});
