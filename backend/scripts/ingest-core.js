const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');
const { validateIntegrity } = require('./transform');

const LEVELS = ['states', 'districts', 'subdistricts', 'blocks'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseAssetDate(name) {
  const match = name.match(/\.(\d{2})([A-Za-z]{3})(\d{4})\.csv\.7z$/);
  if (!match) return null;
  const month = MONTHS.findIndex((value) => value.toLowerCase() === match[2].toLowerCase());
  if (month < 0) return null;
  const day = Number(match[1]);
  const year = Number(match[3]);
  const timestamp = Date.UTC(year, month, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  return { label: `${match[1]}${MONTHS[month]}${match[3]}`, timestamp };
}

function selectLatestCompleteSet(assets, { now = new Date(), maxAgeDays = 14 } = {}) {
  const byDate = new Map();
  for (const asset of assets) {
    const level = LEVELS.find((value) => asset.name.startsWith(`${value}.`));
    const date = parseAssetDate(asset.name);
    if (!level || !date || !asset.browser_download_url) continue;
    if (!byDate.has(date.timestamp)) byDate.set(date.timestamp, { label: date.label, files: {} });
    byDate.get(date.timestamp).files[level] = {
      url: asset.browser_download_url,
      name: asset.name,
      source_date: date.label,
      digest: asset.digest || null,
    };
  }
  const complete = [...byDate.entries()]
    .filter(([, value]) => LEVELS.every((level) => value.files[level]))
    .sort((a, b) => b[0] - a[0]);
  if (complete.length === 0) throw new Error('No complete four-level LGD source set found');
  const [timestamp, selected] = complete[0];
  const ageDays = (now.getTime() - timestamp) / 86_400_000;
  if (ageDays > maxAgeDays) throw new Error(`LGD source set is stale: ${selected.label} (${ageDays.toFixed(1)} days old)`);
  if (ageDays < -1) throw new Error(`LGD source date is in the future: ${selected.label}`);
  return { sourceDate: selected.label, files: selected.files };
}

function validateRowCounts(tables, previousCounts, { maxDropFraction = 0.05 } = {}) {
  const errors = [];
  for (const level of LEVELS) {
    const previous = previousCounts[level];
    if (!Number.isFinite(previous) || previous <= 0) continue;
    const current = tables[level].length;
    if (current < previous * (1 - maxDropFraction)) {
      errors.push(`${level}: row count dropped from ${previous} to ${current} (> ${maxDropFraction * 100}%)`);
    }
  }
  return errors;
}

function writeSnapshot(dataDir, tables, metadata, { now = new Date() } = {}) {
  const fileBytes = Object.fromEntries(LEVELS.map((level) => [level, JSON.stringify(tables[level])]));
  const metaPath = path.join(dataDir, 'meta.json');
  const priorMeta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null;
  const priorWithoutIngestTime = priorMeta && Object.fromEntries(
    Object.entries(priorMeta).filter(([key]) => key !== 'ingested_at')
  );
  const unchanged = priorMeta
    && isDeepStrictEqual(priorWithoutIngestTime, metadata)
    && LEVELS.every((level) => {
      const file = path.join(dataDir, `${level}.json`);
      return fs.existsSync(file) && fs.readFileSync(file, 'utf8') === fileBytes[level];
    });
  if (unchanged) return false;

  const meta = { source_date: metadata.source_date, ingested_at: now.toISOString(),
    ...Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== 'source_date')) };
  const staging = fs.mkdtempSync(path.join(dataDir, '.stage-'));
  try {
    for (const level of LEVELS) fs.writeFileSync(path.join(staging, `${level}.json`), fileBytes[level]);
    fs.writeFileSync(path.join(staging, 'meta.json'), JSON.stringify(meta, null, 2));
    for (const name of [...LEVELS, 'meta']) {
      fs.copyFileSync(path.join(staging, `${name}.json`), path.join(dataDir, `${name}.json`));
    }
  } finally {
    const resolved = fs.realpathSync(staging);
    const parent = fs.realpathSync(dataDir);
    const relative = path.relative(parent, resolved);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Unsafe staging cleanup path: ${resolved}`);
    }
    fs.rmSync(resolved, { recursive: true, force: true });
  }
  return true;
}

function publishValidatedSnapshot(dataDir, tables, metadata, options = {}) {
  const metaPath = path.join(dataDir, 'meta.json');
  const previous = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null;
  const incomingDate = parseAssetDate(`states.${metadata.source_date}.csv.7z`);
  const previousDate = previous && parseAssetDate(`states.${previous.source_date}.csv.7z`);
  const errors = [];
  if (!incomingDate) errors.push(`Invalid source date: ${metadata.source_date}`);
  if (previous && !previousDate) errors.push(`Invalid existing source date: ${previous.source_date}`);
  if (incomingDate && previousDate && incomingDate.timestamp < previousDate.timestamp) {
    errors.push(`Source date ${metadata.source_date} is older than published ${previous.source_date}`);
  }
  errors.push(...validateIntegrity(tables).errors);
  errors.push(...validateRowCounts(tables, previous?.row_counts || {}));
  if (errors.length) throw new Error(`Source snapshot rejected; committed data remains unchanged:\n${errors.join('\n')}`);
  return writeSnapshot(dataDir, tables, metadata, options);
}

module.exports = { LEVELS, parseAssetDate, selectLatestCompleteSet, validateRowCounts, writeSnapshot, publishValidatedSnapshot };
