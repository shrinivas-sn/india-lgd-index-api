# LGD India Administrative Hierarchy API

A keyless REST API for India's administrative hierarchy: states, districts, sub-districts, and development blocks, each with the government-assigned LGD code. The data comes from the Ministry of Panchayati Raj's Local Government Directory, refreshed weekly. PIN-code lookup is deliberately out of scope, `api.postalpincode.in` already covers it (see `DOCS/RESEARCH.md`).

Current dataset: **36 states and UTs, 784 districts, 7,092 sub-districts, 7,338 blocks**.

No signup, no API key, CORS open to all origins. Every response carries a `meta.attribution` block naming the source and license.

## Quick start

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
  "meta": { "count": 36, "source_date": "19Sep2026", "ingested_at": "...", "attribution": { ... } }
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
- An unknown code returns `404` with the valid values listed in the message, so clients can self-correct (`INVALID_STATE_CODE`, `INVALID_DISTRICT_CODE`).
- `/v1/search` matches `q` case-insensitively as a substring against entity names, groups hits under `states`, `districts`, `subdistricts`, `blocks`, and caps each level at 50 matches. When a level hits the cap, `meta.truncated.<level>` is `true`.

`meta` fields worth knowing: `count` (rows in this response), `source_date` (the LGD snapshot date, e.g. `19Sep2026`), `ingested_at` (when the transform ran), and `attribution` (source, LGD URL, mirror URL, license).

## Errors

```json
{ "success": false, "error": { "code": "MISSING_PARAM", "message": "..." } }
```

| Code | HTTP | When |
|---|---|---|
| `MISSING_PARAM` | 400 | A required param is absent (`q`, or any filter on subdistricts/blocks) |
| `INVALID_STATE_CODE` | 404 | The code is not a valid LGD state code; message lists valid codes |
| `INVALID_DISTRICT_CODE` | 404 | The code is not a valid LGD district code |
| `ENDPOINT_NOT_FOUND` | 404 | Unknown route, including anything outside `/v1` |
| `TOO_MANY_REQUESTS` | 429 | More than 100 requests in 15 minutes from one IP |

Rate limiting is 100 requests per 15 minutes per IP, standard `RateLimit-*` headers included on every `/v1` response.

## Data source and freshness

The Ministry's [Local Government Directory](https://lgdirectory.gov.in/) is the authoritative source but has no bulk-download API. Ingestion pulls the weekly CSV export mirrored at [`ramSeraph/opendata`](https://github.com/ramSeraph/opendata) (tag `lgd-latest-extra1`), normalizes it into the four JSON files in `backend/data/`, and commits only when the content actually changed. A GitHub Actions workflow runs this every Monday at 03:00 UTC. Each response's `meta.source_date` tells you which snapshot you are reading.

The pipeline is deterministic: same CSV in, same JSON out. Re-running it locally reproduces the committed files byte for byte unless LGD changed upstream.

## Running locally

Requirements: Node.js 20+.

```bash
# Backend
cd backend
npm install
npm run ingest        # rebuild backend/data/*.json from the upstream mirror (optional, already committed)
npm start             # serves http://localhost:3000

# Tests (19 route and transform tests, no server needed)
npm test

# Frontend portal
cd ../frontend
npm install
npm run dev           # http://localhost:5173, proxies API calls to localhost:3000
npm run build         # production bundle in dist/
```

`backend/.env` supports one variable, `PORT` (default 3000). `frontend/.env` supports `VITE_API_BASE_URL` (default `http://localhost:3000`); point it elsewhere to run the portal against a deployed instance. Copy the `.env.example` files if you want a starting point.

## Repo layout

```
backend/
  src/index.js          Express app: routes, rate limit, 404, error handling
  src/controllers/      One handler per endpoint (states, districts, levels, search)
  src/db.js             In-memory reads over the JSON snapshots
  src/transform.js      CSV -> normalized JSON used at ingest time
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

Data: [GODL-India](https://lgdirectory.gov.in/) (Government Open Data License, India), source [Local Government Directory](https://lgdirectory.gov.in/), Ministry of Panchayati Raj, mirrored via [ramSeraph/opendata](https://github.com/ramSeraph/opendata). This project is not affiliated with the Ministry. If you build on this API, keep the attribution; `meta.attribution` in every response already carries it.

Code: see [LICENSE](LICENSE).

## Status

19/19 tests passing against the `19Sep2026` snapshot. Deployed instance: not yet, see `PLAN.md` for what remains.
