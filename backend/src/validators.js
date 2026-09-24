/**
 * Standardized Success Response Envelope (CONVENTIONS.md shape — Decision 11):
 * { success: true, data, meta: { count, ... } }
 */
function sendSuccess(res, data, meta = {}, statusCode = 200) {
  res.set('Cache-Control', 'private, max-age=60');
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      count: Array.isArray(data) ? data.length : 1,
      ...meta,
    },
  });
}

/**
 * Standardized Error Response Envelope (CONVENTIONS.md shape — Decision 11):
 * { success: false, error: { code, message, details? } }
 */
function sendError(res, code, message, statusCode = 400, details = null) {
  res.set('Cache-Control', 'no-store');
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details) response.error.details = details;
  return res.status(statusCode).json(response);
}

function validateQuery(allowed) {
  return (req, res, next) => {
    const query = new URL(req.originalUrl, 'http://localhost').searchParams;
    const values = {};
    for (const [key, value] of query) {
      if (!allowed.includes(key) || Object.hasOwn(values, key)) {
        return sendError(res, 'INVALID_QUERY_PARAM', `Unknown or repeated query parameter "${key}".`, 400);
      }
      if (key === 'state' || key === 'district') {
        if (!/^\d+$/.test(value)) {
          return sendError(res, 'INVALID_QUERY_PARAM', `Query parameter "${key}" must be a numeric LGD code.`, 400);
        }
      } else if (key === 'q') {
        if (value.trim() === '') {
          return sendError(res, 'MISSING_PARAM', 'Required query parameter "q" is missing or empty.', 400);
        }
        if ([...value].length > 100 || /[\x00-\x1f\x7f]/.test(value)) {
          return sendError(res, 'INVALID_QUERY_PARAM', 'Search text must be at most 100 characters without control characters.', 400);
        }
      }
      values[key] = value;
    }
    req.validatedQuery = values;
    next();
  };
}

module.exports = {
  sendSuccess,
  sendError,
  validateQuery,
};
