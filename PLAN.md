# PLAN — LGD India Administrative Hierarchy API

**Written 05/09/2026.** Temporary file — deleted when this closes.

**What this changes:** everything in `E:\lgd-admin-hierarchy-api\` — currently just
`README.md`, `.env.example`, `.gitignore`, `DOCS/`. This plan takes it from empty
scaffold to a deployed-ready, quality-gated, full-stack API + portal.

**Done means:** `backend/` serves `/v1/states`, `/v1/districts`, `/v1/subdistricts`,
`/v1/blocks`, `/v1/search` over real ingested LGD data; `frontend/` portal (Home,
Playground, Docs, Status, 404) is built and can browse it; ingestion is automated via
weekly GitHub Actions; all four quality gates (no-ai-slop, no-ai-slop-writing,
security-review, prod-bug-auditor) pass clean; `curl` proves the running API works
end-to-end. Deploy and public-apis submission are explicitly OUT of scope — those need
the user's own accounts and final go-ahead (see api-idea-scout SKILL.md §5).

**Executor:** this plan is written for a Sonnet 5 session to execute top to bottom.
Every decision that would normally require asking the user has already been made below
(Decisions section) — do not re-litigate them, do not re-ask. Follow
`superpowers:test-driven-development` for the build loop and log progress per phase.

---

## Context already established (do not re-derive)

- **Idea already validated.** `E:\API-PROJECTS\research\lgd-admin-hierarchy.md` — verdict
  `go`. `E:\API-PROJECTS\IDEA-LOG.md` row status is `project-created`.
- **Shared conventions:** `E:\API-PROJECTS\CONVENTIONS.md` — pinned Node+Express backend,
  React+Vite frontend, `/v1` prefix, success/error envelope shapes, keyless + CORS-all +
  rate-limited, root route = health check, standard component names
  (`JsonViewer`/`CodeSnippet`/`StatusBadge`/`CustomSelect`), secrets only in git-ignored
  `.env`. Read this file before writing any backend/frontend code — do not improvise these.
- **Reference implementation:** `E:\mandi-api\` — closest sibling (Node+Express backend,
  React+Vite frontend, GitHub Actions cron ingestion, prerendered SEO pages). Read its
  `backend/src/` and `frontend/src/` structure before scaffolding new files; match its
  patterns, don't copy its domain logic.

## Data verified live today (05/09/2026) — this is real, not assumed

Upstream: `github.com/ramSeraph/opendata`, release tag **`lgd-latest-extra1`**, refreshed
**daily** (confirmed: `states.05Sep2026.csv.7z` exists, published same day). This resolves
the original research's "cadence unconfirmed" flag — daily upstream, we ingest weekly.

Verified by downloading and extracting the actual files today:

| Level | File pattern | Rows (verified) | Header (verified) |
|---|---|---|---|
| States | `states.<DDMonYYYY>.csv.7z` | 36 | `S.No.,State Code,State Version,State Name (In English),State Name (In Local),Census 2001 Code,Census 2011 Code,State or UT` |
| Districts | `districts.<DDMonYYYY>.csv.7z` | 784 | `S.No.,State Code,State Name (In English),District Code,District Name(In English),Census 2001 Code,Census 2011 Code` |
| Sub-districts | `subdistricts.<DDMonYYYY>.csv.7z` | 7,092 | `S.No.,State Code,State Name,District Code,District Name,Sub-district Code,Sub-district Version,Sub-district Name,Census 2001 Code,Census 2011 Code` |
| Blocks | `blocks.<DDMonYYYY>.csv.7z` | 7,338 | `S.No.,State Code,State Name (In English),District Code,District Name (In English),Development Block Code,Development Block Version,Development Block Name (In English),Development Block Name (In Local)` |

**Trap — column names are inconsistent across files.** `districts.csv` has no trailing
space before `(In English)` on `District Name(In English)` but `blocks.csv` does have a
space (`District Name (In English)`); `states.csv` says `State Name (In English)` but
`subdistricts.csv` just says `State Name`. The ingestion parser must map each file's
actual header to a normalized internal schema explicitly — never assume column names
match across files, and never positionally index without also checking the header row.

**Trap — no fixed release tag; date is in the filename.** There is no stable
`latest.csv` URL. The ingestion script must first fetch the manifest CSV at
`https://ramseraph.github.io/opendata/lgd/archives/listing_files.csv` (or query the GitHub
Releases API for tag `lgd-latest-extra1` and pick the newest `.05Sep2026.` style date per
prefix), not hardcode a URL — the date suffix changes daily.

