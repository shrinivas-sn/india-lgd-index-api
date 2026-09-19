/**
 * Standardized Success Response Envelope (CONVENTIONS.md shape — Decision 11):
 * { success: true, data, meta: { count, ... } }
 */
function sendSuccess(res, data, meta = {}, statusCode = 200) {
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

module.exports = {
  sendSuccess,
  sendError,
};
