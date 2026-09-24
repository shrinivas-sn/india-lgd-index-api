const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { selectLatestCompleteSet, validateRowCounts, writeSnapshot, publishValidatedSnapshot } = require('../scripts/ingest-core');

const levels = ['states', 'districts', 'subdistricts', 'blocks'];
const assetsFor = (date, included = levels) => included.map((level) => ({
  name: `${level}.${date}.csv.7z`,
  browser_download_url: `https://example.test/${level}.${date}.csv.7z`,
}));

test('selectLatestCompleteSet chooses the newest complete date across a month boundary', () => {
  const assets = [
    ...assetsFor('30Sep2026'),
    ...assetsFor('01Oct2026', ['states', 'districts', 'subdistricts']),
  ];
  const result = selectLatestCompleteSet(assets, { now: new Date('2026-10-02T00:00:00Z') });
  assert.equal(result.sourceDate, '30Sep2026');
  assert.deepEqual(Object.keys(result.files).sort(), [...levels].sort());

  const newer = selectLatestCompleteSet([...assets, ...assetsFor('01Oct2026', ['blocks'])], {
    now: new Date('2026-10-02T00:00:00Z'),
  });
  assert.equal(newer.sourceDate, '01Oct2026');
});

test('selectLatestCompleteSet rejects stale or missing source sets', () => {
  assert.throws(() => selectLatestCompleteSet(assetsFor('01Sep2026'), {
    now: new Date('2026-10-02T00:00:00Z'),
    maxAgeDays: 14,
  }), /stale/i);
  assert.throws(() => selectLatestCompleteSet(assetsFor('01Oct2026', ['states']), {
    now: new Date('2026-10-02T00:00:00Z'),
  }), /complete/i);
});

test('validateRowCounts flags a large drop against the committed snapshot', () => {
  const current = { states: Array(36), districts: Array(740), subdistricts: Array(7092), blocks: Array(7338) };
  const previous = { states: 36, districts: 784, subdistricts: 7092, blocks: 7338 };
  assert.ok(validateRowCounts(current, previous).some((error) => error.includes('districts')));
  current.districts = Array(784);
  assert.deepEqual(validateRowCounts(current, previous), []);
});

test('writeSnapshot leaves all bytes unchanged on an identical rerun', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lgd-ingest-test-'));
  t.after(() => {
    const resolved = fs.realpathSync(dir);
    const parent = fs.realpathSync(os.tmpdir());
    const relative = path.relative(parent, resolved);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const tables = Object.fromEntries(levels.map((level) => [level, [{ code: '1', name: level }]]));
  const meta = { source_date: '23Sep2026', source_assets: { states: { sha256: 'abc' } } };
  assert.equal(writeSnapshot(dir, tables, meta, { now: new Date('2026-09-24T00:00:00Z') }), true);
  const before = Object.fromEntries([...levels, 'meta'].map((level) => [level, fs.readFileSync(path.join(dir, `${level}.json`))]));
  assert.equal(writeSnapshot(dir, tables, meta, { now: new Date('2026-09-25T00:00:00Z') }), false);
  for (const level of [...levels, 'meta']) {
    assert.deepEqual(fs.readFileSync(path.join(dir, `${level}.json`)), before[level]);
  }
});

test('publishValidatedSnapshot rejects older source dates before changing any file', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lgd-ingest-test-'));
  t.after(() => {
    const resolved = fs.realpathSync(dir);
    const parent = fs.realpathSync(os.tmpdir());
    const relative = path.relative(parent, resolved);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const tables = {
    states: [{ code: '1', name: 'State' }],
    districts: [{ code: '2', name: 'District', state_code: '1' }],
    subdistricts: [{ code: '3', name: 'Subdistrict', state_code: '1', district_code: '2' }],
    blocks: [{ code: '4', name: 'Block', state_code: '1', district_code: '2' }],
  };
  const current = { source_date: '23Sep2026', row_counts: Object.fromEntries(levels.map((level) => [level, 1])) };
  writeSnapshot(dir, tables, current);
  const before = Object.fromEntries([...levels, 'meta'].map((level) => [level, fs.readFileSync(path.join(dir, `${level}.json`))]));
  assert.throws(() => publishValidatedSnapshot(dir, tables, { ...current, source_date: '19Sep2026' }), /older/i);
  for (const level of [...levels, 'meta']) assert.deepEqual(fs.readFileSync(path.join(dir, `${level}.json`)), before[level]);
});
