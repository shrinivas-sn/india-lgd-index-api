// LGD ingestion: discover the newest complete release set, download .7z,
// extract CSV, normalize and validate every level, then publish the snapshot.
//
// Local Windows note: 7-Zip is usually NOT on PATH. This script tries, in order:
//   1. SEVENZIP_PATH env var (set it to "C:\Program Files\7-Zip\7z.exe")
//   2. "C:\Program Files\7-Zip\7z.exe" (default install location)
//   3. "7z" on PATH (what GitHub Actions ubuntu runners have after p7zip-full)
// CI installs p7zip-full explicitly as a safety net (Decision 5).

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const { parseCsv, normalizeRows, validateHeaders } = require('./transform');
const { LEVELS, selectLatestCompleteSet, publishValidatedSnapshot } = require('./ingest-core');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RELEASES_API_URL =
  'https://api.github.com/repos/ramSeraph/opendata/releases/tags/lgd-latest-extra1';

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
  const res = await fetch(url, {
    headers: { 'User-Agent': 'lgd-admin-hierarchy-api-ingest' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'lgd-admin-hierarchy-api-ingest' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const length = Number(res.headers.get('content-length'));
  if (Number.isFinite(length) && length > 20_000_000) throw new Error(`Archive exceeds 20 MB: ${url}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > 20_000_000) throw new Error(`Archive exceeds 20 MB: ${url}`);
  return bytes;
}

async function discoverFiles() {
  const release = JSON.parse(await fetchText(RELEASES_API_URL));
  return selectLatestCompleteSet(release.assets || []);
}

async function fetchLevel(level, file, sevenZip) {
  const archivePath = path.join(os.tmpdir(), `lgd-${level}-${crypto.randomUUID()}.7z`);
  try {
    const bytes = await fetchBuffer(file.url);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    if (file.digest && file.digest !== `sha256:${sha256}`) {
      throw new Error(`${level}: archive checksum mismatch`);
    }
    fs.writeFileSync(archivePath, bytes);
    const csv = execFileSync(sevenZip, ['e', '-so', archivePath], {
      maxBuffer: 64 * 1024 * 1024,
    });
    return { csvText: csv.toString('utf8'), sha256 };
  } finally {
    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
  }
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sevenZip = resolve7z();
  console.log(`Using 7z at: ${sevenZip}`);

  const { sourceDate, files } = await discoverFiles();

  const tables = {};
  const sourceAssets = {};
  for (const level of LEVELS) {
    console.log(`Fetching ${level}: ${files[level].url}`);
    const { csvText, sha256 } = await fetchLevel(level, files[level], sevenZip);
    const raw = parseCsv(csvText);
    const headerErrors = validateHeaders(raw, level);
    if (headerErrors.length) throw new Error(headerErrors.join('; '));
    tables[level] = normalizeRows(raw, level);
    sourceAssets[level] = { name: files[level].name, url: files[level].url, sha256 };
    console.log(`  -> ${tables[level].length} rows (source date: ${sourceDate})`);
  }

  const meta = {
    source_date: sourceDate,
    row_counts: Object.fromEntries(LEVELS.map((l) => [l, tables[l].length])),
    ...ATTRIBUTION,
    source_assets: sourceAssets,
  };
  const changed = publishValidatedSnapshot(DATA_DIR, tables, meta);
  console.log('Integrity check passed: codes, names, parent chain, and row-count drift.');
  console.log(changed ? 'Published validated snapshot.' : 'Snapshot unchanged; no files rewritten.');
  console.log(`Source date: ${sourceDate}`);
}


main().catch((err) => {
  console.error('Ingestion failed:', err.message);
  process.exit(1);
});
