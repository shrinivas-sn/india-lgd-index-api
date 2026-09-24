<!-- docs-structure: v1 -->
# STATUS

**Workspace:** `E:\lgd-admin-hierarchy-api` (`production-readiness` tracks public `main`).
**Current:** Release and documentation commit `c6c13e0` is on the public `main` branch of
[shrinivas-sn/india-lgd-index-api](https://github.com/shrinivas-sn/india-lgd-index-api).
[GitHub CI passed](https://github.com/shrinivas-sn/india-lgd-index-api/actions/runs/35971472360).
Render and Vercel deployment and public API listing have not happened.

- Dataset: 36 states / 784 districts / 7,092 sub-districts / 7,338 blocks
  (`23Sep2026` snapshot), integrity-checked, deterministic pipeline.
- Backend: 5 v1 endpoints + root health check, CONVENTIONS.md envelopes, CORS-all,
  rate limit 100/15min/IP with `trust proxy 1` (PaaS-safe), JSON 404 + error handler.
- Tests: 39/39 (`npm test`, offline) after ingestion and API hardening;
  full curl sweep was green on 19/09/2026 after the trust-proxy fix.
- Frontend: Home / Playground / Docs / Status / 404; Home and Docs now prerender
  real HTML with canonical tags and sitemap. The production bundle checks that
  no local API URL ships; Vercel routing remains to be observed after deploy.
- CI: push/PR checks passed on GitHub for `c6c13e0`; Monday 03:00 UTC ingest
  is configured but has not run on GitHub. A repeated local ingest leaves data
  bytes and `ingested_at` unchanged. Render Blueprint and Vercel config are in Git.
- README: full developer doc (endpoints, error table, data pipeline, local setup,
  GODL attribution) — every number taken from live verified output.
- Quality gates (attempt logs in `DOCS/CONTEXT/DECISIONS.md`): no-ai-slop PASS
  (source level; rendered-pixel check not possible in-session), no-ai-slop-writing PASS,
  production-readiness PASS after fixing one confirmed bug (missing `trust proxy`),
  security-review substituted with a manual pass (skill unavailable) and logged as such.

## Next up (start here)

Read root `PLAN.md` and its last Progress Log entry first. The 24/09/2026
revalidation is in `DOCS/RESEARCH/RESEARCH.md`; it corrects the old “no LGD API”
claim and lists ingestion and request-validation gaps. The one-off
`backend/scripts/probe-dupes.js` was removed; its finding is retained in
`DOCS/CONTEXT/DECISIONS.md` and regression tests.

1. When the owner resumes deployment, create the Render free Blueprint from
   `render.yaml` in this repository and supply its HTTPS URL. Hosting account
   access is unavailable in this workspace; the owner chose to do this later.
2. Set Vercel `frontend/` project's `VITE_API_BASE_URL` to that Render origin.
   Redeploy and check that browser requests and copyable examples use Render,
   never localhost. Follow `DOCS/DEPLOYMENT.md` for smoke, SEO, and rollback.
3. Observe hosted cron, source freshness, proxy IP behavior, browser routes,
   cold start, and failure recovery before claiming production readiness.
