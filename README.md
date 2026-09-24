# LGD India Administrative Hierarchy API

A keyless REST API for India's administrative hierarchy: states, districts, sub-districts, and development blocks, each with a government-assigned LGD code. The data originates from the Ministry of Panchayati Raj's Local Government Directory; this independent project attempts a weekly refresh through a community mirror. PIN-code lookup is out of scope (see [research](DOCS/RESEARCH/RESEARCH.md)).

Current dataset: **36 states and UTs, 784 districts, 7,092 sub-districts, 7,338 blocks**.

No signup, no API key, CORS open to all origins. Every response carries a `meta.attribution` block naming the source and license.
The machine-readable [OpenAPI 3.1 contract](backend/openapi.v1.json) is also served at `GET /openapi.json` by the backend.

## Quick start

These examples use a backend running locally. After deployment, use the Render HTTPS origin in place of `http://localhost:3000`; the [deployment guide](DOCS/DEPLOYMENT.md) records how to connect the Vercel portal to it.

```bash
curl http://localhost:3000/v1/states
curl "http://localhost:3000/v1/districts?state=32"      # Kerala's 14 districts
curl "http://localhost:3000/v1/subdistricts?district=607"
curl "http://localhost:3000/v1/blocks?district=607"
curl "http://localhost:3000/v1/search?q=ramgarh"
```

Every response uses the same envelope:

```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "count": 36, "source_date": "23Sep2026", "ingested_at": "...", "attribution": { ... } }
}
```

## Endpoints

| Endpoint | Params | Returns |
|---|---|---|
| `GET /v1/states` | none | All 36 states and UTs with LGD, census 2001, and census 2011 codes |
| `GET /v1/districts` | `state` (optional) | Districts, filtered by state if given |
| `GET /v1/subdistricts` | `district` and/or `state` (at least one required) | Sub-districts, filtered by district, state, or both |
| `GET /v1/blocks` | `district` and/or `state` (at least one required) | Development blocks, same filter rules |
| `GET /v1/search` | `q` (required) | Name matches grouped by level |

Filtering rules, applied consistently:

- `/v1/districts` without `state` returns every district in India (784 rows). That is deliberate: 784 rows is small enough for one response, while the levels below it hold 7,000+ rows each and require a filter.
- `/v1/subdistricts` and `/v1/blocks` without a filter return `400 MISSING_PARAM`, because an unfiltered response would be thousands of rows of noise. Filter by `district`, `state`, or both.
- If both `state` and `district` are supplied, the district must belong to that state; otherwise the API returns `400 FILTER_MISMATCH`. Codes must be numeric. Duplicate, empty, and unknown query parameters return `400 INVALID_QUERY_PARAM`.
- An unknown code returns `404` with the valid values listed in the message, so clients can self-correct (`INVALID_STATE_CODE`, `INVALID_DISTRICT_CODE`).
- `/v1/search` accepts 1–100 characters, matches `q` case-insensitively as a substring against entity names, groups hits under `states`, `districts`, `subdistricts`, `blocks`, and caps each level at 50 matches. `meta.truncated.<level>` is `true` only if more matches exist.

`meta` fields worth knowing: `count` (rows in this response), `source_date` (the mirror archive date, e.g. `23Sep2026`), `ingested_at` (when this snapshot was written), and `attribution` (source, LGD URL, mirror URL, license).

## Errors

```json
{ "success": false, "error": { "code": "MISSING_PARAM", "message": "..." } }
```

| Code | HTTP | When |
|---|---|---|
| `MISSING_PARAM` | 400 | A required param is absent (`q`, or any filter on subdistricts/blocks) |
| `INVALID_QUERY_PARAM` | 400 | Unknown, duplicate, empty, or malformed query parameter |
| `FILTER_MISMATCH` | 400 | District does not belong to the supplied state |
| `INVALID_STATE_CODE` | 404 | The code is not a valid LGD state code; message lists valid codes |
| `INVALID_DISTRICT_CODE` | 404 | The code is not a valid LGD district code |
| `ENDPOINT_NOT_FOUND` | 404 | Unknown route, including anything outside `/v1` |
| `TOO_MANY_REQUESTS` | 429 | More than 100 requests in 15 minutes from one IP |
| `URI_TOO_LONG` | 414 | Request URL exceeds 2,048 characters |

