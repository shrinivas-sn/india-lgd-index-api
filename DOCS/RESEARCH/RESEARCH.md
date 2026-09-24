# Candidate: LGD (Local Government Directory) India Administrative Hierarchy API

## Revalidation — 24/09/2026

The original duplication finding below is historical and is too absolute today. The [government LGD catalog](https://www.data.gov.in/catalog/local-government-directory-lgd) now labels its states, districts, and sub-districts resources “Data API” and describes a monthly update. The [data.gov.in help page](https://www.data.gov.in/help) says registered users generate API keys to access API URLs. A public LGD API therefore exists; the useful distinction for this project is a documented, keyless, cross-level API with a stable developer contract. The catalog does not list development blocks among its seven resources. Whether each linked API currently returns usable records still needs a direct request with a registered key; no key was available in this review.

The [Ministry LGD page](https://panchayat.gov.in/en/lgd/) confirms the directory and LGD codes are government-maintained. The [government catalog](https://www.data.gov.in/catalog/local-government-directory-lgd) names the Ministry as contributor. [GODL-India](https://www.data.gov.in/Godl) permits reuse with source/license attribution and non-endorsement; the README and API must avoid suggesting this independent project is official. This is a research assessment, not a legal opinion.

The local `19Sep2026` snapshot contains 36 states/UTs, 784 districts, 7,092 sub-districts, and 7,338 blocks. On 24/09/2026, all codes were numeric strings, no names were blank, all sub-district/block district codes existed, and their state codes matched the district's state. Fifteen block codes repeat nationally; the codebase correctly scopes their uniqueness to `(state,district,code)`. These checks establish internal consistency of this snapshot, not agreement with the latest official source.

Current validation gaps found in code: `validateIntegrity` checks parent existence but not parent-state agreement, blank names, unexpected schema/header changes, source-date age, or anomalous row-count drops. `discoverFiles` sorts `DDMonYYYY` filenames as text, which does not choose the newest file across months or years. The ingestion script rewrites `meta.ingested_at` on every run, so the scheduled workflow may commit a timestamp-only diff while claiming a data change. The API silently gives `district` priority when `district` and an unrelated `state` are both supplied. Search truncation can be marked true on exactly 50 matches even when no further match exists. These are production-plan items, not fixes completed in this session.

The project uses [ramSeraph/opendata's LGD release](https://github.com/ramSeraph/opendata/releases/tag/lgd-latest-extra1) as an intermediary. Its refresh timing and the GitHub Actions cron must be verified from real runs before promising an update SLA. The existing research claim that no API exists, and its inferred update cadence, should not be reused in public copy.

### Source comparison observed 24/09/2026

The [mirror release API](https://api.github.com/repos/ramSeraph/opendata/releases/tags/lgd-latest-extra1) returned 983 assets, including a coherent `23Sep2026` set for all four levels. A read-only download/extract/normalize comparison with committed `19Sep2026` data found:

| Level | Archive SHA-256 | Rows | Added | Removed | Changed |
|---|---|---:|---:|---:|---:|
| states | `2a5945176f1b267bc3cef30d22600173fb42ee7a1a9a09a8e2acde799bffca6d` | 36 | 0 | 0 | 0 |
| districts | `999821622c409d9005fd14ab8ab1632eef63b181160276b76b1d0edd94117149` | 784 | 0 | 0 | 0 |
| subdistricts | `93e0a1e1f9f618d26c964e56e6ae3157fdc96f1116213d5ed52b65ad1f5f6664` | 7,092 | 0 | 0 | 1 |
| blocks | `33077ce2f7ad101b71630ccf80bace82e797cf068369feab066ad4a04bb1305b` | 7,338 | 0 | 0 | 0 |

The changed row is sub-district code `4197`, state `27`, district `490`: `Velhe` → `Rajgad`. The archives were extracted in a temporary directory and the committed dataset was not modified. The [government catalog](https://www.data.gov.in/catalog/local-government-directory-lgd) advertises monthly resources, while the [LGD directory download page](https://lgdirectory.gov.in/demo/downloadDirectory.do) presents a CAPTCHA. The catalog's API workflow requires registration/API-key generation according to [data.gov.in help](https://www.data.gov.in/help). This review therefore confirms the mirror's current assets and the local difference, but does not independently compare every row with a direct Ministry export. Continue to label the mirror as an intermediary and keep this limit visible in provenance.

Date: 2026-08-09 (revised 2026-08-09 — see "Correction" below)
Researched by: api-idea-scout (discovery mode)

## Correction (post-hoc, prompted by user challenge)

The original version of this write-up scoped in a `/pincode/{code}` endpoint and marked
duplication-check criterion 2 a clean pass. That was wrong: `api.postalpincode.in` is a
free, keyless, long-standing Indian PIN-code lookup API (`GET /pincode/{code}` and
`GET /postoffice/{name}` → post office details, JSON, no signup, ~1000 req/hr) that already
covers PIN-code ↔ post-office lookup well. It didn't surface in the original search because the
duplication check only checked public-apis.io/README + generic search, not a targeted
"does a well-known free API already exist for this specific sub-capability" pass. See the
`api-idea-scout` skill's revised research-process step 3 for the fix.

This does **not** flip the verdict to no-go — it narrows the scope. `postalpincode.in` covers
PIN-code lookup; it does **not** cover the official LGD administrative hierarchy (states →
districts → sub-districts with government-assigned LGD codes, distinct from postal geography).
That gap is still real and still unclaimed. v1 scope below is revised to drop the redundant PIN
endpoint and lead with the hierarchy/codes angle instead.

## Idea

A keyless REST API serving India's official administrative hierarchy — States → Districts →
Sub-Districts (Tehsils/Talukas) — with their LGD codes, sourced from the Ministry of Panchayati
Raj's Local Government Directory. This is infrastructure-grade reference data: anything
building India-aware forms, logistics, or civic-tech tools needs a canonical district/
sub-district list with stable government codes (LGD codes are not the same as postal PIN
codes), and today that means either scraping lgdirectory.gov.in yourself or downloading a CSV
dump. Distinct in scope from `calendar-api` (holidays), `mandi-api` (market prices), and from
existing pincode-lookup APIs (postal geography, not administrative-code geography).

## Data source

The Local Government Directory (LGD), https://lgdirectory.gov.in, run jointly by the Ministry of
Panchayati Raj (MoPR) and the Office of the Registrar General of India (ORGI, Ministry of Home
Affairs). Adoption of LGD codes as the standard location code in e-governance systems was
mandated by Cabinet Secretariat notification on 4 November 2016 — this is the closest thing India
has to an authoritative FIPS/ISO-3166-2 equivalent for sub-national units.

Also catalogued on the Open Government Data Platform (data.gov.in):
- https://www.data.gov.in/catalog/local-government-directory-lgd
- https://www.data.gov.in/resource/local-government-directory-lgd-states
- https://www.data.gov.in/resource/local-government-directory-lgd-districts
- https://www.data.gov.in/resource/local-government-directory-lgd-sub-districts
- https://www.data.gov.in/resource/local-government-directory-lgd-local-bodies-pin-codes
- https://www.data.gov.in/resource/local-government-directory-lgd-villages-pin-codes

Bulk CSV mirrors already exist as evidence the raw data is accessible:
- https://github.com/planemad/india-local-government-directory
- https://ramseraph.github.io/opendata/lgd/ (full CSV dump, documented anatomy at
  https://ramseraph.github.io/opendata/lgd/anatomy/)

A registered web-service layer also exists via NAPIX (National API Exchange,
https://dev.napix.gov.in/nic/lgd/), the government's own API gateway — this is the analogue of
how `mandi-api` consumes data.gov.in resources server-side with a private API key, then serves a
public keyless layer on top.

## License findings

data.gov.in's own Terms of Use / Government Open Data License page
(https://www.data.gov.in/terms-of-use, https://www.data.gov.in/Godl) states, per NDSAP (National
Data Sharing and Accessibility Policy, gazette-notified 13 February 2017):

> "All users are provided a worldwide, royalty-free, non-exclusive license to use, adapt,
> publish (either in original, or in adapted and/or derivative forms), translate, display, add
> value, and create derivative works (including products and services), for all lawful commercial
> and non-commercial purposes, and for the duration of existence of such rights over the data."

Attribution is required (acknowledge provider/source/license, ideally with a URL/URI back to the
dataset). Exemptions cover personal data, sensitive data, and official symbols/marks — none of
which apply to administrative boundary codes.

A follow-up search confirmed this explicitly extends to LGD's data.gov.in catalog entries: "All
datasets/resources including metadata published on the Open Government Data portal (data.gov.in)
are licensed under the Government Open Data License - India."

I could not load `lgdirectory.gov.in/copyrightPolicy.do` directly (404 on the exact URL I guessed
for the copyright policy sub-page) to double-check the LGD portal's own copyright page text, so
the license basis here rests on the data.gov.in/GODL catalog entry rather than lgdirectory.gov.in's
own policy page. This is a reasonably strong confirmation (explicit government open license, named
and gazetted) but not a 100%-independent second source — noting this as a caveat rather than
marking the whole criterion unconfirmed, since GODL's application to data.gov.in-catalogued
government datasets generally is well documented in multiple independent sources (Wikipedia's
`Template:GODL-India`, data.gov.in's own Godl page).

## Duplication check

**PIN-code lookup (dropped from v1 scope):** `api.postalpincode.in` already provides free,
keyless, no-signup PIN-code ↔ post-office lookup (`/pincode/{code}`, `/postoffice/{name}`),
~1000 req/hr, JSON. Several other free/open projects also cover this same narrow niche
(`aniket-thapa/india-pincode-api` — static JSON via GitHub Pages, no server; multiple other
GitHub repos). This sub-capability is well-served. Not included in v1.

**Administrative hierarchy with LGD codes (kept in scope):** no existing free hosted REST API
was found that serves the official LGD states/districts/sub-districts hierarchy itself on
demand. What exists:
- Raw CSV dumps / GitHub mirrors (not a live API)
- A "Map2LGD" mapping *tool* for manually assigning LGD codes (not a lookup API)
- NAPIX web services, which require government registration — not public/keyless
- A public discussion thread (datameet Google Group, "APIs for States, Districts, ... Panchayats")
  where the consensus was LGD provides "no APIs, just plain csv files" and that "someone could
  build an API around the data" — i.e., practitioners in this space have flagged the same gap.
- data.gov.in's own per-resource API note for the district resource: API access "does not exist,
  submit a request for it."
- The pincode-lookup APIs above return postal geography (post office, district name as a
  string), not the official LGD hierarchy with government-assigned codes — different data
  model, not a substitute.

This narrower scope is a genuine gap, not a saturated space like AISHE colleges or ISRO launches
(see the other candidates researched in this batch).

## Update cadence

Administrative reorganizations (new panchayats, boundary changes, rural-to-urban conversions) are
infrequent and government-paced — LGD exists specifically to let states push updates as they
happen, not continuously. A weekly (or even monthly) ingestion cron is more than sufficient; no
real-time requirement. I could not find a published "last updated" cadence figure for the
directory as a whole, so I'm basing this on the nature of administrative-boundary data generally,
not a confirmed SLA.

## Scope sketch

v1 should **not** attempt the full village-level directory (600,000+ villages) — that's larger
than both calendar-api and mandi-api and would blow the "buildable v1" bar. A right-sized v1:

- `/states` — ~36 states/UTs with LGD codes
- `/districts` — ~800 districts, filterable by state
- `/subdistricts` — ~7,000 sub-districts (tehsils/talukas/blocks), filterable by district
- `/search?q=` — free-text lookup by name

That's 4 endpoints on flat/cached JSON, ingested from CSV dumps or NAPIX on a cron — directly
comparable to calendar-api's shape. PIN-code lookup is deliberately excluded (already
well-served — see duplication check); village-level data is a clearly-flagged v2/stretch scope,
not part of v1.

## Scorecard

| # | Criterion | Result |
|---|---|---|
| 1 | Data source exists & is legally redistributable | **pass** — GODL-India explicitly permits redistribution/derivative works with attribution, confirmed via data.gov.in's own Terms of Use and Godl pages |
| 2 | Not already well-served | **pass** (corrected) — the LGD hierarchy/codes themselves have no existing free hosted API (only raw CSV mirrors and a registration-gated government web service). PIN-code lookup is already well-served by `api.postalpincode.in` and others — dropped from v1 scope, not counted against this criterion |
| 3 | Sane update cadence | **unconfirmed** (corrected 2026-08-09, tightened rule) — no published cadence figure found; the "infrequent, government-paced" claim is inferred from the nature of administrative-boundary data generally, not an evidenced SLA. Doesn't block `go` (criteria 1/2/5 govern verdict) but the ingestion schedule should be re-verified during build rather than assumed weekly/monthly |
| 4 | Buildable v1 scope | **pass**, conditional on scoping v1 to states/districts/sub-districts and deferring full village-level data to v2 |
| 5 | Awesome-list submission fit | **pass** — flat/cached JSON on a cron, no reason it couldn't be keyless, CORS-enabled, HTTPS, no-auth like calendar-api |

## Verdict: go

Strongest candidate in this batch. Real government mandate behind the data, an explicit open
license, a confirmed gap for the administrative-hierarchy angle specifically (PIN-lookup is
correctly excluded as already well-served), and a scope that's buildable if v1 is deliberately
capped below village level.
