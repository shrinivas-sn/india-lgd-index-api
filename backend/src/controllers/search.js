const db = require('../db');
const { sendSuccess, sendError } = require('../validators');
const { baseMeta } = require('../meta');

/**
 * GET /v1/search?q=<text>
 * Case-insensitive substring match across all four levels. Names are NOT
 * unique (Bilaspur x2 districts, Ramgarh x8 sub-districts), so results are
 * grouped by level and each row carries its parent chain for disambiguation.
 */
function search(req, res) {
  const q = req.validatedQuery.q;
  if (q === undefined || String(q).trim() === '') {
    return sendError(res, 'MISSING_PARAM', 'Required query parameter "q" is missing or empty.', 400);
  }

  const { groups, total, truncated } = db.search(String(q));

  const data = {
    query: String(q),
    results: groups,
  };

  const meta = {
    total,
    truncated,
    match_limit_per_level: db.SEARCH_MATCH_LIMIT,
    ...baseMeta(),
  };
  return sendSuccess(res, data, meta);
}

module.exports = { search };
