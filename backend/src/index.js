require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { getStates } = require('./controllers/states');
const { getDistricts } = require('./controllers/districts');
const { getSubdistricts, getBlocks } = require('./controllers/levels');
const { search } = require('./controllers/search');
const { sendError } = require('./validators');

const app = express();
const PORT = process.env.PORT || 3000;

// PaaS deploys (Render/Railway) terminate TLS at a proxy that sets
// X-Forwarded-For. Without this, express-rate-limit v8 raises
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on every such request and buckets all
// clients under the proxy IP. One trusted hop; never 'true' (permissive).
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Decision 10: 100 requests / 15 min / IP (CONVENTIONS.md default).
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Maximum 100 requests per 15 minutes allowed per IP.',
    },
  },
});

app.use('/v1', apiLimiter);

// Root route = health check (CONVENTIONS.md) + Decision 9 attribution.
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to LGD India Administrative Hierarchy API v1',
    data: {
      description:
        'Official administrative hierarchy of India (states, districts, sub-districts, blocks) with government LGD codes, from the Ministry of Panchayati Raj Local Government Directory.',
      endpoints: {
        states: '/v1/states',
        districts: '/v1/districts?state=<state_code>',
        subdistricts: '/v1/subdistricts?district=<district_code>',
        blocks: '/v1/blocks?district=<district_code>',
        search: '/v1/search?q=<text>',
      },
    },
    attribution: {
      source: 'Ministry of Panchayati Raj — Local Government Directory (LGD)',
      lgd_url: 'https://lgdirectory.gov.in/',
      data_mirror_url: 'https://github.com/ramSeraph/opendata',
      license: 'GODL-India',
    },
  });
});
app.get('/v1', (req, res) => {
  res.redirect(307, '/');
});

// v1 API routes
app.get('/v1/states', getStates);
app.get('/v1/districts', getDistricts);
app.get('/v1/subdistricts', getSubdistricts);
app.get('/v1/blocks', getBlocks);
app.get('/v1/search', search);

// Terminal 404 — JSON envelope, never Express's default HTML error page.
app.use((req, res) => {
  return sendError(
    res,
    'ENDPOINT_NOT_FOUND',
    `Route ${req.method} ${req.path} does not exist on this server.`,
    404
  );
});

// Terminal error handler — Express 5 requires exactly 4 args to be recognized
// as an error handler (arity rule; a 2-arg catch-all silently never fires).
// Express 5 auto-forwards async throws/rejections and body-parse errors here.
// Honors upstream status (e.g. 400 from malformed JSON), else 500.
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err && (err.status || err.statusCode) ? err.status || err.statusCode : 500;
  return sendError(
    res,
    status === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST',
    status === 500 ? 'An unexpected error occurred.' : 'Malformed request.',
    status
  );
});

// Export the app for tests; listen only when run directly (not under node --test).
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`LGD Admin Hierarchy API server running on port ${PORT}`);
  });
}

module.exports = app;
