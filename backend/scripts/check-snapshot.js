const fs = require('fs');
const path = require('path');
const { LEVELS } = require('./ingest-core');
const { validateIntegrity } = require('./transform');
const { assessFreshness } = require('../src/freshness');

function checkSnapshot(dataDir, { now = new Date(), strictFreshness = false } = {}) {
  const tables = Object.fromEntries(LEVELS.map((level) => [level, JSON.parse(fs.readFileSync(path.join(dataDir, `${level}.json`), 'utf8'))]));
  const meta = JSON.parse(fs.readFileSync(path.join(dataDir, 'meta.json'), 'utf8'));
  const errors = validateIntegrity(tables).errors;
  for (const level of LEVELS) {
    if (meta.row_counts?.[level] !== tables[level].length) errors.push(`${level}: metadata count differs from snapshot`);
    if (!/^[a-f0-9]{64}$/.test(meta.source_assets?.[level]?.sha256 || '')) errors.push(`${level}: missing source archive SHA-256`);
  }
  const freshness = assessFreshness(meta.source_date, { now });
  if (!freshness.fresh && strictFreshness) errors.push(`Stale source snapshot: ${freshness.reason}`);
  return { errors, freshness, counts: meta.row_counts };
}

if (require.main === module) {
  const result = checkSnapshot(path.join(__dirname, '..', 'data'), { strictFreshness: process.argv.includes('--strict-freshness') });
  console.log(JSON.stringify(result));
  if (result.errors.length) process.exitCode = 1;
}

module.exports = { checkSnapshot };
