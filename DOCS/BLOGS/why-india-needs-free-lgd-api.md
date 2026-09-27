---
title: "Why India Needs an Open LGD API: Navigating Administrative Hierarchies"
slug: "why-india-needs-free-lgd-api"
meta_description: "The architectural structure of India's Local Government Directory (LGD), why public REST access is missing, and how to query states, districts, sub-districts, and blocks keylessly."
keywords: "local government directory api india, lgd code lookup free api, state district block village api india, ministry of panchayati raj lgd, open government data india"
author: "Open Source Companion Engineering"
published_date: "2026-09-27"
canonical_url: "https://lgd-india.osc.internal/guides/why-india-needs-free-lgd-api"
schema_type: "TechArticle"
---

# Why India Needs an Open LGD API: Navigating Administrative Hierarchies

Building software for Indian public health, rural fintech, logistics, or government welfare programs requires an authoritative standard for geographical subdivisions. While postal PIN codes identify mail delivery routes, they do not correspond to administrative jurisdictions. A single PIN code frequently spans two separate revenue talukas or overlaps district borders.

The legal and administrative source of truth in India is the Local Government Directory (LGD), maintained by the Ministry of Panchayati Raj.

Despite being foundational to national digital public infrastructure, the official portal does not provide an open, keyless REST API for third-party developers. Developers are left with two unappealing options: download and maintain 50MB CSV snapshots or register for restricted government web services.

Here is how the administrative tree is structured and how to consume it through an open REST interface.

## The Administrative Tree Structure

India's administrative structure consists of four primary tiers below the national level:

1. **States & Union Territories (36 entities):** The primary constitutional divisions.
2. **Districts (784 entities):** Revenue and collectorate administrative units.
3. **Sub-districts (7,092 entities):** Variously named Tehsils, Talukas, Mandals, or Sub-Divisions depending on the state revenue code.
4. **Development Blocks (7,338 entities):** Planning and rural administration units managed under Panchayati Raj institutions.

```text
[ National Government ]
          │
  ┌───────┴───────┐
[ 36 States & UTs ]
          │
  ┌───────┴───────┐
[ 784 Districts ]
          │
  ┌───────┴────────────────────────┐
[ 7,092 Sub-districts ]    [ 7,338 Blocks ]
  (Tehsils / Mandals)      (Rural Planning)
```

Each entity carries an immutable, government-assigned integer LGD code. When a district is reorganized or split, old codes are retired and child units receive new parent associations in gazette notifications.

## REST Hierarchy Query Patterns

To prevent returning unbounded tens of thousands of rows over the wire, the REST contract enforces logical query constraints:

| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/v1/states` | None | Returns all 36 States and UTs with LGD and Census codes |
| `GET` | `/v1/districts` | `state` (optional) | Returns 784 districts, or filtered by State LGD code |
| `GET` | `/v1/subdistricts` | `district` or `state` (required) | Returns Tehsils/Mandals under the parent unit |
| `GET` | `/v1/blocks` | `district` or `state` (required) | Returns development blocks under the parent unit |
| `GET` | `/v1/search` | `q` (required, 1–100 chars) | Case-insensitive multi-level administrative search |

Unfiltered queries to `/v1/subdistricts` return `HTTP 400 MISSING_PARAM` because returning 7,000 records in a single payload introduces network overhead and latency.

## Node.js Traversal Example

The following script walks down from a state code to its constituent revenue units:

```javascript
// traverse-hierarchy.js

const API_BASE = "http://localhost:3000";

async function fetchJson(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data;
}

async function inspectDistrictHierarchy(stateCode, districtCode) {
  // 1. Fetch subdistricts (Tehsils)
  const subdistricts = await fetchJson(`/v1/subdistricts?district=${districtCode}`);
  
  // 2. Fetch development blocks
  const blocks = await fetchJson(`/v1/blocks?district=${districtCode}`);

  console.log(`District ${districtCode}:`);
  console.log(`- Sub-districts (Tehsils): ${subdistricts.length}`);
  console.log(`- Development Blocks: ${blocks.length}`);

  return { subdistricts, blocks };
}

// Example: Inspect Wayanad district (LGD Code 555) in Kerala (LGD Code 32)
inspectDistrictHierarchy(32, 555).catch(console.error);
```

## Handling Cross-Level Search

When end-users enter text like "Ramgarh" or "Dharwad", a search endpoint must disambiguate whether the user refers to a district, tehsil, or block.

`GET /v1/search?q=ramgarh` matches names case-insensitively and returns hits grouped by administrative level:

```json
{
  "success": true,
  "data": {
    "districts": [
      { "code": 339, "name": "Ramgarh", "state_code": 20 }
    ],
    "subdistricts": [
      { "code": 1988, "name": "Ramgarh", "district_code": 339, "state_code": 20 },
      { "code": 709, "name": "Ramgarh", "district_code": 113, "state_code": 8 }
    ],
    "blocks": [
      { "code": 1827, "name": "Ramgarh", "district_code": 339, "state_code": 20 }
    ]
  },
  "meta": {
    "count": 4,
    "truncated": { "districts": false, "subdistricts": false, "blocks": false }
  }
}
```
