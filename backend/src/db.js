// Loads the ingested LGD JSON files into memory once at boot (Decision 3: flat
// JSON files, no database). All lookup/filter/search helpers live here so the
// controllers stay thin.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadJson(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'));
  } catch (err) {
    throw new Error(
      `Could not load ${filename} from ${DATA_DIR}. Run "npm run ingest" (backend/scripts/ingest.js) first. Original error: ${err.message}`
    );
  }
}

const states = loadJson('states.json');
const districts = loadJson('districts.json');
const subdistricts = loadJson('subdistricts.json');
const blocks = loadJson('blocks.json');
const meta = loadJson('meta.json');

// Codes are unique within each level nationally (verified during ingestion;
// ingestion fails loudly if that ever stops holding).
const statesByCode = new Map(states.map((s) => [s.code, s]));
const districtsByCode = new Map(districts.map((d) => [d.code, d]));
const subdistrictsByCode = new Map(subdistricts.map((s) => [s.code, s]));
const blocksByCode = new Map(blocks.map((b) => [b.code, b]));

function present(value) {
  return value !== undefined && value !== null && value !== '';
}

function getStates() {
  return states;
}

function getStateCodes() {
  return states.map((s) => s.code);
}

function isValidStateCode(code) {
  return statesByCode.has(String(code));
}

function isValidDistrictCode(code) {
  return districtsByCode.has(String(code));
}

function getDistricts({ stateCode } = {}) {
  if (!present(stateCode)) return districts;
  const sc = String(stateCode);
  return districts.filter((d) => d.state_code === sc);
}

// If both filters are given, the more specific district filter wins.
function getSubdistricts({ stateCode, districtCode } = {}) {
  if (present(districtCode)) {
    const dc = String(districtCode);
    return subdistricts.filter((s) => s.district_code === dc);
  }
  if (present(stateCode)) {
    const sc = String(stateCode);
    return subdistricts.filter((s) => s.state_code === sc);
  }
  return subdistricts;
}

function getBlocks({ stateCode, districtCode } = {}) {
  if (present(districtCode)) {
    const dc = String(districtCode);
    return blocks.filter((b) => b.district_code === dc);
  }
  if (present(stateCode)) {
    const sc = String(stateCode);
    return blocks.filter((b) => b.state_code === sc);
  }
  return blocks;
}

// Names are NOT unique (e.g. "Bilaspur" district x2, "Ramgarh" sub-district x8),
// so every search result carries its full parent chain for disambiguation.
// Per-level result cap keeps single-letter queries from producing multi-MB
// responses; capped groups are flagged so callers know the list was cut.
const SEARCH_MATCH_LIMIT = 50;

function search(query) {
  const q = query.toLowerCase();
  const groups = { states: [], districts: [], subdistricts: [], blocks: [] };
  const truncated = { states: false, districts: false, subdistricts: false, blocks: false };

  const collect = (rows, key) => {
    for (const row of rows) {
      if (groups[key].length >= SEARCH_MATCH_LIMIT) {
        truncated[key] = true;
        break;
      }
      const name = row.name.toLowerCase();
      const nameLocal = row.name_local ? row.name_local.toLowerCase() : '';
      if (name.includes(q) || nameLocal.includes(q)) {
        groups[key].push({ level: key, ...row });
      }
    }
  };

  collect(states, 'states');
  collect(districts, 'districts');
  collect(subdistricts, 'subdistricts');
  collect(blocks, 'blocks');

  const total =
    groups.states.length +
    groups.districts.length +
    groups.subdistricts.length +
    groups.blocks.length;

  return { groups, total, truncated };
}

module.exports = {
  getStates,
  getStateCodes,
  isValidStateCode,
  isValidDistrictCode,
  getDistricts,
  getSubdistricts,
  getBlocks,
  search,
  meta,
  SEARCH_MATCH_LIMIT,
};
