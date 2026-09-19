<!-- docs-structure: v1 -->
# STATUS

**Current:** Phases 0–6 complete (19/09/2026). Backend fully built, tested against
live data, and curl-verified. Frontend portal built, production build clean, all
five routes serving; Playground round-trips live requests to the local backend.
Committed through `9ad39e8` (Phases 0–5); Phase 6 commit pending.

- Data ingested live today: 36 states / 784 districts / 7,092 sub-districts /
  7,338 blocks (exactly the counts verified on 05/09/2026), integrity checks
  pass, `meta.json` written with source date 19Sep2026.
- Backend: 5 v1 endpoints + root, CONVENTIONS.md envelopes, CORS, rate limit
  (100/15min/IP), JSON 404 + JSON error handler (Express 5 arity rule).
- Tests: 19/19 passing (`npm test` — 9 transform + 10 route tests, offline).
- Phase 5 curl gate PASSED: root/states/districts/districts?state/subdistricts
  ?district/blocks?district/search all correct; missing filter → 400; unknown
  state/district code → 404; unknown route → JSON 404.
- Phase 6 gate PASSED: `npm run build` clean (vite 8.2.2); all routes (/, 
  /playground, /docs, /status + catch-all) serve the SPA shell; Playground
  round-trip verified live against all backend behaviors (200/400/404/search
  grouping); source-level slop scan clean (recipe CLAUDE.md + .claudeignore added).
- CI: `.github/workflows/weekly-ingest.yml` ( Mondays 03:00 UTC, actions
  verified-live current majors checkout@v7 / setup-node@v7, p7zip-full safety
  net, commit only on real diffs with row-count changelog message).
- Upstream reality corrections captured in `DOCS/CONTEXT/DECISIONS.md`:
  block codes are NOT nationally unique in LGD (15 dupes in live data —
  uniqueness is per (state, district, code)); `listing_files.csv` only has
  yearly snapshots, so discovery uses the GitHub Releases API.

## Next up (start here)

1. Commit Phase 6 (immediately after this status update).
2. Phase 7 (optional): Render deploy — only when the user says go.
3. Browser click-through of the portal golden path (run + claude-in-chrome),
   and the 4 quality-gate skills from PLAN.md Phase 7, when scheduled.
4. Delete `PLAN.md` once "Done means" (top of that file) is met.

