<!-- docs-structure: v1 -->
# STATUS

**Current:** Idea validated (`go`), research re-verified live 05/09/2026, full
build plan written to `PLAN.md` (repo root) — not yet started.

- Data confirmed live: 36 states / 784 districts / 7,092 sub-districts / 7,338
  blocks, ingested from `github.com/ramSeraph/opendata` (`lgd-latest-extra1`
  tag, daily upstream). License = GODL-India, confirmed on this exact source.
- User decisions locked: 4 levels (incl. blocks), deploy to Render (not yet
  done), backend-gated portal sequencing, weekly ingestion committing only on
  real diffs.
- Package versions pinned from npm registry (Express 5.2.1, React 19.2.8,
  Vite 8.2.2, etc.) — see `PLAN.md`.
- Zero code written yet. `backend/`, `frontend/` don't exist.

## Next up (start here)

1. Open `PLAN.md` at repo root — Phase 0 (scaffold + `DECISIONS.md` entries).
2. Execute phases in order; each has a gate — don't skip gates.
3. Phase 5 (backend curl-verified) must pass before Phase 6 (frontend) starts.
4. Delete `PLAN.md` once "Done means" (top of that file) is met.
