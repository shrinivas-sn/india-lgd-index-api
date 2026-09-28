<!-- docs-structure: v1 -->
# STATUS

**Repository:** [shrinivas-sn/india-lgd-index-api](https://github.com/shrinivas-sn/india-lgd-index-api).
The public Vercel site and API are live at https://india-lgd-index-api.vercel.app/.
The `/freshness` and `/openapi.json` rewrites are deployed and return JSON.
The API smoke check passes. The public API listing is pending.

- Dataset: 36 states / 784 districts / 7,092 sub-districts / 7,338 blocks
  (`23Sep2026` snapshot), integrity-checked, deterministic pipeline.
- Backend: 5 v1 endpoints + root health check, CONVENTIONS.md envelopes, CORS-all,
  rate limit 100/15min/IP with `trust proxy 1` (PaaS-safe), JSON 404 + error handler.
- Tests: 40 backend tests and local snapshot integrity checks pass; live API
  smoke checks pass against the production Vercel origin.
- Frontend: Home / Playground / Docs / Status / 404; Home and Docs now prerender
  real HTML with canonical tags and sitemap. The production bundle checks that
  no local API URL ships. Unknown portal URLs currently return the homepage
  with HTTP 200, so the full portal smoke check is still open.
- CI: Monday 03:00 UTC ingest completed successfully on 28 September 2026.
  A repeated local ingest leaves data bytes and `ingested_at` unchanged.
- README: full developer doc (endpoints, error table, data pipeline, local setup,
  GODL attribution) — every number taken from live verified output.
- Quality gates (attempt logs in `DOCS/CONTEXT/DECISIONS.md`): no-ai-slop PASS
  (source level; rendered-pixel check not possible in-session), no-ai-slop-writing PASS,
  production-readiness PASS after fixing one confirmed bug (missing `trust proxy`),
  security-review substituted with a manual pass (skill unavailable) and logged as such.

## Next up (start here)

1. Correct the portal's unknown-path HTTP status and rerun the full site smoke
   check. The API-only smoke check already passes.
2. Re-run the current `public-apis` duplication and contribution preflight;
   propose one Government-section README row only if every gate passes.
