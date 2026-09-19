// Pure transform + integrity logic for the LGD ingestion pipeline. Kept free of
// network and filesystem access so it can be unit-tested against fixed fixtures
// (Phase 1 requirement: tests must not depend on the internet or today's date).
//
// TRAP this module exists to solve: the 4 upstream CSV files use inconsistent
// header names (e.g. `District Name(In English)` with no space vs
// `District Name (In English)` with one; `State Name` vs
// `State Name (In English)`). Headers are therefore normalized by lowercasing
// and stripping ALL whitespace, then matched against explicit per-file maps —
// never positionally indexed.

/**
 * Quote-aware CSV parser. Handles double-quoted fields containing commas,
 * newlines, and escaped quotes (""). Strips a leading BOM if present.
 */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else if (c === '\r') {
      // swallow — handled by \n
    } else {
      field += c;
    }
  }
  // final field/row without trailing newline
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] !== undefined ? r[i] : '';
    });
    return obj;
  });
}

// Normalized header keys: lowercase, all whitespace removed. This collapses the
// spacing variants the upstream files actually use into one lookup.
const norm = (h) => h.toLowerCase().replace(/\s+/g, '');

// Explicit per-file column maps (verified 05/09/2026 against the real files —
// see PLAN.md's header table). Anything not mapped is deliberately dropped
// (S.No., version columns, redundant name columns).
const HEADER_MAPS = {
  states: {
    'statecode': 'code',
    'statename(inenglish)': 'name',
    'statename(inlocal)': 'name_local',
    'stateorut': 'type',
    'census2001code': 'census_2001_code',
    'census2011code': 'census_2011_code',
  },
  districts: {
    'districtcode': 'code',
    'districtname(inenglish)': 'name',
    'statecode': 'state_code',
  },
  subdistricts: {
    'sub-districtcode': 'code',
    'sub-districtname': 'name',
    'statecode': 'state_code',
    'districtcode': 'district_code',
  },
  blocks: {
    'developmentblockcode': 'code',
    'developmentblockname(inenglish)': 'name',
    'developmentblockname(inlocal)': 'name_local',
    'statecode': 'state_code',
    'districtcode': 'district_code',
  },
};

// Source values sometimes arrive as float artifacts ("28.0") or padded (" 28 ").
// Codes stay strings; only a trailing ".0" from float coercion is stripped.
function cleanCode(value) {
  if (value === undefined || value === null) return '';
  let v = String(value).trim();
  if (/^\d+\.0+$/.test(v)) v = v.slice(0, v.indexOf('.'));
  return v;
}

function cleanText(value) {
  if (value === undefined || value === null) return undefined;
  const v = String(value).trim();
  return v === '' ? undefined : v;
}

function remap(rows, level) {
  const map = HEADER_MAPS[level];
  return rows.map((row) => {
    const out = {};
    for (const [header, value] of Object.entries(row)) {
      const target = map[norm(header)];
      if (target) out[target] = value;
    }
    return out;
  });
}

/**
 * Normalizes raw CSV rows for one level into the internal schema
 * (PLAN.md Phase 1): strings, trimmed, cleaned codes, undefined fields omitted.
 */
function normalizeRows(rawRows, level) {
  return remap(rawRows, level).map((r) => {
    const out = {};
    out.code = cleanCode(r.code);
    const name = cleanText(r.name);
    if (name !== undefined) out.name = name;
    const nameLocal = cleanText(r.name_local);
    if (nameLocal !== undefined) out.name_local = nameLocal;
    if (level === 'states') {
      const type = cleanText(r.type);
      if (type !== undefined) out.type = type;
      for (const key of ['census_2001_code', 'census_2011_code']) {
        const v = cleanCode(r[key]);
        if (v !== '') out[key] = v;
      }
    }
    if (level !== 'states') {
      out.state_code = cleanCode(r.state_code);
    }
    if (level === 'subdistricts' || level === 'blocks') {
      out.district_code = cleanCode(r.district_code);
    }
    return out;
  });
}

/**
 * Referential integrity + uniqueness checks (same checks proven manually
 * against live data on 05/09/2026, re-run on every ingestion — must fail
 * loudly, never write corrupt data).
 * Returns { errors: string[] } — empty means clean.
 */
function validateIntegrity({ states, districts, subdistricts, blocks }) {
  const errors = [];

  const checkUnique = (rows, level) => {
    const seen = new Set();
    for (const row of rows) {
      if (!row.code) {
        errors.push(`${level}: row with missing/blank code (name: ${row.name || '?'})`);
        continue;
      }
      if (seen.has(row.code)) {
        errors.push(`${level}: duplicate code "${row.code}" (name: ${row.name || '?'})`);
        continue;
      }
      seen.add(row.code);
    }
    return seen;
  };

  const stateCodes = checkUnique(states, 'states');
  const districtCodes = checkUnique(districts, 'districts');
  checkUnique(subdistricts, 'subdistricts');
  // Block codes are NOT nationally unique in the LGD source itself — the same
  // block code is legitimately reused for distinct blocks in different
  // districts (verified against live 19Sep2026 data: e.g. block code 2494 is
  // two distinct "Gobardhana" blocks in districts 616 and 280 of state 18).
  // Uniqueness for blocks is therefore scoped to (state, district, code).
  const seenBlockKeys = new Set();
  for (const row of blocks) {
    if (!row.code) {
      errors.push(`blocks: row with missing/blank code (name: ${row.name || '?'})`);
      continue;
    }
    const key = `${row.state_code}|${row.district_code}|${row.code}`;
    if (seenBlockKeys.has(key)) {
      errors.push(`blocks: duplicate (state,district,code) "${key}" (name: ${row.name || '?'})`);
      continue;
    }
    seenBlockKeys.add(key);
  }

  for (const row of districts) {
    if (!stateCodes.has(row.state_code)) {
      errors.push(`districts: "${row.name}" (${row.code}) has orphan state_code "${row.state_code}"`);
    }
  }
  for (const row of subdistricts) {
    if (!stateCodes.has(row.state_code)) {
      errors.push(`subdistricts: "${row.name}" (${row.code}) has orphan state_code "${row.state_code}"`);
    }
    if (!districtCodes.has(row.district_code)) {
      errors.push(`subdistricts: "${row.name}" (${row.code}) has orphan district_code "${row.district_code}"`);
    }
  }
  for (const row of blocks) {
    if (!stateCodes.has(row.state_code)) {
      errors.push(`blocks: "${row.name}" (${row.code}) has orphan state_code "${row.state_code}"`);
    }
    if (!districtCodes.has(row.district_code)) {
      errors.push(`blocks: "${row.name}" (${row.code}) has orphan district_code "${row.district_code}"`);
    }
  }

  // sanity: nothing failed so hard the tables are empty
  if (states.length === 0) errors.push('states: table is empty — parser or source problem');
  for (const [level, count] of Object.entries({ districts, subdistricts, blocks })) {
    if (count.length === 0) errors.push(`${level}: table is empty — parser or source problem`);
  }

  return { errors };
}

module.exports = {
  parseCsv,
  HEADER_MAPS,
  normalizeRows,
  validateIntegrity,
  cleanCode,
  norm,
};

