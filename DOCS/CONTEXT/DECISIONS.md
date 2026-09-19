# Decisions Log

Every autonomous decision made by `api-idea-scout`'s chained hand-off (design, plan, build)
gets one entry here, appended and committed as it happens — not batched — so the log always
reflects real progress even if the chain is interrupted. This is what the user reviews
afterward as the observer/validator of the result: read this file to see what was decided and
why, not just what was built.

Format per entry: `## <stage> — <short decision title>` then 1-3 sentences of rationale, dated.

## Build (Phase 0) — 11 build decisions locked, copied from PLAN.md

All 11 below were decided in `PLAN.md` (written 05/09/2026) before any code; they are
restated here per that plan's rule ("copy into DECISIONS.md the moment the phase starts").
Execution date: 19/09/2026.

## Build — Scope: 4 levels (states, districts, sub-districts, blocks)
User-approved widening beyond the original 3-level research scope. Blocks are a genuine 4th
LGD administrative level, same ingestion path, ~7k rows, near-zero marginal cost, and no
existing free API serves them either — widens the moat.

## Build — PIN-code lookup stays OUT of scope
Already well-served by `api.postalpincode.in` (see research correction). LGD's own
`pincode_villages`/`pincode_urban` files are not ingested in v1.

## Build — Storage: flat JSON files, git-tracked, loaded into memory at server boot
No database. Total data is ~450KB across 4 files, changes at most weekly, and needs no
indexed range queries — matches calendar-api's flat-JSON pattern, not mandi-api's
Supabase pattern (that exists for daily-changing time-series, which this is not).

## Build — Ingestion cadence: weekly GitHub Actions, commit only on real content change
Upstream publishes daily, but LGD boundary changes are genuinely infrequent — daily commits
would be near-all no-op noise. The workflow diffs newly ingested JSON against what's
committed; identical → skip, different → commit with a changelog-style message.

## Build — 7z extraction: shell out to `7z` in the workflow, not an npm package
`sudo apt-get install -y p7zip-full` as a safety net even though it's normally preinstalled
on `ubuntu-latest` — cheap, removes the dependency on runner-image contents matching docs.

## Build — Express 5.2.1 (current stable), not mandi-api's 4.x
CONVENTIONS.md pins the framework, not a major; this new project uses current stable.
Requires explicit attention to the 4-arg `(err, req, res, next)` error-handler arity rule.

## Build — Deploy target: Render (repo made Render-deployable; deploy itself NOT performed)
Matches CONVENTIONS.md's source-of-truth project. `start` script, `PORT` from
`process.env.PORT`, no hardcoded paths. The actual deploy needs the user's own account.

## Build — Frontend portal sequenced inside this plan, gated after the backend
Phase 6 (portal) cannot start until Phase 5 (backend curl-verified gate) passes.

## Build — Frontend visual identity: light "government gazette / census codebook" system
Deliberately differentiated from both sibling APIs (calendar-api dark mode, mandi-api
earthy-harvest golds). Warm paper background, ink-navy text, single seal-red accent,
serif display headings, monospace for all code, hairline rules and double-rule
borders borrowed from official documents. No dark mode, no gradients, no glow.
Backend-decoupled fetches (`VITE_API_BASE_URL`, default http://localhost:3000) — the
portal is fully usable when the backend is later deployed, and Vite preview serves
all SPA routes because only data endpoints need the backend.

## Build — Frontend package pins verified against installed node_modules
React 19.2.8, react-dom 19.2.8, react-router-dom 7.18.3, vite 8.2.2,
@vitejs/plugin-react 6.1.1, lucide-react 1.41.0 — the versions recorded in PLAN.md
were queried from the npm registry on 05/09/2026 and re-verified as the actually
installed versions on 19/09/2026, not trusted from memory.

## Build — Attribution: GODL-India requires credit with a link back to the source
API root route, `/v1` responses' `meta`, and the frontend footer all credit "Ministry of
Panchayati Raj — Local Government Directory" with links to
`https://lgdirectory.gov.in/` and `https://github.com/ramSeraph/opendata`.

## Build — Rate limit: 100 requests / 15 min / IP
The CONVENTIONS.md default; nothing in this idea's research gives a reason to deviate.

## Build — Block-code uniqueness is scoped to (state, district, block code)

Discovered live on 19/09/2026 during Phase 1: PLAN.md claimed "zero duplicate codes" but the
real LGD source reuses the same Development Block Code for distinct blocks in different
districts (15 such codes in the 19Sep2026 file; e.g. 2494 = two distinct "Gobardhana"
blocks in districts 616 and 280 of state 18, verified row-by-row). The ingestion
validator therefore treats block-code uniqueness as per-district, while states/districts/
sub-districts remain nationally unique (re-verified live today). API consequence: block
lookups disambiguate by parent district, never by block code alone.

## Build — Ingestion file discovery uses the GitHub Releases API, not the listing CSV

Discovered live on 19/09/2026: `listing_files.csv` only lists `lgd-archive-extra1` yearly
snapshots (e.g. `blocks.Apr2026.7z`), not the daily `lgd-latest-extra1` `.csv.7z` files
the plan targeted. Releases-API discovery verified working against today's data.

## Build — Offline unit tests for the ingestion transform (Phase 1 requirement)

`backend/test/transform.test.js` runs the header-mapping/normalization/integrity logic
against fixed fixtures (RFC-4180 quoting, spacing-variant headers, float-artifact codes,
orphan/duplicate/blank-code rejection) — no network, no date dependency. 9/9 passing.

## Build — Response envelope and error format: exactly CONVENTIONS.md's shapes
`success`/`data`/`meta` on success; `success:false`/`error.code`/`error.message` on
failure. Missing required param → 400. Invalid enum-like value → 404 with the list of
valid values — never return unbounded/unfiltered data when a required filter is missing
or wrong.
