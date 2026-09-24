import assert from 'node:assert/strict';

const [apiArgument, siteArgument] = process.argv.slice(2);
if (!apiArgument) throw new Error('Usage: node scripts/smoke.mjs <API_HTTPS_ORIGIN> [SITE_HTTPS_ORIGIN]');
const api = new URL(apiArgument);
const site = siteArgument && new URL(siteArgument);
for (const origin of [api, site].filter(Boolean)) {
  if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && origin.hostname === 'localhost')) {
    throw new Error(`Expected HTTPS origin: ${origin.href}`);
  }
  if (origin.pathname !== '/' || origin.search || origin.hash) throw new Error(`Expected origin without path: ${origin.href}`);
}

async function get(origin, path, expectedStatus = 200, headers = {}) {
  const url = new URL(path, origin);
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(90_000) });
  assert.equal(response.status, expectedStatus, `${url.href}: expected ${expectedStatus}, got ${response.status}`);
  return response;
}

assert.equal((await (await get(api, '/healthz')).json()).status, 'ok');
const freshness = await (await get(api, '/freshness')).json();
assert.equal(freshness.fresh, true, `Source stale: ${freshness.reason}`);
for (const path of [
  '/v1/states',
  '/v1/districts?state=30',
  '/v1/subdistricts?district=551',
  '/v1/blocks?district=551',
  '/v1/search?q=goa',
]) {
  const response = await get(api, path, 200, { Origin: site?.origin || 'https://example.invalid' });
  assert.equal(response.headers.get('access-control-allow-origin'), '*', `${path} CORS`);
  const body = await response.json();
  assert.equal(body.success, true, path);
  assert.equal(body.meta.source_date, freshness.source_date, `${path} source date`);
  assert.equal(body.meta.attribution.license, 'GODL-India', `${path} attribution`);
}
for (const [path, status, code] of [
  ['/v1/blocks?district=551&state=28', 400, 'FILTER_MISMATCH'],
  ['/v1/states?unknown=1', 400, 'INVALID_QUERY_PARAM'],
  ['/v1/districts?state=999999', 404, 'INVALID_STATE_CODE'],
  ['/v1/absent', 404, 'ENDPOINT_NOT_FOUND'],
]) {
  const body = await (await get(api, path, status)).json();
  assert.equal(body.error.code, code, path);
}
const spec = await (await get(api, '/openapi.json')).json();
assert.equal(Object.keys(spec.paths).length, 5);
console.log(`API smoke passed: ${api.origin}; snapshot ${freshness.source_date}`);

if (site) {
  for (const path of ['/', '/docs']) {
    const html = await (await get(site, path)).text();
    assert.match(html, /<h1[ >]/, `${path} rendered heading`);
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.ok(html.includes(`rel="canonical" href="${new URL(path, site).href}"`), `${path} canonical`);
  }
  for (const path of ['/playground', '/status']) await get(site, path);
  await get(site, '/this-path-should-404', 404);
  const robots = await (await get(site, '/robots.txt')).text();
  assert.match(robots, /Sitemap: https:\/\//);
  const sitemap = await (await get(site, '/sitemap.xml')).text();
  assert.equal((sitemap.match(/<url>/g) || []).length, 2);
  assert.doesNotMatch(sitemap, /playground|status/);
  console.log(`Portal smoke passed: ${site.origin}`);
}
