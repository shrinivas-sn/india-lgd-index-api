---
title: "Census 2011 Codes vs LGD Codes: Resolving Administrative Boundaries in Indian Data"
slug: "census-2011-vs-lgd-codes-mapping"
meta_description: "How historical 2001/2011 Census codes map to active Local Government Directory identifiers across 784 reorganized districts in India."
keywords: "census 2011 code to lgd code mapping api, convert census village code to lgd, india administrative boundary codes, lgd state code list, pfms lgd code mapping"
author: "Open Source Companion Engineering"
published_date: "2026-09-27"
canonical_url: "https://lgd-india.osc.internal/guides/census-2011-vs-lgd-codes-mapping"
schema_type: "TechArticle"
---

# Census 2011 Codes vs LGD Codes: Resolving Administrative Boundaries in Indian Data

Data scientists, geospatial analysts, and fintech teams working with Indian demographic or government datasets often face a structural collision between two numbering systems:

1. **Census Codes (2001 & 2011):** Static identifiers assigned by the Office of the Registrar General & Census Commissioner of India (RGI) during decennial population surveys.
2. **LGD Codes (Local Government Directory):** Dynamic, persistent identifiers maintained by the Ministry of Panchayati Raj to reflect current administrative realities.

Attempting to join modern administrative records with historical Census tables fails because India's map has shifted considerably since 2011.

## Why 2011 Census Codes Are Outdated

Between the 2011 Census and 2026, the administrative landscape of India expanded dramatically:

- **Districts:** Grew from 640 in Census 2011 to 784 active revenue districts today.
- **State Reorganizations:** The creation of Telangana out of Andhra Pradesh (2014) and the reorganization of Jammu & Kashmir into two Union Territories (2019) altered dozens of district boundaries.
- **Sub-district & Tehsil Splits:** States including Karnataka, Tamil Nadu, and Haryana reorganized hundreds of sub-districts to reduce travel distances to revenue offices.

```text
Census 2011: 640 Districts  ────────> Static snapshot frozen in 2011
                                       (Cannot reflect modern splits)

LGD (Current): 784 Districts ───────> Active government registry
                                       (Carries Census 2001 & 2011 cross-references)
```

Because of these changes, modern national platforms including the Public Financial Management System (PFMS), PM-KISAN, and e-GramSwaraj strictly require LGD codes.

## Cross-Referencing in the API

The `GET /v1/states` endpoint provides direct cross-references between LGD codes and decennial Census codes:

```json
{
  "code": 32,
  "name": "Kerala",
  "census_2001_code": "32",
  "census_2011_code": "32"
},
{
  "code": 36,
  "name": "Telangana",
  "census_2001_code": null,
  "census_2011_code": null
}
```

Notice that Telangana (LGD code 36) has null Census 2001 and 2011 codes because the state was formally bifurcated in 2014, after the completion of the 2011 Census. Applications that rely solely on Census state numbers fail when dealing with Telangana residents.

## Resolving Legacy Census Records to LGD Codes

The following Node.js utility translates legacy Census records into active LGD entity records:

```javascript
// census-resolver.js

class CensusToLgdResolver {
  constructor(apiBase = "http://localhost:3000") {
    this.apiBase = apiBase;
    this.stateMap = new Map();
  }

  async init() {
    const res = await fetch(`${this.apiBase}/v1/states`);
    const json = await res.json();
    if (!json.success) throw new Error("Failed to load states");

    for (const state of json.data) {
      if (state.census_2011_code) {
        this.stateMap.set(String(state.census_2011_code), state);
      }
    }
  }

  resolveStateFromCensus2011(censusCode) {
    const code = String(censusCode).padStart(2, "0");
    return this.stateMap.get(code) || null;
  }
}

module.exports = { CensusToLgdResolver };
```

## Best Practices for Address Databases

1. **Store LGD Codes as Primary Foreign Keys:** Avoid using entity names as keys. Names change spelling between English and regional gazettes (e.g., "Mysore" vs "Mysuru", "Orissa" vs "Odisha").
2. **Never Hardcode District Counts:** Always fetch districts dynamically per state. State governments periodically notify new districts (e.g., Punjab creating Malerkotla or Madhya Pradesh creating Mauganj).
3. **Preserve Legacy Census Columns:** When ingesting historical survey or research data, keep the raw Census code alongside the resolved LGD code to maintain audit traceability.
