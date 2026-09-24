const { parseAssetDate } = require('../scripts/ingest-core');

function assessFreshness(sourceDate, { now = new Date(), maxAgeDays = 14 } = {}) {
  const parsed = parseAssetDate(`states.${sourceDate}.csv.7z`);
  if (!parsed) return { source_date: sourceDate, fresh: false, age_days: null, reason: 'invalid source date' };
  const ageDays = (now.getTime() - parsed.timestamp) / 86_400_000;
  return {
    source_date: sourceDate,
    fresh: ageDays >= -1 && ageDays <= maxAgeDays,
    age_days: Math.round(ageDays * 10) / 10,
    reason: ageDays < -1 ? 'future source date' : ageDays > maxAgeDays ? 'source older than 14 days' : null,
  };
}

module.exports = { assessFreshness };
