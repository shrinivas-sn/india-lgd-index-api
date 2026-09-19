const db = require('../db');
const { sendSuccess } = require('../validators');
const { baseMeta } = require('../meta');

/**
 * GET /v1/states
 * Full list of states/UTs with their LGD codes.
 */
function getStates(req, res) {
  return sendSuccess(res, db.getStates(), baseMeta());
}

module.exports = { getStates };
