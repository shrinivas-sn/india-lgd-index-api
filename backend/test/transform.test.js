// Offline fixture test for the ingestion pipeline (Phase 1 requirement: tests
// must not depend on the internet or today's date). Uses the exact header
// quirks observed in the real 05/09/2026 files, including the spacing trap
// (`District Name(In English)` with no space) and float-artifact codes ("28.0").
const test = require('node:test');
const assert = require('node:assert');

const {
  parseCsv,
  normalizeRows,
  validateIntegrity,
  validateHeaders,
  cleanCode,
} = require('../scripts/transform');

const STATES_CSV = `S.No.,State Code,State Version,State Name (In English),State Name (In Local),Census 2001 Code,Census 2011 Code,State or UT
1,28.0,1,Andhra Pradesh,ANDHRA PRADESH,28,28,S
2,30,1,"Bilaspur-test, with comma",NAME,30,30,U`;

const DISTRICTS_CSV = `S.No.,State Code,State Name (In English),District Code,District Name(In English),Census 2001 Code,Census 2011 Code
1,28,Andhra Pradesh,551,Alluri Sitharama Raju,,
2,30,State Two,552,Bilaspur,,`;

const SUBDISTRICTS_CSV = `S.No.,State Code,State Name,District Code,District Name,Sub-district Code,Sub-district Version,Sub-district Name,Census 2001 Code,Census 2011 Code
1,28,Andhra Pradesh,551,Alluri Sitharama Raju,7668,1,Gangavaram,,
2,30,State Two,552,District Two,7669,1,Ramgarh,,`;

const BLOCKS_CSV = `S.No.,State Code,State Name (In English),District Code,District Name (In English),Development Block Code,Development Block Version,Development Block Name (In English),Development Block Name (In Local)
1,28,Andhra Pradesh,551,Alluri Sitharama Raju,77001,1,Gangavaram Block,BLOCKLOCAL
2,30,State Two,552,District Two,77002,1,Ramgarh Block,,`;

function buildFixture() {
  return {
    states: normalizeRows(parseCsv(STATES_CSV), 'states'),
    districts: normalizeRows(parseCsv(DISTRICTS_CSV), 'districts'),
    subdistricts: normalizeRows(parseCsv(SUBDISTRICTS_CSV), 'subdistricts'),
    blocks: normalizeRows(parseCsv(BLOCKS_CSV), 'blocks'),
  };
}

test('parseCsv handles quoted fields with commas and escaped quotes', () => {
  const rows = parseCsv('a,b,c\n1,"x, y","say ""hi"""\n');
  assert.deepEqual(rows, [{ a: '1', b: 'x, y', c: 'say "hi"' }]);
});

test('cleanCode strips float artifacts but keeps codes as strings', () => {
  assert.equal(cleanCode('28.0'), '28');
  assert.equal(cleanCode(' 28 '), '28');
  assert.equal(cleanCode('28'), '28');
});

test('normalizeRows maps each file\u2019s actual (inconsistent) headers to the internal schema', () => {
  const f = buildFixture();
  // states: float-artifact code cleaned, english + local + type + census kept
  assert.equal(f.states[0].code, '28');
  assert.equal(f.states[0].name, 'Andhra Pradesh');
  assert.equal(f.states[0].name_local, 'ANDHRA PRADESH');
  assert.equal(f.states[0].type, 'S');
  assert.equal(f.states[0].census_2011_code, '28');
  assert.equal(f.states[0].state_code, undefined);
  // districts: header WITHOUT the space (`District Name(In English)`) still maps
  assert.equal(f.districts[0].code, '551');
  assert.equal(f.districts[0].name, 'Alluri Sitharama Raju');
  assert.equal(f.districts[0].state_code, '28');
  assert.equal(f.districts[0].name_local, undefined);
  // subdistricts: `Sub-district Name` maps; parent refs present
  assert.equal(f.subdistricts[0].code, '7668');
  assert.equal(f.subdistricts[0].district_code, '551');
  // blocks: spaced variant `Development Block Name (In English)` maps
  assert.equal(f.blocks[0].code, '77001');
  assert.equal(f.blocks[0].name_local, 'BLOCKLOCAL');
});

test('validateIntegrity passes on a clean fixture (zero orphans, unique codes)', () => {
  const { errors } = validateIntegrity(buildFixture());
  assert.deepEqual(errors, []);
});

test('validateIntegrity catches orphaned parent references', () => {
  const f = buildFixture();
  f.districts.push({ code: '999', name: 'Orphan District', state_code: '99' });
  const { errors } = validateIntegrity(f);
  assert.ok(errors.some((e) => e.includes('orphan state_code "99"')));
});

test('validateIntegrity catches duplicate codes within a level', () => {
  const f = buildFixture();
  f.states.push({ code: '28', name: 'Duplicate Andhra', state_code: undefined });
  const { errors } = validateIntegrity(f);
  assert.ok(errors.some((e) => e.includes('duplicate code "28"')));
});

test('block codes may repeat across districts (upstream LGD reality) without failing', () => {
  const f = buildFixture();
  // same block code in a different district — legitimate per live 19Sep2026 data
  f.blocks.push({ code: '77001', name: 'Another Gangavaram', state_code: '30', district_code: '552' });
  const { errors } = validateIntegrity(f);
  assert.deepEqual(errors, []);
});

test('block codes duplicated within the same district still fail', () => {
  const f = buildFixture();
  f.blocks.push({ code: '77001', name: 'Gangavaram Again', state_code: '28', district_code: '551' });
  const { errors } = validateIntegrity(f);
  assert.ok(errors.some((e) => e.includes('duplicate (state,district,code)')));
});

test('validateIntegrity catches blank codes', () => {
  const f = buildFixture();
  f.blocks.push({ code: '', name: 'No Code Block', state_code: '28', district_code: '551' });
  const { errors } = validateIntegrity(f);
  assert.ok(errors.some((e) => e.includes('missing/blank code')));
});

test('validateHeaders rejects a renamed required source column before normalization', () => {
  const rows = parseCsv('State Code,State Display Name\n28,Andhra Pradesh\n');
  assert.ok(validateHeaders(rows, 'states').some((error) => error.includes('name')));
});

test('validateIntegrity rejects blank names and nonnumeric codes', () => {
  const f = buildFixture();
  f.states[0].name = '';
  f.districts[0].code = 'district-551';
  const { errors } = validateIntegrity(f);
  assert.ok(errors.some((error) => error.includes('blank name')));
  assert.ok(errors.some((error) => error.includes('nonnumeric code')));
});

test('validateIntegrity rejects a child whose district belongs to another state', () => {
  const f = buildFixture();
  f.subdistricts[0].state_code = '30';
  f.blocks[0].state_code = '30';
  const { errors } = validateIntegrity(f);
  assert.ok(errors.some((error) => error.includes('district/state mismatch') && error.includes('subdistricts')));
  assert.ok(errors.some((error) => error.includes('district/state mismatch') && error.includes('blocks')));
});
