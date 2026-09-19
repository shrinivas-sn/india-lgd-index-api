// LGD ingestion: fetch manifest -> discover today's dated files -> download .7z
// -> extract via 7z CLI -> parse CSV (explicit header maps) -> normalize ->
// integrity-check -> write backend/data/*.json + meta.json.
//
// Local Windows note: 7-Zip is usually NOT on PATH. This script tries, in order:
//   1. SEVENZIP_PATH env var (set it to "C:\Program Files\7-Zip\7z.exe")
//   2. "C:\Program Files\7-Zip\7z.exe" (default install location)
//   3. "7z" on PATH (what GitHub Actions ubuntu runners have after p7zip-full)
// CI installs p7zip-full explicitly as a safety net (Decision 5).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { parseCsv, normalizeRows, validateIntegrity } = require('./transform');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LISTING_URL = 'https://ramseraph.github.io/opendata/lgd/archives/listing_files.csv';
const RELEASES_API_URL =
  'https://api.github.com/repos/ramSeraph/opendata/releases/tags/lgd-latest-extra1';

const LEVELS = ['states', 'districts', 'subdistricts', 'blocks'];
const FILE_PREFIX = { states: 'states.', districts: 'districts.', subdistricts: 'subdistricts.', blocks: 'blocks.' };

// Attribution fields (Decision 9) written into meta.json and surfaced in API meta.
const ATTRIBUTION = {
  source: 'Ministry of Panchayati Raj — Local Government Directory (LGD)',
  lgd_url: 'https://lgdirectory.gov.in/',
  data_mirror_url: 'https://github.com/ramSeraph/opendata',
  license: 'GODL-India',
};


function resolve7z() {
  const candidates = [
    process.env.SEVENZIP_PATH,
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
    '7z',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['i'], { stdio: 'pipe' });
      return candidate;
    } catch (err) {
      // not usable — try next
    }
  }
  throw new Error(
    '7z executable not found. Install 7-Zip and set SEVENZIP_PATH, e.g. set SEVENZIP_PATH=C:\\Program Files\\7-Zip\\7z.exe'
  );
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'lgd-admin-hierarchy-api-ingest' } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'lgd-admin-hierarchy-api-ingest' } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Discovers the newest file URL per level. Primary: the archives listing CSV.
 * Fallback: the GitHub Releases API for tag lgd-latest-extra1.
 * Never hardcodes a date — the date suffix changes daily.
 */
async function discoverFiles() {
  const found = {};
  try {
    const listing = await fetchText(LISTING_URL);
    for (const line of listing.split('\n')) {
      for (const level of LEVELS) {
        if (found[level]) continue;
        if (line.includes(FILE_PREFIX[level]) && line.includes('.csv.7z')) {
          const url = line.split(',').map((c) => c.trim().replace(/^"|"$/g, '')).find((c) => c.includes('.csv.7z'));
          if (url) found[level] = { url, source_date_hint: url };
        }
      }
    }
  } catch (err) {
    console.warn(`Listing CSV fetch failed (${err.message}); falling back to Releases API.`);
  }

  const missing = LEVELS.filter((level) => !found[level]);
  if (missing.length > 0) {
    const rel = JSON.parse(await fetchText(RELEASES_API_URL));
    const assets = rel.assets || [];
    for (const level of missing) {
      // newest date wins: asset names sort correctly (DDMonYYYY is ASCII-order
      // stable within a year only when zero-padded — 05Sep2026 < 10Sep2026 works;
      // across year boundaries the listing CSV is the primary source anyway)
      const matches = assets
        .filter((a) => a.name.startsWith(FILE_PREFIX[level]) && a.name.endsWith('.csv.7z'))
        .sort((a, b) => b.name.localeCompare(a.name));
      if (matches.length > 0) {
        found[level] = { url: matches[0].browser_download_url, source_date_hint: matches[0].name };
      }
    }
  }

  const stillMissing = LEVELS.filter((level) => !found[level]);
  if (stillMissing.length > 0) {
    throw new Error(
      `Could not discover source files for: ${stillMissing.join(', ')}`
    );
  }

  // source_date comes from the filename, e.g. states.05Sep2026.csv.7z -> 05Sep2026
  for (const level of LEVELS) {
    const m = found[level].source_date_hint.match(/\.(\d{2}[A-Za-z]{3}\d{4})\./);
    found[level].source_date = m ? m[1] : found[level].source_date_hint;
  }
  return found;
}

/**
 * Downloads + extracts one .7z and returns the parsed CSV text for that level.
 */
async function fetchLevel(level, url, sevenZip) {
  const tmpDir = fs.mkdtempSync(path.join(DATA_DIR, `tmp-${level}-`));
  try {
    const archivePath = path.join(tmpDir, 'data.7z');
    fs.writeFileSync(archivePath, await fetchBuffer(url));
    execFileSync(sevenZip, ['e', archivePath, `-o${tmpDir}`, '-y'], { stdio: 'pipe' });
    const csvPath = fs
      .readdirSync(tmpDir)
      .filter((f) => f.toLowerCase().endsWith('.csv'))
      .map((f) => path.join(tmpDir, f))
      // largest file wins (each archive extracts exactly one CSV, but be safe)
      .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
    if (!csvPath) throw new Error(`no CSV found in extracted archive for ${level}`);
    return fs.readFileSync(csvPath, 'utf8');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sevenZip = resolve7z();
  console.log(`Using 7z at: ${sevenZip}`);

  const files = await discoverFiles();
  const sourceDates = new Set();

  const tables = {};
  for (const level of LEVELS) {
    console.log(`Fetching ${level}: ${files[level].url}`);
    const csvText = await fetchLevel(level, files[level].url, sevenZip);
    const raw = parseCsv(csvText);
    tables[level] = normalizeRows(raw, level);
    sourceDates.add(files[level].source_date);
    console.log(`  -> ${tables[level].length} rows (source date: ${files[level].source_date})`);
  }

  const { errors } = validateIntegrity(tables);
  if (errors.length > 0) {
    console.error(`INTEGRITY CHECK FAILED (${errors.length} problems):`);
    for (const e of errors.slice(0, 20)) console.error(`  - ${e}`);
    if (errors.length > 20) console.error(`  ... and ${errors.length - 20} more`);
    process.exit(1);
  }
  console.log('Integrity check passed: unique codes per level, zero orphaned parent references.');

  if (sourceDates.size !== 1) {
    // dates across the 4 files can drift by a day at most; record them all
    console.warn(`Note: multiple source dates across files: ${[...sourceDates].join(', ')}`);
  }

  for (const level of LEVELS) {
    fs.writeFileSync(
      path.join(DATA_DIR, `${level}.json`),
      JSON.stringify(tables[level])
    );
  }

  const meta = {
    source_date: [...sourceDates].join(', '),
    ingested_at: new Date().toISOString(),
    row_counts: Object.fromEntries(LEVELS.map((l) => [l, tables[l].length])),
    ...ATTRIBUTION,
  };
  fs.writeFileSync(path.join(DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 2));

  console.log(`Wrote 4 data files + meta.json to ${DATA_DIR}`);
  console.log(`Source date: ${meta.source_date}`);
}


main().catch((err) => {
  console.error('Ingestion failed:', err.message);
  process.exit(1);
});
