const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/index');

test('liveness and freshness are separate operational responses', async () => {
  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const live = await fetch(`${base}/healthz`);
    assert.equal(live.status, 200);
    assert.equal((await live.json()).status, 'ok');
    const freshness = await fetch(`${base}/freshness`);
    assert.equal(freshness.status, 200);
    assert.equal((await freshness.json()).source_date, '23Sep2026');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('rate limits are isolated by forwarded client IP and 429 explains retry', async () => {
  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (let count = 0; count < 100; count++) {
      const response = await fetch(`${base}/v1/states`, { headers: { 'X-Forwarded-For': '198.51.100.11' } });
      assert.equal(response.status, 200, `request ${count + 1}`);
      await response.arrayBuffer();
    }
    const limited = await fetch(`${base}/v1/states`, { headers: { 'X-Forwarded-For': '198.51.100.11' } });
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).error.code, 'TOO_MANY_REQUESTS');
    assert.ok(limited.headers.get('retry-after'));
    const secondClient = await fetch(`${base}/v1/states`, { headers: { 'X-Forwarded-For': '198.51.100.12' } });
    assert.equal(secondClient.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API bounds URLs and bodies, responds to CORS preflight, and sets cache rules', async () => {
  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const preflight = await fetch(`${base}/v1/states`, { method: 'OPTIONS', headers: { Origin: 'https://example.test', 'Access-Control-Request-Method': 'GET' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
    const long = await fetch(`${base}/v1/search?q=${'x'.repeat(2100)}`);
    assert.equal(long.status, 414);
    const body = await fetch(`${base}/v1/states`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(2000) }) });
    assert.equal(body.status, 413);
    const okay = await fetch(`${base}/v1/states`);
    assert.equal(okay.status, 200);
    assert.match(okay.headers.get('cache-control'), /private.*max-age/);
    assert.ok(okay.headers.get('x-request-id'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
