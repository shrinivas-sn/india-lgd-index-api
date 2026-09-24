const test = require('node:test');
const assert = require('node:assert/strict');
const { assessFreshness } = require('../src/freshness');

test('freshness uses a fixed clock and never changes liveness', () => {
  assert.equal(assessFreshness('23Sep2026', { now: new Date('2026-09-24T00:00:00Z') }).fresh, true);
  const old = assessFreshness('23Sep2026', { now: new Date('2026-10-09T00:00:00Z') });
  assert.equal(old.fresh, false);
  assert.match(old.reason, /older/);
  assert.equal(assessFreshness('nonsense').fresh, false);
});
