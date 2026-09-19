// One-off probe: print every block row sharing a duplicate Development Block
// Code, with full context, to decide how uniqueness should be defined for blocks.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { parseCsv } = require('./transform');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LISTING_URL = 'https://ramseraph.github.io/opendata/lgd/archives/listing_files.csv';
const RELEASES_URL =
  'https://api.github.com/repos/ramSeraph/opendata/releases/tags/lgd-latest-extra1';

async function main() {
  const listing = await (await fetch(LISTING_URL)).text();
  console.log('listing head:', JSON.stringify(listing.slice(0, 500)));
  const lines = listing.split(/\r?\n/).filter((l) => l.startsWith('blocks.'));
  console.log('matching listing lines:', lines.length, JSON.stringify(lines.slice(0, 3)));
  // the archives listing only tracks the lgd-archive-extra1 yearly snapshots —
  // for the current daily file, go straight to the lgd-latest-extra1 release
  const rel = await (await fetch(RELEASES_URL, { headers: { 'User-Agent': 'probe' } })).json();
  const asset = rel.assets
    .filter((a) => a.name.startsWith('blocks.') && a.name.endsWith('.csv.7z'))
    .sort((a, b) => b.name.localeCompare(a.name))[0];
  console.log('fallback asset:', asset && asset.name);
  if (!asset) throw new Error('no blocks asset in lgd-latest-extra1 release');
  const url = asset.browser_download_url;
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = fs.mkdtempSync(path.join(DATA_DIR, 'tmp-probe-'));
  const arch = path.join(tmp, 'b.7z');
  fs.writeFileSync(arch, buf);
  execFileSync('C:\\Program Files\\7-Zip\\7z.exe', ['e', arch, `-o${tmp}`, '-y'], { stdio: 'pipe' });
  const csv = fs.readFileSync(path.join(tmp, fs.readdirSync(tmp).find((f) => f.endsWith('.csv'))), 'utf8');
  fs.rmSync(tmp, { recursive: true, force: true });

  const rows = parseCsv(csv);
  const byCode = new Map();
  for (const r of rows) {
    const code = r['Development Block Code'];
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(r);
  }
  for (const [code, group] of byCode) {
    if (group.length < 2) continue;
    console.log(`\n=== Block code ${code} (${group.length} rows) ===`);
    for (const r of group) {
      console.log(
        JSON.stringify({
          state: r['State Code'],
          district: r['District Code'],
          block: r['Development Block Name (In English)'],
          version: r['Development Block Version'],
          sno: r['S.No.'],
        })
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
