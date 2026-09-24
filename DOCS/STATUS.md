<!-- docs-structure: v1 -->
# STATUS

**Current:** Release commit `61f833d` is on the public `main` branch of
[shrinivas-sn/india-lgd-index-api](https://github.com/shrinivas-sn/india-lgd-index-api).
[GitHub CI passed](https://github.com/shrinivas-sn/india-lgd-index-api/actions/runs/35971206712).
Render and Vercel deployment and public API listing have not happened.

- Dataset: 36 states / 784 districts / 7,092 sub-districts / 7,338 blocks
  (`23Sep2026` snapshot), integrity-checked, deterministic pipeline.
- Backend: 5 v1 endpoints + root health check, CONVENTIONS.md envelopes, CORS-all,
  rate limit 100/15min/IP with `trust proxy 1` (PaaS-safe), JSON 404 + error handler.
- Tests: 39/39 (`npm test`, offline) after ingestion and API hardening;
  full curl sweep was green on 19/09/2026 after the trust-proxy fix.
- Frontend: Home / Playground / Docs / Status / 404; Home and Docs now prerender
  real HTML with canonical tags and sitemap. Production and preview builds pass
  locally; Vercel routing remains to be observed after deploy.
- CI: push/PR checks passed on GitHub for `61f833d`; Monday 03:00 UTC ingest
  is configured but has not run on GitHub. A repeated local ingest leaves data
  bytes and `ingested_at` unchanged. Render Blueprint and Vercel config are in Git.
- README: full developer doc (endpoints, error table, data pipeline, local setup,
  GODL attribution) — every number taken from live verified output.
- Quality gates (attempt logs in `DOCS/CONTEXT/DECISIONS.md`): no-ai-slop PASS
  (source level; rendered-pixel check not possible in-session), no-ai-slop-writing PASS,
  production-readiness PASS after fixing one confirmed bug (missing `trust proxy`),
  security-review substituted with a manual pass (skill unavailable) and logged as such.

## If resuming

Read root `PLAN.md` and its last Progress Log entry first. The 24/09/2026
revalidation is in `DOCS/RESEARCH/RESEARCH.md`; it corrects the old “no LGD API”
claim and lists ingestion and request-validation gaps. The one-off
`backend/scripts/probe-dupes.js` was removed; its finding is retained in
`DOCS/CONTEXT/DECISIONS.md` and regression tests.

1. Execute root `PLAN.md` from Phase 3 hosted checks, then import this repository
   into Render and Vercel and validate both using `DOCS/DEPLOYMENT.md`.
2. Owner confirmed noncommercial launch and Vercel Hobby eligibility. Render
   compute choice and account access come after reviewable configuration and tests.
3. Verify hosted cron, source freshness, browser journey, and failure recovery before
   claiming the API is production-ready.
