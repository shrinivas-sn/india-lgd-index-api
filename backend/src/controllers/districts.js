const db = require('../db');
const { sendSuccess, sendError } = require('../validators');
const { baseMeta } = require('../meta');

/**
 * GET /v1/districts?state=<code>
 * Optional state filter; an unknown state code is a 404 with the list of valid
 * state codes in the message (CONVENTIONS.md rule).
 */
function getDistricts(req, res) {
  const stateCode = req.query.state;
  if (stateCode !== undefined && !db.isValidStateCode(stateCode)) {
    return sendError(
      res,
      'INVALID_STATE_CODE',
      `Unknown state code "${stateCode}". Valid state codes: ${db.getStateCodes().join(', ')}.`,
      404
    );
  }
  const data = db.getDistricts({ stateCode });
  const meta = { state: stateCode ?? 'all', ...baseMeta() };
  return sendSuccess(res, data, meta);
}

module.exports = { getDistricts };
