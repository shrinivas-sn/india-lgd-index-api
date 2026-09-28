const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../../vercel.json');

test('Vercel sends every public backend route to the API function', () => {
  const sources = config.rewrites
    .filter((rewrite) => rewrite.destination === '/api/index.js')
    .map((rewrite) => rewrite.source);

  for (const source of ['/v1/(.*)', '/healthz', '/freshness', '/openapi.json']) {
    assert.ok(sources.includes(source), `${source} must reach the API function`);
  }
});
