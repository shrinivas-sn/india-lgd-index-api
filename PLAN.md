# PLAN — public India LGD API

**Written 24/09/2026.** Temporary live plan; archive durable findings before closing it.

**What this changes:** `backend/scripts/`, `backend/src/`, `backend/test/`, `backend/data/`, `.github/workflows/`, `frontend/` configuration/copy, Render/Vercel deployment configuration, `README.md`, and `DOCS/`.
**Done means:** A public HTTPS `/v1` endpoint on Render serves a validated LGD snapshot without signup or API keys; the Vercel developer portal has crawlable home/docs HTML and correct metadata; both deployments, refresh, rollback, smoke, and failure checks have been observed working.

Read first: `DOCS/STATUS.md`, the 24/09/2026 entry in `DOCS/RESEARCH/RESEARCH.md`, this plan's last Progress Log entry, and the task being executed. The original local build is complete; do not rebuild it. Executor is unknown, so each task has files, anchors, checks, and a commit boundary. Before the first write in a new workspace, run `Get-Acl` on its root and verify owner `SSN-INSPIRON-35\Dell`.

## Contract and scope

- Keep the five `/v1` read endpoints, existing JSON envelopes, open CORS, and keyless access. Do not add PIN, village, map geometry, accounts, or billing to this plan.
- Treat sub-districts and development blocks as separate LGD entity types under districts. A block is not a child of a sub-district in this API.
- Pin and publish a coherent source snapshot. Each response must expose source date, ingest time, and attribution. An unavailable upstream must leave the last good snapshot serving.
- Retain offline test fixtures. They prove edge cases and are not demo data served by the API.
- “Free” means no fee, signup, or consumer API key. Hosting still has a real operator cost; capacity and abuse limits must be public and measured.
- Frontend deploys to Vercel and backend to Render from this repository. Keep host URLs in environment/configuration; do not bake a deployment hostname into source code.

## Phases

### Phase 1 — Source truth and data publication

#### Task 1.1 — Confirm source and license path

- [x] **Why:** The old claim of no LGD API is false; the source path and license must be defensible before publishing.
- **Files/anchors:** `DOCS/RESEARCH/RESEARCH.md` (`Revalidation — 24/09/2026`), `README.md` (`License and attribution`), `backend/scripts/ingest.js` (`ATTRIBUTION`).
- **Edit:** Inspect the government LGD catalog's states/districts/sub-districts downloads and update dates and compare accessible outputs with the mirror's four chosen assets. Record URLs, dates, row counts, hashes, schema differences, and any government-download access limit. Verify the GODL attribution terms and the mirror's provenance. If a direct government feed is automatable without bypassing CAPTCHA or access controls, prefer it; otherwise document why the mirror remains necessary. Correct all public “official API” or update-frequency claims to describe the data source rather than government affiliation.
- **Tests:** Add a fixture-backed source metadata assertion when source fields change. Existing test assertions may change only if an evidenced source contract changed; never change row expectations solely to make a failing ingest pass.
- **Don't touch:** Endpoint paths, authorization model, or unrelated frontend layout.
- **Verify:** Record source URLs and observed dates in research; `node test/transform.test.js` under `backend/` passes.
- **Commit:** `docs: verify LGD source and attribution`.

#### Task 1.2 — Make ingestion deterministic and fail closed

