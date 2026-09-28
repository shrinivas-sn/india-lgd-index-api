<!-- docs-structure: v1 -->
# STATUS

**Repository:** [shrinivas-sn/india-lgd-index-api](https://github.com/shrinivas-sn/india-lgd-index-api).
The public Vercel site and API are live at https://india-lgd-index-api.vercel.app/.
The local rewrite fix for `/freshness` and `/openapi.json` still needs deployment
and a live smoke check. The public API listing is pending.

- Dataset: 36 states / 784 districts / 7,092 sub-districts / 7,338 blocks
  (`23Sep2026` snapshot), integrity-checked, deterministic pipeline.
- Backend: 5 v1 endpoints + root health check, CONVENTIONS.md envelopes, CORS-all,
  rate limit 100/15min/IP with `trust proxy 1` (PaaS-safe), JSON 404 + error handler.
- Tests: all backend test files and snapshot integrity check pass locally for
  the pending route rewrite.
- Frontend: Home / Playground / Docs / Status / 404; Home and Docs now prerender
  real HTML with canonical tags and sitemap. The production bundle checks that
  no local API URL ships. Existing Vercel hierarchy routes were checked live.
- CI: Monday 03:00 UTC ingest is configured but a successful hosted run has not
  been verified for this assessment. A repeated local ingest leaves data bytes
  and `ingested_at` unchanged.
- README: full developer doc (endpoints, error table, data pipeline, local setup,
  GODL attribution) — every number taken from live verified output.
- Quality gates (attempt logs in `DOCS/CONTEXT/DECISIONS.md`): no-ai-slop PASS
  (source level; rendered-pixel check not possible in-session), no-ai-slop-writing PASS,
  production-readiness PASS after fixing one confirmed bug (missing `trust proxy`),
  security-review substituted with a manual pass (skill unavailable) and logged as such.

## Next up (start here)

1. Deploy the root `vercel.json` rewrite change, then run
   `node scripts/smoke.mjs https://india-lgd-index-api.vercel.app https://india-lgd-index-api.vercel.app`.
2. Check the hosted ingest schedule and source freshness. Confirm the
   production `/freshness` and `/openapi.json` responses are JSON.
3. Re-run the current `public-apis` duplication and contribution preflight;
   propose one Government-section README row only if every gate passes.
