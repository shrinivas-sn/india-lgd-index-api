# CLAUDE.md — lgd-admin-hierarchy-api

Anti-slop rules for this repo (apply to every file you touch):

- No comments/docstrings unless asked.
- No defensive code (try/catch, validation) for cases that cannot happen.
- No premature abstraction — 3 similar lines beats a one-use helper.
- Delete dead code fully; no `// removed` markers or commented-out blocks.
- Package versions are pinned exactly; never upgrade from memory.
- Backend responses must use the envelope shapes in `backend/src/validators.js`.
- GODL-India attribution (Ministry of Panchayati Raj — LGD) must appear in the API
  root, `/v1` response meta, and the frontend footer. Never remove those links.
