// Route tests (Phase 3): all 5 endpoints + root + error/404 behavior, against
// the real ingested data files (git-tracked, offline, no network needed).
// Uses supertest-free in-process HTTP via node:http against the exported app.
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const db = require('../src/db');
const app = require('../src/index');

assert.ok(db.meta && db.meta.source_date, 'meta.json must have source_date');

function request(path) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      http
        .get({ host: '127.0.0.1', port, path }, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            server.close();
            resolve({ status: res.statusCode, headers: res.headers, body });
          });
        })
        .on('error', (err) => {
          server.close();
          reject(err);
        });
    });
  });
}

test('root route returns 200 with API info and attribution', async () => {
  const res = await request('/');
  assert.equal(res.status, 200);
  const json = JSON.parse(res.body);
  assert.equal(json.success, true);
  assert.ok(json.data.endpoints.states);
  assert.equal(json.attribution.license, 'GODL-India');
});

test('GET /v1/states returns all states with envelope + meta', async () => {
  const res = await request('/v1/states');
  assert.equal(res.status, 200);
  const json = JSON.parse(res.body);
  assert.equal(json.success, true);
  assert.equal(json.meta.count, 36);
  assert.ok(json.data[0].code && json.data[0].name);
  assert.ok(json.meta.attribution.lgd_url);
});

test('GET /v1/districts returns 784 with no filter (allowed, unlike subdistricts/blocks)', async () => {
  const res = await request('/v1/districts');
  assert.equal(res.status, 200);
  const json = JSON.parse(res.body);
  assert.equal(json.meta.count, 784);
});

test('GET /v1/districts?state=<valid> filters; unknown code -> 404 listing valid values', async () => {
  const good = await request('/v1/districts?state=28');
  assert.equal(good.status, 200);
  const gj = JSON.parse(good.body);
  assert.equal(gj.meta.state, '28');
  assert.ok(gj.meta.count > 0 && gj.meta.count < 784);
  for (const d of gj.data) assert.equal(d.state_code, '28');

  const bad = await request('/v1/districts?state=999999');
  assert.equal(bad.status, 404);
  const bj = JSON.parse(bad.body);
  assert.equal(bj.success, false);
  assert.ok(bj.error.message.includes('Valid state codes'));
});

test('GET /v1/subdistricts requires a filter (400 without one)', async () => {
  const none = await request('/v1/subdistricts');
  assert.equal(none.status, 400);
  const nj = JSON.parse(none.body);
  assert.equal(nj.error.code, 'MISSING_PARAM');

  const byDistrict = await request('/v1/subdistricts?district=551');
  assert.equal(byDistrict.status, 200);
  const bj = JSON.parse(byDistrict.body);
  assert.ok(bj.meta.count > 0);
  for (const s of bj.data) assert.equal(s.district_code, '551');

  const byState = await request('/v1/subdistricts?state=28');
  assert.equal(byState.status, 200);
  const sj = JSON.parse(byState.body);
  for (const s of sj.data) assert.equal(s.state_code, '28');
});

test('GET /v1/blocks follows the same filter rules as subdistricts', async () => {
  const none = await request('/v1/blocks');
  assert.equal(none.status, 400);
  assert.equal(JSON.parse(none.body).error.code, 'MISSING_PARAM');

  const badDistrict = await request('/v1/blocks?district=999999');
  assert.equal(badDistrict.status, 404);
  assert.equal(JSON.parse(badDistrict.body).error.code, 'INVALID_DISTRICT_CODE');

  const byDistrict = await request('/v1/blocks?district=551');
  assert.equal(byDistrict.status, 200);
  const bj = JSON.parse(byDistrict.body);
  assert.ok(bj.meta.count > 0);
  for (const b of bj.data) assert.equal(b.district_code, '551');
});

test('GET /v1/search returns grouped, parent-chain results and handles duplicate names', async () => {
  const none = await request('/v1/search');
  assert.equal(none.status, 400);
  assert.equal(JSON.parse(none.body).error.code, 'MISSING_PARAM');

  // "Ramgarh" is a confirmed duplicate sub-district name (x8 in real data)
  const res = await request('/v1/search?q=ramgarh');
  assert.equal(res.status, 200);
  const json = JSON.parse(res.body);
  assert.equal(json.success, true);
  assert.ok(json.data.results.subdistricts.length >= 2, 'duplicate Ramgarh sub-districts found');
  for (const hit of json.data.results.subdistricts) {
    assert.ok(hit.state_code && hit.district_code, 'parent chain present');
  }
  assert.equal(json.meta.total, Object.values(json.data.results).reduce((n, g) => n + g.length, 0));
});

test('unmatched route returns JSON 404 envelope, never HTML', async () => {
  const res = await request('/v1/nonexistent');
  assert.equal(res.status, 404);
  const json = JSON.parse(res.body);
  assert.equal(json.success, false);
  assert.equal(json.error.code, 'ENDPOINT_NOT_FOUND');
});

test('malformed JSON body hits the terminal error handler and returns the JSON envelope, never HTML', async () => {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      const req = http.request(
        { host: '127.0.0.1', port, path: '/v1/states', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            server.close();
            try {
              assert.equal(res.statusCode, 400);
              const json = JSON.parse(body);
              assert.equal(json.success, false);
              assert.ok(json.error.code);
              assert.ok(!body.trim().startsWith('<'), 'must not be HTML');
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      req.end('{ not valid json');
    });
  });
});

test('CORS header present on a real response; rate-limit headers present', async () => {
  const res = await request('/v1/states');
  assert.equal(res.headers['access-control-allow-origin'], '*');
  assert.ok(res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']);
  assert.ok(res.headers['ratelimit-remaining'] || res.headers['x-ratelimit-remaining']);
});

test('location filters must agree on the district parent state', async () => {
  for (const level of ['subdistricts', 'blocks']) {
    const good = await request(`/v1/${level}?state=30&district=551`);
    assert.equal(good.status, 200);
    assert.equal(JSON.parse(good.body).meta.state, '30');
    const bad = await request(`/v1/${level}?state=28&district=551`);
    assert.equal(bad.status, 400);
    assert.equal(JSON.parse(bad.body).error.code, 'FILTER_MISMATCH');
  }
});

test('query parameters reject duplicates, unknown names, and malformed codes', async () => {
  for (const path of [
    '/v1/states?anything=1',
    '/v1/districts?state=28&state=30',
    '/v1/blocks?district[]=551',
    '/v1/subdistricts?state=',
    '/v1/search?q=foo&q=bar',
  ]) {
    const response = await request(path);
    assert.equal(response.status, 400, path);
    assert.equal(JSON.parse(response.body).error.code, 'INVALID_QUERY_PARAM', path);
  }
});

test('search rejects empty or overlong text', async () => {
  const blank = await request('/v1/search?q=%20%20');
  assert.equal(blank.status, 400);
  assert.equal(JSON.parse(blank.body).error.code, 'MISSING_PARAM');
  const long = await request(`/v1/search?q=${'x'.repeat(101)}`);
  assert.equal(long.status, 400);
  assert.equal(JSON.parse(long.body).error.code, 'INVALID_QUERY_PARAM');
});