- [x] **Why:** Text sorting dates and timestamp-only rewrites can publish old or false updates; current checks miss parent mismatches.
- **Files/anchors:** `backend/scripts/ingest.js` (`discoverFiles`, `sourceDates`, `fs.writeFileSync`), `backend/scripts/transform.js` (`validateIntegrity`), `backend/test/transform.test.js` (`validateIntegrity passes`).
- **Edit:** Parse `DDMonYYYY` into a real date; choose newest asset per level and require a single coherent source date or an explicitly documented bounded skew. Validate required headers before remapping, numeric nonblank codes, nonblank names, parent-state agreement, sensible row-count drift against the last committed snapshot, and source age. Treat a large or ambiguous change as a failed publish with a diagnostic report. Stage and validate all output before touching `backend/data/`; publish to production only through one tested Git commit and a Render deploy of that commit. A failed CI job must never commit partial files. Preserve existing `meta.ingested_at` and file bytes when normalized data and source date are unchanged. Store source URLs and checksums in metadata. Never silently repair source rows.
- **Tests:** Add fixtures for cross-month/year ordering, missing required header, blank name, mismatched parent state, suspicious row drop, mixed dates, pre-publication failure, and no-op byte identity. Existing transform assertions may change only where the documented validation contract changes; route tests remain read-only.
- **Don't touch:** API response fields or deployed configuration.
- **Verify:** `node test/transform.test.js` passes and a repeated ingest against fixed fixtures yields no `git diff -- backend/data/`. A forced validation failure leaves committed `backend/data/` byte-identical.
- **Commit:** `fix: validate LGD snapshots before publication`.

**Gate:** A rerun against the same source produces no data diff, bad inputs cannot replace good data, and source attribution is recorded.

### Phase 2 — HTTP contract and validation

#### Task 2.1 — Validate filters and search boundaries

- [x] **Why:** An unrelated `state` plus `district` currently returns district rows mislabeled as the requested state; malformed query shapes are not explicitly rejected.
- **Files/anchors:** `backend/src/controllers/levels.js` (`district filter wins`), `backend/src/controllers/districts.js` (`stateCode`), `backend/src/controllers/search.js` (`const q`), `backend/src/db.js` (`SEARCH_MATCH_LIMIT`), `backend/test/routes.test.js` (`GET /v1/blocks`).
- **Edit:** Require each accepted query parameter to be a single scalar string in its documented shape; reject duplicate/array/object values and unknown parameters with a stable 400 code. When both location filters are supplied, require the district's parent state to equal `state`; return a clear 400 mismatch rather than silently ignoring the state. Bound search query length and reject empty/whitespace queries. Mark `meta.truncated` only when a further matching result exists after the returned 50. Preserve case-insensitive matching and parent codes.
- **Tests:** Add HTTP tests for matching and mismatching filter pairs, repeated keys, empty/non-numeric codes, unknown parameters, search query length, exactly 50 and 51 matches. Existing route assertions may change only for the newly specified error contract; transform tests are read-only.
- **Don't touch:** Ingestion files and data fixtures.
- **Verify:** `node test/routes.test.js` passes; manual requests for conflicting parents and repeated params return JSON 400, not mislabeled 200 or 500.
- **Commit:** `fix: enforce location filter and search contracts`.

#### Task 2.2 — Publish a reproducible developer contract

- [x] **Why:** Developers need machine-readable examples that match the live endpoint, including errors and rate limits.
- **Files/anchors:** `README.md` (`Endpoints`, `Errors`), `frontend/src/pages/DocsPage.jsx` (`/v1`), `backend/src/meta.js` (`baseMeta`).
- **Edit:** Add a versioned OpenAPI document for all five routes, schemas, parameters, error codes, attribution, and rate-limit response. Update README and portal examples from the same contract, including the two-filter rule, source timestamp meaning, and keyless usage policy. Add a CI check that requests/examples remain valid against the app. Keep `v1` response fields stable; if a breaking response change is unavoidable, document migration before implementation.
- **Tests:** Add contract tests for representative 200/400/404/429 responses and OpenAPI parse/reference validity. Existing API tests may change only to match the approved contract; data integrity tests are read-only.
- **Don't touch:** Visual redesign or new data levels.
- **Verify:** `node test/routes.test.js`, the OpenAPI validation command added with this task, and `npm run build` under `frontend/` pass.
- **Commit:** `docs: publish validated v1 API contract`.

#### Task 2.3 — Make the Vercel portal discoverable