Rate limiting is 100 requests per 15 minutes per IP, standard `RateLimit-*` headers included on every `/v1` response.

Operational endpoints: `GET /healthz` reports process liveness, `GET /freshness` reports source age and whether it is within the 14-day threshold, and `GET /openapi.json` serves the machine-readable contract. The operational routes do not require a key.

## Data source and freshness

The Ministry's [Local Government Directory](https://lgdirectory.gov.in/) is the authoritative source. Ingestion pulls CSV snapshots mirrored at [`ramSeraph/opendata`](https://github.com/ramSeraph/opendata) (tag `lgd-latest-extra1`) and normalizes them into four JSON files in `backend/data/`. A GitHub Actions workflow is scheduled for Mondays at 03:00 UTC. Until its first hosted run is verified, the schedule and change-only commit behavior are intended behavior, not an operational guarantee. Each response's `meta.source_date` tells you which snapshot is served.

The four normalized data tables are derived from the CSV snapshots. Ingestion checks source headers, parent relations, and row-count drift before writing. A rerun of the same source leaves `meta.ingested_at` and data files unchanged.

## Running locally

Requirements: Node.js 20+.

```bash
# Backend
cd backend
npm install
npm run ingest        # rebuild backend/data/*.json from the upstream mirror (optional, already committed)
npm start             # serves http://localhost:3000

# Tests (39 focused tests, no external server needed)
npm test

# Frontend portal
cd ../frontend
npm install
npm run dev           # http://localhost:5173; browser calls the backend directly
npm run build         # production bundle in dist/
```

`backend/.env` supports one variable, `PORT` (default 3000). `frontend/.env` supports `VITE_API_BASE_URL` (default `http://localhost:3000`); point it elsewhere to run the portal against a deployed instance. Copy the `.env.example` files if you want a starting point.

Production builds require an HTTPS `VITE_API_BASE_URL` and either `SITE_URL` or Vercel's `VERCEL_PROJECT_PRODUCTION_URL` for canonical links. See [deployment steps](DOCS/DEPLOYMENT.md).

## Repo layout

```
backend/
  src/index.js          Express app: routes, rate limit, 404, error handling
  src/controllers/      One handler per endpoint (states, districts, levels, search)
  src/db.js             In-memory reads over the JSON snapshots
  scripts/transform.js  CSV -> normalized JSON used at ingest time
  scripts/ingest.js     CLI entry for the pipeline
  data/                 states.json, districts.json, subdistricts.json, blocks.json
  test/                 Route and transform tests (node:test)
frontend/
  src/pages/            Home, Playground, Docs, Status, NotFound
  src/components/       JsonViewer, CodeSnippet, StatusBadge, CustomSelect
.github/workflows/
  weekly-ingest.yml     Monday 03:00 UTC cron, commits on real diffs
```

## Web portal

`frontend/` is a React + Vite app for browsing the API: a Playground page that builds live queries and shows the JSON next to copyable cURL/JS/Python snippets, a Docs page mirroring this README's endpoint reference, and a Status page showing dataset freshness from `meta`. It talks to the API directly from the browser; there is no backend of its own.

## License and attribution

Data: [GODL-India](https://www.data.gov.in/Godl) (Government Open Data License, India), source [Local Government Directory](https://lgdirectory.gov.in/), Ministry of Panchayati Raj, mirrored via [ramSeraph/opendata](https://github.com/ramSeraph/opendata). This project is not affiliated with the Ministry. If you build on this API, keep the attribution; `meta.attribution` in every response already carries it.

Code: see [LICENSE](LICENSE).

## Status

The `23Sep2026` snapshot passes 27 focused tests locally. There is no deployed instance yet; see [PLAN.md](PLAN.md) for production work.
