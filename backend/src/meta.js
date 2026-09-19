// Decision 9: every /v1 response carries the GODL-India attribution and the
// data-freshness timestamps from meta.json.
const db = require('./db');

function baseMeta() {
  return {
    source_date: db.meta.source_date,
    ingested_at: db.meta.ingested_at,
    attribution: {
      source: 'Ministry of Panchayati Raj — Local Government Directory (LGD)',
      lgd_url: 'https://lgdirectory.gov.in/',
      data_mirror_url: 'https://github.com/ramSeraph/opendata',
      license: 'GODL-India',
    },
  };
}

module.exports = { baseMeta };
