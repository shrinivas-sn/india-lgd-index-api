<!-- docs-structure: v1 -->
# STATUS

**Current:** Phases 0–5 complete (19/09/2026). Backend fully built, tested against
live data, and curl-verified. Ingestion runs clean against today's upstream
(19Sep2026 files). Committed through `d0a7ce0` (Phases 0–1); Phases 2–5 commit pending.

- Data ingested live today: 36 states / 784 districts / 7,092 sub-districts /
  7,338 blocks (exactly the counts verified on 05/09/2026), integrity checks
  pass, `meta.json` written with source date 19Sep2026.
- Backend: 5 v1 endpoints + root, CONVENTIONS.md envelopes, CORS, rate limit
  (100/15min/IP), JSON 404 + JSON error handler (Express 5 arity rule).
- Tests: 19/19 passing (`npm test` — 9 transform + 10 route tests, offline).
- Phase 5 curl gate PASSED: root/states/districts/districts?state/subdistricts
  ?district/blocks?district/search all correct; missing filter → 400; unknown
  state/district code → 404; unknown route → JSON 404.
- CI: `.github/workflows/weekly-ingest.yml` ( Mondays 03:00 UTC, actions
  verified-live current majors checkout@v7 / setup-node@v7, p7zip-full safety
  net, commit only on real diffs with row-count changelog message).
- Upstream reality corrections captured in `DOCS/CONTEXT/DECISIONS.md`:
  block codes are NOT nationally unique in LGD (15 dupes in live data —
  uniqueness is per (state, district, code)); `listing_files.csv` only has
  yearly snapshots, so discovery uses the GitHub Releases API.

## Next up (start here)

1. Commit Phases 2–5 (immediately after this status update).
2. Phase 6: frontend portal (React 19.2.8 + Vite 8.2.2 pins in PLAN.md).
3. Phase 7 (optional): Render deploy — only when the user says go.
4. Delete `PLAN.md` once "Done means" (top of that file) is met.
