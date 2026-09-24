# Deployment and operations

This is an independent API for LGD data. The first public release uses a Vercel static portal and one Render free web service. Render's free service sleeps after inactivity, so cold requests can be slow; do not promise always-on uptime. No consumer account or API key is required. The owner confirmed a noncommercial launch for Vercel Hobby.

## Before deployment

1. Use the current `main` commit from [shrinivas-sn/india-lgd-index-api](https://github.com/shrinivas-sn/india-lgd-index-api). Review source attribution before any further public listing.
2. Confirm [GitHub CI](https://github.com/shrinivas-sn/india-lgd-index-api/actions/workflows/ci.yml) passed for that exact commit. Keep `backend/data/` tracked; Render builds and serves the selected revision.
3. Review `render.yaml`. It selects one free Node web service and runs backend tests during its build. A paid plan requires an explicit plan edit and cost review; the API code has no paid dependency.

## Render API

1. In the owner's Render account, create a Blueprint from this GitHub repository using root `render.yaml`. Verify service name, `rootDir: backend`, `plan: free`, `npm ci && npm test && npm run check:snapshot`, `npm start`, `NODE_ENV=production`, and `/healthz` before applying it.
2. Record the assigned `https://…onrender.com` URL and deployed commit. Render supplies `PORT`; no manual port setting is needed. The process uses the committed snapshot and never downloads upstream data at startup.
3. Check `/healthz`, `/freshness`, `/openapi.json`, and all five `/v1` routes. `/healthz` is liveness; `/freshness` reports source age separately. Render's health check points only to `/healthz` so a delayed source cannot restart a healthy process.
4. Keep one instance with the in-memory 100 requests per 15 minutes per IP limiter. Before scaling, move rate-limit state to a shared store and verify Render's forwarded IP chain using two independent clients. The local test covers one proxy hop, but the public edge must be observed.

Render deploys each new commit on the linked branch. Its build command runs tests before starting a replacement service. The weekly ingest workflow runs tests and integrity checks before committing data. A scheduled bot push does not trigger a second GitHub Actions push workflow, so the ingest job and Render build are both required gates.

## Vercel portal

1. Import the same GitHub repository into the owner's Vercel account as a separate project. Set **Root Directory** to `frontend`, framework to Vite, and confirm `frontend/vercel.json` supplies `npm run build` and output `dist`.
2. Before the first Vercel deploy, set `VITE_API_BASE_URL` in the Vercel project's Production environment to the exact Render HTTPS origin (for example, `https://YOUR-API.onrender.com`), without `/v1` or a trailing path. Set it for Preview too if previews should call the API. This public browser URL is not a secret. A production build fails when it is missing or not HTTPS; `localhost` is only a local development fallback. Changing this setting later requires a new Vercel deployment because [Vite embeds it in built JavaScript](https://vite.dev/guide/env-and-mode).
3. `SITE_URL` can be omitted for the host-provided domain because Vercel exposes `VERCEL_PROJECT_PRODUCTION_URL`. If a custom domain is later chosen, set `SITE_URL` to its HTTPS origin and redeploy. Verify that the emitted canonical links and sitemap use the actual production URL.
4. Deploy the same tested commit after the API is reachable. Open Home and Docs and confirm the copyable API examples and OpenAPI link use the Render URL; check Playground and Status in browser network tools for requests to that same origin and no requests to `localhost`. Production builds include prerendered `/` and `/docs`, a two-page sitemap, and robots rules. Preview builds mark pages noindex and omit the sitemap. `/playground` and `/status` use the SPA fallback; unknown paths must return HTTP 404.

## Public verification

Run from a network outside the deployment environment:

```bash
node scripts/smoke.mjs https://YOUR-API.onrender.com https://YOUR-SITE.vercel.app
```

Record the exact URLs, commit hashes, date, smoke output, `/freshness` response, cold-start latency, and any failed checks in `DOCS/STATUS.md` and the live plan. Then open Home, Docs, Playground, and Status in a browser, follow deep links, and check JavaScript-disabled Home and Docs. Verify the `429` response and `Retry-After` header from an isolated test IP without disrupting users.

## Refresh, failure, and rollback

- The Monday 03:00 UTC workflow downloads one coherent dated four-level archive set, verifies checksums and schema/parent/count rules, then commits `backend/data/` only for a real snapshot change. A failed or stale source leaves the previous deployed commit serving. GitHub Actions failure notifications must be enabled for the repository owner; review the job summary after the first manual run.
- If a bad source is published despite the checks, use Render's rollback to the last known good commit and revert the data commit in Git. Re-run backend tests and snapshot checks before resuming auto deploy. Do not edit production JSON by hand.
- If the portal deployment fails, use Vercel's rollback to the last verified deployment and fix the build inputs in Git/project settings. Keep `SITE_URL` and `VITE_API_BASE_URL` aligned with the active public URLs.
- Recheck `/freshness` after every ingest. The current warning threshold is 14 days, based on frequently dated mirror assets and a weekly refresh schedule. An upstream gap is a data freshness incident, not a process health incident.

## Release limits

The local suite, static build, and hosted GitHub CI pass. Render proxy observation, Vercel route response, real cold-start measurement, and live rollback have not happened yet. Avoid claiming production readiness or an uptime guarantee until those checks are recorded. A public API directory listing is a separate owner publication decision.