- [x] **Why:** The current Vite SPA sends an empty `#root` and the same title/description for every URL. Search engines can render JavaScript, but initial crawlability and page-specific metadata are weaker than static HTML.
- **Files/anchors:** `frontend/index.html` (`<div id="root"></div>`), `frontend/src/App.jsx` (`BrowserRouter`), `frontend/src/pages/HomePage.jsx` (`The government`), `frontend/src/pages/DocsPage.jsx` (`API documentation`), `frontend/vite.config.js` (`react()`), `frontend/package.json` (`build`).
- **Edit:** Add the React Router framework build package matching the installed Router 7 version and use its documented `ssr:false` pre-rendering for `/` and `/docs`, keeping interactive `/playground` and `/status` as client routes. Migrate routes/layout without changing copy or behavior except to remove unsupported claims such as “Ministry's weekly data.” Generate distinct title/description/canonical metadata for indexable pages from a deployment `SITE_URL`; generate sitemap and robots files from the same URL; keep preview builds and low-value interactive/status pages out of the production sitemap. Ensure unknown URLs return HTTP 404 on Vercel, rather than a crawlable SPA soft-404. If this migration proves disproportionate, document a tested equivalent static HTML build approach before implementation, with the same output checks.
- **Tests:** Add built-output checks that `/` and `/docs` contain real heading/body HTML before JavaScript, distinct titles/descriptions, canonical URLs, and sitemap entries; a host-level check must show unknown paths return 404. Existing API assertions remain read-only; frontend content changes are limited to factual corrections.
- **Don't touch:** Backend API contract or visual redesign.
- **Verify:** `npm run build` under `frontend/` passes; inspect generated HTML with JavaScript disabled and direct URL loads. Verify production and preview robots/canonicals after Vercel deployment. Use [Google JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) and [React Router pre-rendering docs](https://reactrouter.com/how-to/pre-rendering), checking the installed v7 APIs before coding.
- **Commit:** `feat: prerender discoverable portal pages`.

**Gate:** The documented API contract is tested; home and docs have indexable initial HTML and truthful metadata; direct links, playground interactions, and real 404 behavior still work.

### Phase 3 — Operations and cost control

#### Task 3.1 — Make CI and refresh observable

- [ ] **Why:** A cron definition is not proof that refresh runs, deploys, or warns on stale data.
- **Files/anchors:** `.github/workflows/weekly-ingest.yml` (`Commit only if data actually changed`), `backend/data/meta.json` (`source_date`), `backend/src/index.js` (`Root route = health check`).
- **Edit:** Add push/PR CI for backend tests, frontend build, data integrity, and contract validation. Make the ingest job report chosen source date, counts, checksums, no-op/change/failure, and the exact deployed revision. Keep the scheduled job from pushing on no-op. Add a failure notification path and a freshness check with a threshold derived from observed upstream cadence, not an assumed daily SLA. Separate liveness from readiness/freshness so an upstream delay does not falsely report process failure.
- **Tests:** Add a metadata/freshness test with a fixed clock and workflow validation. Existing route assertions may change only for new health/status responses.
- **Don't touch:** Client authentication or frontend visual design.
- **Verify:** CI passes on a branch; manually trigger one no-op ingest and one controlled changed-snapshot run, capture job URLs and observed output in the Progress Log.
- **Commit:** `ci: validate and observe LGD refresh`.

#### Task 3.2 — Bound anonymous traffic safely

- [ ] **Why:** Keyless access needs predictable limits without one proxy IP consuming everybody's quota.
- **Files/anchors:** `backend/src/index.js` (`trust proxy`, `apiLimiter`, `express.json`), `backend/test/routes.test.js` (`CORS header`).
- **Edit:** Configure proxy trust for the selected host's actual hop count and verify real client IP behavior. Limit request body/URL/query size, set sensible response/cache headers for snapshot data, and document 429/retry behavior. Start with one serving instance and in-memory rate limiting only if the chosen host's topology makes that truthful; use a shared limiter if multiple instances are deployed. Log structured request ID, status, duration, and rate-limit events without personal query data. Record a traffic and monthly-cost budget before public listing.
- **Tests:** Add proxy-forwarded IP, 429 isolation, CORS preflight, oversized input, and cache-header tests. Existing rate-limit assertions may change only for the selected deployment topology.
- **Don't touch:** Source ingestion or expansion to paid services.
- **Verify:** Hosted smoke from two clients shows separate buckets; a small load test stays within the chosen host's free/cost ceiling and has no unexpected 5xx responses.
- **Commit:** `ops: bound and observe anonymous API traffic`.

#### Task 3.3 — Prepare Render and Vercel configuration

- [ ] **Why:** A monorepo needs explicit roots, commands, health checks, SPA fallbacks, and cross-origin API configuration.
- **Files/anchors:** `backend/package.json` (`start`), `frontend/package.json` (`build`), `frontend/src/config.js` (`VITE_API_BASE_URL`), `.github/workflows/weekly-ingest.yml` (`git push`).
- **Edit:** Add reviewable Render config with backend root `backend`, `npm ci`, `npm start`, an application readiness path, and a selected compute plan only after the owner chooses the budget. Add Vercel config under `frontend/` for its static build output and explicit fallback rewrites only for `/playground` and `/status`; leave unknown routes to return 404. Require `VITE_API_BASE_URL` in production and set it to the actual Render HTTPS URL in Vercel project settings, never a source-code hostname. Document separate project import/root settings, environment variables, protected preview behavior, and what causes each service to redeploy. Verify Render's actual proxy headers before finalizing trust settings.
- **Tests:** Validate both config files against the current platform schemas or dry-run tools; add a build-time failure test for absent production API URL. Existing endpoint assertions remain read-only.
- **Don't touch:** Owner accounts, DNS, payment, or public listing during local configuration.
- **Verify:** Local production build passes with a test HTTPS API URL; Vercel artifact routing serves known paths and returns real 404 for unknown paths. Review [Vercel monorepo roots](https://vercel.com/docs/monorepos), [Vite deployment](https://vercel.com/docs/frameworks/frontend/vite), and [Render monorepo roots](https://render.com/docs/monorepo-support) when configuring.
- **Commit:** `deploy: prepare Vercel and Render projects`.

**Gate:** CI, refresh reporting, failure alert, proxy/IP behavior, deployment configuration, and capacity/cost limits have observed evidence.

### Phase 4 — Public release and live validation

#### Task 4.1 — Deploy Render API and Vercel portal

- [ ] **Why:** Current tests prove a local build, not a public service.
- **Files/anchors:** `backend/package.json` (`start`), `frontend/src/config.js` (`VITE_API_BASE_URL`), `DOCS/STATUS.md` (`Deployment`).
- **Edit:** Use the owner's Render and Vercel accounts and chosen budget/plan. Check current free/paid terms, usage caps, HTTPS, sleep behavior, logs, build limits, and deploy support. Import the same repository twice with `backend/` as Render root and `frontend/` as Vercel root; deploy a tested revision to Render first, then set Vercel's production API URL and canonical site URL to the actual HTTPS addresses and deploy the portal. Record both URLs, revisions, and rollback commands. Publish non-affiliation and attribution; do not advertise an uptime SLA the chosen plan cannot meet.
- **Tests:** No test weakening. Add deployment smoke scripts for all routes and error paths.
- **Don't touch:** Published dataset semantics to accommodate hosting.
- **Verify:** From outside localhost, Render HTTPS/CORS/five routes/errors/rate limits/source metadata work; Vercel home/docs HTML, deep links, API examples, sitemap, canonical tags, robots, and unknown-path 404 work. Record exact URLs, revisions, dates, and command output.
- **Commit:** `deploy: configure public LGD API`.

#### Task 4.2 — Prove refresh, rollback, and developer use

- [ ] **Why:** Production grade requires a working recovery path and a real consumer journey.
- **Files/anchors:** `.github/workflows/weekly-ingest.yml` (`workflow_dispatch`), `DOCS/STATUS.md` (`If resuming`), `README.md` (`Quick start`).
- **Edit:** Observe one hosted scheduled or manual refresh through published data, simulate an invalid source and confirm the previous snapshot remains live, exercise rollback, and run README/portal examples as a developer without an API key. Record measured latency, response sizes, 429 behavior, source age, and any host cold-start behavior. Set an owner-visible maintenance and incident procedure. Submit to public API directories only after the owner approves the public listing.
- **Tests:** Keep smoke scripts and failure fixtures as regression evidence; no existing assertions may be weakened.
- **Don't touch:** New data levels or unrelated product features.
- **Verify:** Public URL remains healthy after failed ingest and rollback; a successful refresh changes `meta.source_date` only when source data advances. Update `DOCS/STATUS.md` with observed facts.
- **Commit:** `docs: record live API verification and runbook`.

**Gate:** Owner account/domain/publication choices are needed only for the external deployment and listing. Complete all code, tests, deployment config, and reviewable cost/host choice before requesting that approval. A public listing is optional to the endpoint's completion.

## Failure handling

| Condition | Action |
|---|---|
| Required source header, date, or parent relation changes | Fail ingest; preserve served snapshot; record sample and update parser only after source comparison. |
| Upstream mirror/network unavailable | Keep last good data, report freshness and job failure; retry at the next scheduled/manual run. |
| Tool/version drift | Check installed package versions and current official docs before changing syntax. |
| Test/CI failure | Fix root cause and retry up to three times; record exact output. Do not relax assertions to green the build. |
| Missing code anchor | Inspect current file and `git diff`; revise the task card before editing. |
| Host/account action | Finish local configuration and checks, then request the specific owner action with its cost and publication effect. |

At each phase boundary, run full relevant checks, append one Progress Log entry with real output, and commit that phase's work. A new session resumes from the final `Next:` line. If an executor changes, the plan and repository are the authority, not chat history.

## Decisions

- *(assumed)* Product name for review: **India LGD Index**. It describes the code lookup and avoids implying government ownership. Keep repo/package identifiers until the owner selects a final name; name search is indicative, not trademark clearance.
- *(assumed)* Retain the current four-level, five-endpoint v1 and the portal as developer documentation/playground. The removed duplicate-code probe was a one-off investigation; test fixtures remain necessary.
- *(assumed)* Preserve the current JSON snapshot architecture. A database is unnecessary unless measured query/load behavior changes that conclusion.
- The `generated-adapter-ingestion` recipe is not installed or used here. Its current fetch path expects JSON records, while this source arrives as `.csv.7z` archives. Replacing the LGD pipeline with that recipe would require a separately tested binary-download/CSV extraction adapter; borrow its canary and failure-reporting ideas where useful, but keep the current source-specific ingest for this release.
- The first release uses one Render free instance and explicit public rate limits. The owner acknowledged the free-plan sleep tradeoff; no uptime promise is made. A paid always-on plan requires a deliberate cost review and Blueprint change. Vercel Hobby is used only for the confirmed noncommercial open project. See [Render free limitations](https://render.com/docs/free), [Render pricing](https://render.com/pricing), and [Vercel Hobby terms](https://vercel.com/docs/plans/hobby).
- Vercel hosts the portal and Render hosts the API. Use platform-provided URLs for the first release unless the owner supplies a domain; derive SEO canonical/sitemap values from the chosen production URL at build time.
- The portal keeps its Vite and declarative React Router stack. Build-time Vite SSR renders `/` and `/docs` to static HTML; `/playground` and `/status` use a narrow SPA fallback. This avoids a framework-mode migration while meeting the same HTML, metadata, sitemap, and unknown-path 404 output checks. See [Vite SSR/pre-rendering](https://vite.dev/guide/ssr), [React hydration](https://react.dev/reference/react-dom/client/hydrateRoot), and [Vercel Vite routing](https://vercel.com/docs/frameworks/frontend/vite).
- The owner confirmed this is a noncommercial open project at launch, so Vercel Hobby is an eligible initial plan under its current terms. Render account/compute selection can happen at deployment; no paid plan is hardcoded.
- The government catalog lists LGD Data API entries and monthly resource updates; its help describes API-key generation. The product's value proposition is a keyless, unified, documented contract, not a claim that LGD has no APIs. See `DOCS/RESEARCH/RESEARCH.md`.
- Hosted deployment and public directory submission remain owner-account/publication actions. No production claim until external checks pass.

## Progress Log

*(Append only. Newest at the bottom. Never rewrite an entry; correct with a new entry.)*

### Research and cleanup — 24/09/2026

Done:       Reconstructed local-build status; rechecked source/API/license claims; removed the one-off `backend/scripts/probe-dupes.js` and stale scaffold references; wrote this production plan.
Verified:   `git status --short` before edits: empty; `git log -8 --oneline`: newest `71e9d5a Phase 7: quality gates passed`. `node test/transform.test.js`: 9 pass, 0 fail. `node test/routes.test.js`: 10 pass, 0 fail. Snapshot scan: 36/784/7092/7338 rows, 0 blank names, 0 nonnumeric codes, 0 district-state mismatches, 15 repeated block codes nationally. `npm test` could not spawn child test processes in this Windows sandbox (`spawn EPERM`); direct test-file runs passed.
Surprises:  The data.gov.in LGD catalog now advertises Data API entries; previous “no API exists” wording was wrong. Ingest source-date sorting and timestamp-only writes need repair before relying on the weekly job.
Next:       Begin Task 1.1 with direct source/date/license comparison; then implement Task 1.2 and its failure fixtures before touching HTTP behavior.
Commit:     not committed

### Task 1.1 source audit — 24/09/2026

Done:       Compared `23Sep2026` mirror archives with the committed `19Sep2026` snapshot without overwriting data; recorded all four archive hashes/counts and the one changed subdistrict in research. Corrected independent-project and refresh wording in README and portal copy. Branch `production-readiness` created.
Verified:   GitHub release API returned 983 assets and a coherent four-level `23Sep2026` set. Read-only extract/normalize comparison: 36/784/7092/7338 rows; additions 0, removals 0, one subdistrict change (`4197` Velhe → Rajgad), all other levels unchanged. `node test/transform.test.js`: 9 pass, 0 fail. `npm run build` under `frontend/`: exit 0, 37 modules transformed; Vite warns of one 736.64 kB JS chunk. `git diff --check`: exit 0. Government catalog lists monthly resources, but direct full-row comparison is gated by CAPTCHA/account access and remains unverified.
Surprises:  Local committed data is four days behind mirror asset dates despite unchanged row counts; the only content difference is a name. Sandbox blocks Vite and 7-Zip child processes with `spawn EPERM`; approved host execution completed both checks.
Next:       Begin Task 1.2 with failing tests for date ordering, source schema drift, parent-state mismatch, and no-op ingest behavior; then refresh the committed data through the repaired pipeline.
Commit:     not committed

### Vercel, Render, and SEO steering — 24/09/2026

Done:       Stopped the unintended Opus review at the user's request; revised the live plan for Vercel frontend, Render backend, and crawlable portal pages. Simplified publication to a staged ingest plus one tested Git commit/deploy, rather than a new runtime manifest format.
Verified:   `frontend/index.html` currently has one empty `#root` and one shared title/description; `frontend/src/App.jsx` uses client-side `BrowserRouter`. `frontend/package.json` has React Router 7.18.3 but no framework build package. Official Vercel/Render/Google/React Router docs linked in the plan confirm monorepo roots, Render free sleep, Vercel Hobby limits, and pre-rendering options.
Surprises:  Render explicitly warns that its free web service is unsuitable for production; Vercel Hobby is restricted to personal noncommercial use. Owner budget/use answers are pending.
Next:       Recheck plan consistency, then begin Task 1.1 while the host plan choice is pending.
Commit:     not committed

### Adapter clarification — 24/09/2026

Done:       Checked this project's dependency/script path against `E:/dev-recipes/generated-adapter-ingestion`; recorded why the current plan keeps the LGD-specific pipeline.
Verified:   `backend/package.json` runs `node scripts/ingest.js` and has no adapter dependency. The recipe's `templates/src/fetch.mjs` calls `res.json()`; LGD ingest downloads `.csv.7z` archives and extracts CSV.
Surprises:  The earlier summary did not make this distinction clear.
Next:       Start Task 1.1; revisit adapter integration only as a separate scoped change if the owner wants it.
Commit:     not committed

### Task 1.2 ingestion hardening — 24/09/2026

Done:       Added coherent calendar-date asset selection, source-age and rollback checks, required CSV headers, code/name/parent validation, 5% row-drop guard, archive SHA provenance, and staged no-op snapshot writes. Refreshed the committed dataset candidate to `23Sep2026`; only subdistrict `4197` changed name. A second live ingest left every data file untouched.
Verified:   `node test/ingest.test.js`: 5 pass, 0 fail; `node test/transform.test.js`: 12 pass, 0 fail; `node test/routes.test.js`: 10 pass, 0 fail. The repeated `npm run ingest` printed `Snapshot unchanged; no files rewritten`, with unchanged meta hash. A temp-directory test proved an older source date cannot alter published file bytes.
Surprises:  The Progress Log's prior steering entries are out of chronological order; this appended entry restores the latest actionable state. Production publication is through a tested Git commit and Render deploy; local file replacement is not atomic across all five files.
Next:       Start Task 2.1: reject malformed filters and conflicting district/state pairs, then enforce search bounds.
Commit:     pending Phase 1 commit

### Phase 2 HTTP contract and SEO — 24/09/2026

Done:       Validated all query shapes, required matching state/district pairs, limited search to 100 characters, and fixed truncation semantics. Added the OpenAPI 3.1 document at `/openapi.json` with HTTP contract tests. Built static Home and Docs HTML with distinct metadata, canonical URLs, sitemap and robots rules; restricted SPA fallback to Playground and Status.
Verified:   `node test/routes.test.js`: 13 pass, 0 fail; `node test/search.test.js`: 1 pass, 0 fail; `node test/contract.test.js`: 3 pass, 0 fail. Escalated `npm run build` under `frontend/` with test HTTPS origins: exit 0 for production and preview; `check-build.mjs` verified rendered headings, distinct metadata, two sitemap URLs, narrow rewrites and preview noindex. Built output showed Home 5,502 bytes and Docs 8,659 bytes with `<h1>` and canonical links. `git diff --check`: exit 0.
Surprises:  Vite's SSR module loader evaluated Lucide's CommonJS entry without `require`; forcing Lucide external resolved the build. The initial JS remains ~199 kB gzip, so performance needs a real hosted measurement. Vercel path routing and unknown-path 404 still need live verification.
Next:       Start Phase 3: CI, freshness/traffic monitoring, and reviewable Render/Vercel configuration.
Commit:     pending Phase 2 commit

### Phase 3 local operations and deploy preparation — 24/09/2026

Done:       Added push/PR CI, snapshot integrity and 14-day freshness checks, weekly ingest job summary, request bounds, structured production logs, separate `/healthz` and `/freshness`, rate-limit/CORS/cache tests, a free-plan Render Blueprint, explicit Vercel build/routing config, deployment runbook, and a public smoke script. Removed permanent demo count dashes and a `null` JSON placeholder from Home.
Verified:   `npm test` under `backend/`: 39 pass, 0 fail; `npm run check:snapshot`: zero errors, source `23Sep2026`, counts 36/784/7092/7338, freshness true. `npm run build` under `frontend/` with test HTTPS origins: exit 0; prerender output checks passed. `node scripts/smoke.mjs http://localhost:3000`: API smoke passed. YAML parsing succeeded for `render.yaml` and both workflows; `node --check scripts/smoke.mjs` and `git diff --check` exited 0. A build without `VITE_API_BASE_URL` failed with the intended error.
Surprises:  This checkout has no Git remote, so hosted CI and account deployment cannot be verified locally. The Vite production bundle is about 198 kB gzip and still warns on chunk size. Render proxy hops, Vercel routing, cold start, and rollback require live checks. Local preparation for Tasks 3.1–3.3 is complete; their hosted verification boxes stay open.
Next:       Commit the tested local work, connect the owner's GitHub repository, deploy Render then Vercel, and run public smoke/refresh/rollback checks. Record actual URLs and costs before claiming production readiness.
Commit:     local readiness checkpoint (see Git history)