**Verified referential integrity (own probe, today's data):** all 784 district rows'
State Codes exist in the 36 states; all 7,092 sub-district rows' State Codes and District
Codes exist in their parent tables. Zero orphans. Codes are unique within each level (no
duplicate State/District/Sub-district codes). **Names are NOT unique** — e.g. "Bilaspur"
is a district name in 2 different states, "Ramgarh" is a sub-district name in 8 different
places. `/search` must return multiple matches per name and disambiguate by parent
state/district in the response — never assume a name uniquely resolves.

**License (re-verified on this exact ingestion path today):** the `LICENSE` file in
`ramSeraph/opendata` and in `planemad/india-local-government-directory` is the
**Government Open Data License – India (GODL-India)**, copyright Ministry of Panchayati
Raj — same license the original research found via data.gov.in, now confirmed directly on
the actual GitHub source the ingestion script will pull from. Attribution is required (see
Decisions).

**Format trap:** files are `.7z`, not `.zip` — standard `unzip`/Node's built-in zip
handling cannot open them. `p7zip-full` is preinstalled on GitHub Actions `ubuntu-latest`
runners (confirmed via `actions/runner-images` Ubuntu 24.04 readme) — the ingestion
workflow can shell out to `7z x` directly with no extra npm dependency. Locally on this
Windows machine, 7-Zip is installed at `C:\Program Files\7-Zip\7z.exe` but not on PATH —
document this in the ingestion script's README/comments so a local run doesn't silently
fail with "7z: command not found."

## Versions pinned today (npm registry, verified 05/09/2026 — use these, not memory)

| Package | Version |
|---|---|
| express | 5.2.1 |
| cors | 2.8.6 |
| express-rate-limit | 8.7.0 |
| dotenv | 17.4.2 |
| react | 19.2.8 |
| react-dom | 19.2.8 |
| react-router-dom | 7.18.3 |
| vite | 8.2.2 |
| @vitejs/plugin-react | 6.1.1 |
| lucide-react | 1.41.0 |

**Express 5 trap (this project uses 5, unlike mandi-api's 4):** error handlers are
distinguished from request handlers **only by function arity** — a handler must have
exactly 4 parameters `(err, req, res, next)` to be treated as an error handler; a
2-parameter catch-all at the end of the middleware chain silently never fires on errors
(this exact bug was found live in `calendar-api`, a sibling project, per
`E:\dev-recipes\_knowledge\PROOF-calendar-api.md`). In Express 5, async route handlers
that `throw` or reject are auto-forwarded to `next(err)` — no manual try/catch or
`express-async-handler` wrapper needed for that part, but the terminal error handler
must still exist and have 4 args. The 404 handler and error handler must both return the
project's JSON error envelope, never Express's default HTML error page. Verify this with
a real request in Phase 5, not just by reading the code.

## Directory layout (matches `E:\mandi-api\` shape)

```
E:\lgd-admin-hierarchy-api\
├── backend\
│   ├── src\
│   │   ├── index.js              # Express app, mounts routes, error handler
│   │   ├── db.js                 # loads ingested JSON into memory at boot
│   │   ├── validators.js         # param validation helpers
│   │   └── controllers\
│   │       ├── states.js
│   │       ├── districts.js
│   │       ├── subdistricts.js
│   │       ├── blocks.js
│   │       └── search.js
│   ├── data\                     # ingested JSON lands here (git-tracked, see Decisions)
│   │   ├── states.json
│   │   ├── districts.json
│   │   ├── subdistricts.json
│   │   ├── blocks.json
│   │   └── meta.json             # { source_date, ingested_at, license, attribution_url }
│   ├── scripts\
│   │   └── ingest.js             # fetch manifest -> download .7z -> extract -> normalize -> write JSON
│   ├── test\
│   │   └── *.test.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── frontend\                     # scaffolded in Phase 6, not before
│   ├── src\
│   │   ├── App.jsx
│   │   ├── config.js
│   │   ├── pages\ (HomePage, PlaygroundPage, DocsPage, StatusPage, NotFoundPage)
│   │   └── components\ (JsonViewer, CodeSnippet, StatusBadge, CustomSelect)
│   ├── package.json
│   └── vite.config.js
├── .github\workflows\
│   └── weekly-ingest.yml
├── DOCS\ (existing — CONTEXT/, RESEARCH/)
├── README.md (existing — update status as phases complete)
└── PLAN.md (this file — delete when done means is met)
```

---

## Decisions

*(Per api-idea-scout's decision-logging rule — copy each of these into
`DOCS\CONTEXT\DECISIONS.md` the moment the corresponding phase starts, before
implementing it, not after.)*

1. **Scope: 4 levels — states, districts, sub-districts, blocks.** User-approved widening
   beyond the original 3-level research scope. Blocks are a genuine 4th LGD administrative
   level, same ingestion path, ~7k rows, near-zero marginal cost, and no existing free API
   serves them either — widens the moat.
2. **PIN-code lookup stays OUT of scope**, per original research (already well-served by
   `api.postalpincode.in`). LGD's own `pincode_villages`/`pincode_urban` files are not
   ingested in v1.
3. **Storage: flat JSON files, git-tracked, loaded into memory at server boot.** No
   database. Justification (per CONVENTIONS.md's "justify from data shape" rule): total
   data is ~450KB across 4 files, changes at most weekly, and needs no indexed range
   queries (unlike mandi-api's daily-changing price time-series, which is why mandi-api
   uses Supabase). This matches calendar-api's flat-JSON pattern, not mandi-api's DB
   pattern — correctly, because the data shape is closer to calendar-api's (static
   reference data) than mandi-api's (time-series).
4. **Ingestion cadence: weekly GitHub Actions, commit only on real content change.**
   Upstream publishes daily, but LGD boundary changes are genuinely infrequent — daily
   commits would be near-all no-op noise. The workflow diffs the newly ingested JSON
   against what's committed; if identical, it skips the commit; if different, it commits
   with a changelog-style message (e.g. "ingest: 3 new sub-districts added, source
   05Sep2026").
5. **7z extraction: shell out to `7z` in the GitHub Actions workflow** (via
   `sudo apt-get install -y p7zip-full` as a safety net even though it's normally
   preinstalled — cheap and removes the dependency on runner-image contents matching
   docs exactly), not an npm 7z package. Simplest, zero extra runtime dependency, matches
   what's actually available in CI.
6. **Backend framework version: Express 5.2.1** (current stable, not mandi-api's pinned
   4.21.2). CONVENTIONS.md pins "Express" as the framework, not a specific major — this
   project is new, so it uses current stable rather than matching an older sibling.
   Requires explicit attention to the 4-arg error-handler arity rule (see trap above).
7. **Deploy target: Render**, to match `CONVENTIONS.md`'s stated source-of-truth project
   (mandi-api uses Render). This plan does NOT perform the deploy — it prepares the repo
   to be Render-deployable (a `start` script, `PORT` from `process.env.PORT`, no
   hardcoded paths) and stops. Deploy itself needs the user's own Render account.
8. **Frontend portal is sequenced INSIDE this plan, gated after the backend**, not a
   separate later plan. Phase 6 (portal) cannot start until Phase 5 (backend gate) passes.
9. **Attribution:** GODL-India requires attribution with a URL back to the source. The API
   root route, `/v1` responses' `meta`, and the frontend footer must all credit "Ministry
   of Panchayati Raj — Local Government Directory" with a link to
   `https://lgdirectory.gov.in/` and to the specific ingestion source
   `https://github.com/ramSeraph/opendata`.
10. **Rate limit: 100 requests / 15 min / IP**, the CONVENTIONS.md default — nothing in
    this idea's research gives a specific reason to deviate.
11. **Response envelope and error format: exactly CONVENTIONS.md's shapes.** Not
    reinvented. `success`/`data`/`meta` on success; `success:false`/`error.code`/
    `error.message` on failure. Missing required param → 400. Invalid enum-like value
    (e.g. a state code that doesn't exist) → 404 with the list of valid values, per
    CONVENTIONS.md's explicit rule — never return unbounded/unfiltered data when a
    required filter is missing or wrong.

---

## Phases

### Phase 0 — Scaffold & decisions log
- [ ] Copy Decisions 1–11 above into `DOCS\CONTEXT\DECISIONS.md`, committed, before any
      code is written.
- [ ] Update `IDEA-LOG.md` in `E:\API-PROJECTS\` — Status stays `project-created` until
      Phase 5 gate passes, then advance per api-idea-scout's lifecycle (see Phase 8).
- [ ] Create `backend/`, `.github/workflows/` directories per the layout above.
- [ ] `backend/package.json` with dependencies pinned to the exact versions in the table
      above (not `^` ranges pulled from memory — copy the literal verified numbers).

**Gate:** `DECISIONS.md` committed with all 11 entries before Phase 1 starts.

### Phase 1 — Ingestion script (`backend/scripts/ingest.js`)
- [ ] Fetch `https://ramseraph.github.io/opendata/lgd/archives/listing_files.csv` (or the
      GitHub Releases API for tag `lgd-latest-extra1`) to discover today's actual filenames
      for `states`, `districts`, `subdistricts`, `blocks` — never hardcode a date.
- [ ] Download each `.7z`, extract via `7z e` (document that local Windows runs need
      `C:\Program Files\7-Zip\7z.exe` on PATH or an explicit path override via env var;
      CI installs `p7zip-full`).
- [ ] Parse each CSV with an explicit column-name map per file (see the header
      inconsistency trap above — do not positionally index).
- [ ] Normalize into 4 JSON arrays with a consistent internal shape regardless of each
      source file's raw header quirks, e.g.:
      ```json
      { "code": "28", "name": "Andhra Pradesh", "name_local": "ANDHRA PRADESH",
        "type": "S", "census_2001_code": "28", "census_2011_code": "28" }
      ```
      for states, and analogous normalized shapes for districts (with `state_code`),
      sub-districts (with `state_code`, `district_code`), and blocks (with `state_code`,
      `district_code`).
- [ ] Write `backend/data/{states,districts,subdistricts,blocks}.json` plus
      `backend/data/meta.json` recording `source_date` (the filename date discovered),
      `ingested_at` (ISO timestamp), and the attribution fields from Decision 9.
- [ ] Validate on write: re-run the same integrity checks already proven manually today —
      code uniqueness per level, zero orphaned parent references — and fail loudly
      (non-zero exit) if either check fails, rather than writing corrupt data silently.
- [ ] Write a unit test that runs the normalization/validation logic against a small fixed
      fixture (not live network) so tests don't depend on the internet or on today's date.

**Gate:** running `node backend/scripts/ingest.js` locally produces 4 valid JSON files
whose row counts match what was verified today (36/784/7092/7338, or a documented newer
count if the upstream data changed since this plan was written) and whose referential
integrity check passes with zero orphans.

### Phase 2 — Backend API (Express 5)
- [ ] `backend/src/db.js` — loads the 4 JSON files + meta into memory once at boot;
      exposes lookup/filter functions (by state code, by district code, free-text name
      search across all levels).
- [ ] `backend/src/validators.js` — required-param checks, enum validation against the
      loaded code sets (per CONVENTIONS.md's 400-vs-404 rule).
- [ ] Routes, all under `/v1`:
  - `GET /v1/states` — full list, `meta.count`
  - `GET /v1/districts?state=<code>` — `state` optional filter; unknown code → 404 with
    valid state codes listed
  - `GET /v1/subdistricts?district=<code>` and `?state=<code>` — filterable by either;
    at least one required, or return all with a documented size warning in `meta`
  - `GET /v1/blocks?district=<code>` and `?state=<code>` — same pattern
  - `GET /v1/search?q=<text>` — case-insensitive substring match across
    state/district/subdistrict/block names; response groups matches by level and includes
    each match's full parent chain (state name + code, district name + code) since names
    are not unique (see integrity trap above)
- [ ] Root route (`GET /`) — 200, basic API info, doubles as health check per
      CONVENTIONS.md.
- [ ] `cors()` enabled for all origins, all routes.
- [ ] `express-rate-limit` — 100 req/15min/IP.
- [ ] Terminal 404 handler (no matching route) returning the JSON error envelope, and a
      terminal 4-arg error handler (see Express 5 trap above) — both tested explicitly,
      not just implemented.
- [ ] `backend/.env.example` — `PORT=3000` and nothing else (no real secrets needed since
      ingestion pulls from a fully public GitHub source with no API key).

**Gate:** none blocking — proceed to tests, but do not consider the backend done until
Phase 3's tests pass.

### Phase 3 — Backend tests (TDD per `superpowers:test-driven-development`)
- [ ] Route tests for all 5 endpoints: happy path, missing-required-param → 400,
      invalid-enum-value → 404 with valid-values list, correct envelope shape on both
      success and error.
- [ ] Explicit test: malformed request body / thrown error inside a route handler is
      caught by the terminal error handler and returns the JSON envelope, NOT Express's
      default HTML error page (this is the exact defect class found in calendar-api —
      test for it directly, don't just trust the code).
- [ ] Explicit test: an unmatched route returns the JSON 404 envelope, not HTML.
- [ ] Test: `/v1/search` returns multiple correctly-disambiguated results for a known
      duplicate name (e.g. "Bilaspur", "Ramgarh" — both confirmed duplicated in today's
      real data).
- [ ] Test: CORS header present on a real response; rate-limit headers present.

**Gate:** `npm test` in `backend/` passes 100%, output pasted into the Progress Log below
as evidence — not just claimed.

### Phase 4 — GitHub Actions weekly ingestion (`.github/workflows/weekly-ingest.yml`)
- [ ] Cron trigger: weekly (e.g. `0 3 * * 1` — Monday 3am UTC), plus `workflow_dispatch`
      for manual runs.
- [ ] Steps: checkout, setup-node, `apt-get install -y p7zip-full` (safety net per
      Decision 5), run `ingest.js`, `git diff --quiet backend/data/` to check for real
      changes, commit + push only if changed (per Decision 4), with a commit message
      summarizing the diff (e.g. row-count deltas per file).
- [ ] Never commits secrets; workflow uses only public data, no `secrets.*` needed for
      ingestion itself.

**Gate:** workflow YAML is valid (`actions/checkout`, `actions/setup-node` at current
major versions — verify via a quick registry/marketplace check rather than assuming from
memory) and a manual `workflow_dispatch` test run (documented in Progress Log, run by
whoever has repo access — note if this can't be triggered by the executing session and
must wait for the user) succeeds.

### Phase 5 — Backend verification gate (must pass before frontend starts)
- [ ] Run the backend locally (`run` skill), `curl` every endpoint for real, confirm 200s,
      envelope shapes, CORS header, and the 404/error-handler behavior — paste actual
      output, not a description of expected output.
- [ ] This is the "shippable API" checkpoint from the Portal sequencing decision — the API
      must genuinely work end-to-end here, independent of whether the frontend ever gets
      built in this session.

**Gate:** real `curl` output for all 5 endpoints + root + a deliberate error case, pasted
into the Progress Log. Do not proceed to Phase 6 without this evidence.

### Phase 6 — Frontend portal (React + Vite)
- [ ] Scaffold `frontend/` per CONVENTIONS.md's pinned page set: Home, Playground, Docs,
      Status, 404 — real routes via `react-router-dom`, not a tab switcher.
- [ ] Reuse component names where the equivalent exists: `JsonViewer`, `CodeSnippet`,
      `StatusBadge`, `CustomSelect` (read `E:\mandi-api\frontend\src\components\` for the
      pattern, not the styling — domain content here is states/districts/etc, not
      commodities).
- [ ] Playground page: pick a level (state/district/subdistrict/block), pick filters via
      `CustomSelect`, see live JSON response via `JsonViewer`, see the actual `curl`
      equivalent via `CodeSnippet`.
- [ ] Docs page: documents all 5 endpoints, params, envelope shapes, rate limit,
      attribution requirement (Decision 9) with the required link.
- [ ] Status page: shows `meta.source_date`/`ingested_at` from the backend's `/` or a
      dedicated `/v1/status`-style read of `meta.json`, so users can see data freshness —
      `StatusBadge` component reused here.
- [ ] **Visual identity** must be derived from this specific problem domain (government
      administrative/civic-data reference tool) and differentiated from calendar-api's
      dark-mode system and mandi-api's earthy/harvest palette — invoke `frontend-design`
      or `no-ai-slop` (scratch-build) for this, per api-idea-scout §4a's rule. Do not
      default to either sibling's palette.
- [ ] Footer includes the GODL-India attribution link (Decision 9) on every page.

**Gate:** frontend builds (`npm run build`) with no errors; every page renders and the
Playground round-trips a real request to the local backend.

### Phase 7 — Quality gates (all 4 must pass clean, 2-attempt cap each, per
api-idea-scout §4d)
- [ ] `no-ai-slop` (existing-app workflow) against the finished build.
- [ ] `no-ai-slop-writing` against README/DOCS/portal copy.
- [ ] `security-review` against the full diff.
- [ ] `prod-bug-auditor` (production-readiness audit).
- [ ] Log each gate's attempt number and result to `DECISIONS.md` before/after running it,
      per the attempt-tracking rule in api-idea-scout SKILL.md. A gate failing twice is a
      fatal blocker — stop, set `IDEA-LOG.md` status to `blocked`, report rather than
      forcing a third attempt.

**Gate:** all 4 gates show a clean pass in the Progress Log, with what (if anything) was
found and fixed on the way there.

### Phase 8 — Final verification & report (no deploy, no submission)
- [ ] Re-verify criterion 5's awesome-list-fit hypothesis against the actual built
      artifact: `curl` the root route for 200, confirm `Access-Control-Allow-Origin`
      present on a real response, confirm zero auth required for any public request —
      per api-idea-scout §4e, this is checked for real here, not assumed from the
      original research.
- [ ] Use the `run` skill (and `claude-in-chrome` if available) to click through the
      portal's golden path in an actual browser — Home → Playground → make a real
      request → Docs → Status.
- [ ] Update `E:\API-PROJECTS\IDEA-LOG.md` Status → `prod-audit-passed`, commit.
- [ ] Report to the user: what was built, every DECISIONS.md entry, what each quality
      gate found and how it was fixed, the Phase 8 verification output, and explicitly
      that deploy (Render) and public-apis submission remain — both need the user's own
      accounts and final go-ahead, per api-idea-scout SKILL.md §5. Also flag that once
      deployed, `prod-site-auditor` (live URL) and `firecrawl-monitor` (watch the LGD
      source for license/availability changes) still need to run.
- [ ] **Delete this PLAN.md** once "Done means" is met — move any still-relevant reasoning
      into `DECISIONS.md` first.

---

## Progress Log

*(Append only. Newest at the bottom. Never rewrite an entry — if it turned out wrong, add
a new one saying so.)*

### Phase 0 — 05/09/2026
Done:       Research re-verified live (all 4 LGD data files downloaded and inspected
            today, license confirmed on the exact GitHub ingestion path, npm package
            versions pinned from the registry, GitHub Actions ubuntu-latest confirmed to
            preinstall p7zip-full). User answered scope/host/sequencing/cadence
            questions. This PLAN.md written.
Verified:   `curl` + `7z e` extraction of states/districts/subdistricts/blocks .7z files
            in the session scratchpad — 36/784/7092/7338 rows respectively, header
            columns inspected directly, zero orphaned foreign keys, zero duplicate codes,
            confirmed duplicate names exist (Bilaspur x2, Ramgarh x8). npm registry
            queried directly for all 10 frontend/backend package versions.
Surprises:  Column header names are inconsistent across the 4 CSV files (spacing and
            wording differ file-to-file) — this would have silently broken a naive
            positional-index parser. The upstream feed publishes DAILY, not
            weekly/monthly as the original research guessed — cadence is now evidenced,
            not assumed. planemad's older GitHub mirror (2022 dump) is stale; the correct
            ingestion source is ramSeraph/opendata's `lgd-latest-extra1` release tag,
            not the originally-found planemad repo.
### Phase 0 — 19/09/2026
Done:       11 build decisions copied from PLAN.md into DOCS/CONTEXT/DECISIONS.md
            (committed) before any code. backend/ scaffold created: package.json with
            exact pinned versions (express 5.2.1, cors 2.8.6, express-rate-limit 8.7.0,
            dotenv 17.4.2), .env.example (PORT only), .gitignore, npm install verified.
Next:       Phase 1 ingestion.

### Phase 1 — 19/09/2026
Done:       backend/scripts/ingest.js + transform.js written and run for real against
            today's upstream (19Sep2026 files): 36 states / 784 districts / 7,092
            sub-districts / 7,338 blocks — exactly the counts verified on 05/09/2026.
            meta.json written. Phase 1 gate PASSED (exit 0, integrity clean).
Verified:   `node scripts/ingest.js` exit 0, integrity check passed; `npm test` = 9/9.
Surprises:  1) PLAN.md's "zero duplicate codes" claim is WRONG for blocks: the live LGD
            source itself reuses the same Development Block Code for distinct blocks in
            different districts (15 block codes duplicated nationally in 19Sep2026 data,
            e.g. code 2494 = two distinct "Gobardhana" blocks in districts 616 and 280 of
            state 18, verified row-by-row via probe-dupes.js). Validator adjusted: block
            uniqueness scoped to (state, district, block code); states/districts/
            sub-districts remain nationally unique (re-verified live today). 2) The
            archives listing_files.csv only contains lgd-archive-extra1 yearly snapshots
            (e.g. blocks.Apr2026.7z), NOT the daily lgd-latest-extra1 .csv.7z files —
            ingestion primary discovery is therefore the GitHub Releases API (works, used
            today), listing CSV demoted to documentation. 3) Parse fixture caught my own
            test-input error (unquoted escaped-quote field) — fixed in the test, parser
            is RFC-4180-correct.
Next:       Phase 2 API code (done in-session, awaiting Phase 3 tests), Phase 4 workflow,
            Phase 5 curl gate.
Commit:     d0a7ce0

### Phases 2–5 — 19/09/2026
Done:       Full API: db.js loader, meta.js attribution, envelope validators.js,
            4 controllers, index.js (CORS, 100/15min/IP rate limit, JSON 404,
            Express 5 4-arg error handler honoring upstream status). Weekly
            workflow .github/workflows/weekly-ingest.yml (Mondays 03:00 UTC,
            actions/checkout@v7 + setup-node@v7 — majors verified live per the
            "verify, don't assume" rule, p7zip-full safety net, tests re-run in
            CI before commit, commit only on real diffs with row-count changelog).
Verified:   npm test = 19/19 (9 transform + 10 route incl. malformed-JSON body
            -> JSON 400 envelope). Phase 5 curl gate PASSED: root/states/
            districts?state/subdistricts?district/blocks?district/search = 200
            with correct envelopes; missing filter -> 400 MISSING_PARAM; unknown
            state/district code -> 404 with valid values; unknown route -> JSON
            404 ENDPOINT_NOT_FOUND. search?q=ramgarh returns parent-chained,
            grouped results (duplicate-name trap handled).
Next:       Commit; then Phase 6 (frontend portal) only after user go-ahead, and
            Phase 7 (Render) remains user-gated.
Commit:     this commit.
