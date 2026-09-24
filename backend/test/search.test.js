const test = require('node:test');
const assert = require('node:assert/strict');
const { collectMatches } = require('../src/db');

test('search truncation means another matching row exists beyond the 50 returned', () => {
  const fifty = Array.from({ length: 50 }, (_, index) => ({ code: String(index + 1), name: 'MATCH' }));
  assert.equal(collectMatches([...fifty, { code: '51', name: 'OTHER' }], 'match', 50).truncated, false);
  const over = collectMatches([...fifty, { code: '51', name: 'MATCH' }], 'match', 50);
  assert.equal(over.rows.length, 50);
  assert.equal(over.truncated, true);
});
