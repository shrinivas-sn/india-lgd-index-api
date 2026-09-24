const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/index');
const document = require('../openapi.v1.json');

const routeSamples = {
  '/v1/states': '/v1/states',
  '/v1/districts': '/v1/districts?state=30',
  '/v1/subdistricts': '/v1/subdistricts?district=551',
  '/v1/blocks': '/v1/blocks?district=551',
  '/v1/search': '/v1/search?q=goa',
};

function resolve(pointer) {
  return pointer.slice(2).split('/').reduce((value, key) => value[key.replace(/~1/g, '/').replace(/~0/g, '~')], document);
}

function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (value.$ref) {
    assert.ok(value.$ref.startsWith('#/'), `External reference: ${value.$ref}`);
    assert.ok(resolve(value.$ref), `Unresolved reference: ${value.$ref}`);
  }
  for (const child of Object.values(value)) walk(child);
}

async function request(path) {
  const server = app.listen(0);
  try {
    const address = await new Promise((resolve) => server.once('listening', () => resolve(server.address())));
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('OpenAPI document has five live v1 paths and only resolvable local references', async () => {
  assert.equal(document.openapi, '3.1.1');
  assert.deepEqual(Object.keys(document.paths).sort(), Object.keys(routeSamples).sort());
  walk(document);
  const published = await request('/openapi.json');
  assert.equal(published.status, 200);
  assert.equal(published.body.info.version, document.info.version);
});

test('documented success operations respond with the advertised envelope', async () => {
  for (const [route, sample] of Object.entries(routeSamples)) {
    const response = await request(sample);
    assert.equal(response.status, 200, sample);
    assert.equal(response.body.success, true);
    assert.ok(response.body.meta.source_date);
    assert.equal(response.body.meta.attribution.license, 'GODL-India');
    assert.ok(document.paths[route].get.responses['200'], route);
  }
});

test('documented 400 and 404 errors match the error envelope', async () => {
  for (const [path, expected] of [
    ['/v1/search', 400],
    ['/v1/districts?state=999999', 404],
    ['/v1/blocks?state=28&district=551', 400],
  ]) {
    const response = await request(path);
    assert.equal(response.status, expected, path);
    assert.equal(response.body.success, false);
    assert.ok(response.body.error.code);
    assert.ok(response.body.error.message);
  }
});
