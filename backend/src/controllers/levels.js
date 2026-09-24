const db = require('../db');
const { sendSuccess, sendError } = require('../validators');
const { baseMeta } = require('../meta');

// Shared logic for the two levels (subdistricts, blocks) that filter by
// district and/or state with the same rules.
function makeLevelHandler({ getData, validDistrictCodes, validStateCodes, label }) {
  return function handler(req, res) {
    const { district: districtCode, state: stateCode } = req.validatedQuery;

    if (districtCode === undefined && stateCode === undefined) {
      return sendError(
        res,
        'MISSING_PARAM',
        `Provide at least one filter: ?district=<code> or ?state=<code>. Without a filter the response would include every ${label} in India (thousands of rows).`,
        400
      );
    }
    if (districtCode !== undefined && !validDistrictCodes.has(String(districtCode))) {
      return sendError(
        res,
        'INVALID_DISTRICT_CODE',
        `Unknown district code "${districtCode}". Check /v1/districts for valid district codes.`,
        404
      );
    }
    if (stateCode !== undefined && !validStateCodes.has(String(stateCode))) {
      return sendError(
        res,
        'INVALID_STATE_CODE',
        `Unknown state code "${stateCode}". Valid state codes: ${[...validStateCodes].join(', ')}.`,
        404
      );
    }

    if (districtCode !== undefined && stateCode !== undefined) {
      const district = db.getDistricts().find((row) => row.code === districtCode);
      if (district.state_code !== stateCode) {
        return sendError(res, 'FILTER_MISMATCH', `District ${districtCode} belongs to state ${district.state_code}, not ${stateCode}.`, 400);
      }
    }

    const data = getData({ stateCode, districtCode });
    const meta = {
      state: stateCode ?? undefined,
      district: districtCode ?? undefined,
      ...baseMeta(),
    };
    return sendSuccess(res, data, meta);
  };
}

const districtCodes = new Set(
  db.getDistricts().map((d) => d.code)
);
const stateCodes = new Set(db.getStateCodes());

const getSubdistricts = makeLevelHandler({
  label: 'sub-district',
  getData: db.getSubdistricts,
  validDistrictCodes: districtCodes,
  validStateCodes: stateCodes,
});

const getBlocks = makeLevelHandler({
  label: 'block',
  getData: db.getBlocks,
  validDistrictCodes: districtCodes,
  validStateCodes: stateCodes,
});

module.exports = { getSubdistricts, getBlocks, makeLevelHandler };
