---
title: "Building Cascading Administrative Dropdowns in React with LGD Hierarchies"
slug: "address-normalization-cascading-dropdowns-react"
meta_description: "Implement dependent cascading selectors in React for Indian states, districts, sub-districts, and blocks without shipping heavy static datasets."
keywords: "cascade dropdown state district subdistrict village react, india address verification lgd api, kyc village address normalization, dependent select react india address"
author: "Open Source Companion Engineering"
published_date: "2026-09-27"
canonical_url: "https://lgd-india.osc.internal/guides/address-normalization-cascading-dropdowns-react"
schema_type: "TechArticle"
---

# Building Cascading Administrative Dropdowns in React with LGD Hierarchies

Onboarding users in Indian rural fintech, credit scoring, e-commerce, or agrarian tech requires collecting verified administrative addresses. Allowing users to enter free-form text for sub-districts and tehsils produces severe data hygiene problems:

- Regional phonetic spelling variations (e.g., "Kalyan", "Kalyana", "Kallyan").
- Outdated district names following state bifurcations.
- Ambiguous sub-districts that exist across multiple states under the same name.

Shipping a static JSON file containing all 7,000 sub-districts and 7,300 blocks adds over 8MB of uncompressed payload to your client JavaScript bundle.

The standard pattern is to lazy-load hierarchical tiers from a lightweight REST API as the user selects parent entities.

## The Cascading Dependent State Pattern

The selection lifecycle flows strictly top-down:

```text
Select State (36 items)
       │
       ▼ (fires /v1/districts?state=:code)
Select District (~20-30 items)
       │
       ▼ (fires /v1/subdistricts?district=:code & /v1/blocks?district=:code)
Select Sub-district (Tehsil) / Block
```

When a user changes an upstream selection (e.g., switching State from Maharashtra to Karnataka), the application must reset all downstream states (District, Tehsil, Block) to prevent submitting impossible entity combinations.

## React Implementation

Here is a complete, production-ready cascading selector component using React hooks:

```jsx
// CascadingAddressSelector.jsx
import React, { useState, useEffect } from 'react';

const API_BASE = "http://localhost:3000";

export function CascadingAddressSelector({ onAddressChange }) {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subdistricts, setSubdistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);

  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSubdistrict, setSelectedSubdistrict] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');

  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // 1. Initial load of 36 States and UTs
  useEffect(() => {
    fetch(`${API_BASE}/v1/states`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStates(json.data);
      })
      .catch((err) => console.error("Failed to load states:", err));
  }, []);

  // 2. Fetch districts when state changes
  useEffect(() => {
    if (!selectedState) {
      setDistricts([]);
      setSelectedDistrict('');
      return;
    }

    setLoadingDistricts(true);
    fetch(`${API_BASE}/v1/districts?state=${selectedState}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setDistricts(json.data);
          setSelectedDistrict('');
          setSubdistricts([]);
          setSelectedSubdistrict('');
          setBlocks([]);
          setSelectedBlock('');
        }
      })
      .finally(() => setLoadingDistricts(false));
  }, [selectedState]);

  // 3. Fetch subdistricts & blocks when district changes
  useEffect(() => {
    if (!selectedDistrict) {
      setSubdistricts([]);
      setBlocks([]);
      setSelectedSubdistrict('');
      setSelectedBlock('');
      return;
    }

    setLoadingUnits(true);
    Promise.all([
      fetch(`${API_BASE}/v1/subdistricts?district=${selectedDistrict}`).then((r) => r.json()),
      fetch(`${API_BASE}/v1/blocks?district=${selectedDistrict}`).then((r) => r.json()),
    ])
      .then(([subRes, blockRes]) => {
        if (subRes.success) setSubdistricts(subRes.data);
        if (blockRes.success) setBlocks(blockRes.data);
        setSelectedSubdistrict('');
        setSelectedBlock('');
      })
      .finally(() => setLoadingUnits(false));
  }, [selectedDistrict]);

  // 4. Emit normalized payload whenever complete
  useEffect(() => {
    if (selectedState && selectedDistrict) {
      onAddressChange({
        stateCode: Number(selectedState),
        districtCode: Number(selectedDistrict),
        subdistrictCode: selectedSubdistrict ? Number(selectedSubdistrict) : null,
        blockCode: selectedBlock ? Number(selectedBlock) : null,
      });
    }
  }, [selectedState, selectedDistrict, selectedSubdistrict, selectedBlock]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
      {/* State Selector */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#475569' }}>
          State / UT *
        </label>
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
        >
          <option value="">Select State</option>
          {states.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* District Selector */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#475569' }}>
          District * {loadingDistricts && '(Loading...)'}
        </label>
        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          disabled={!selectedState || loadingDistricts}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
        >
          <option value="">Select District</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Sub-district / Tehsil Selector */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#475569' }}>
          Sub-district / Tehsil {loadingUnits && '(Loading...)'}
        </label>
        <select
          value={selectedSubdistrict}
          onChange={(e) => setSelectedSubdistrict(e.target.value)}
          disabled={!selectedDistrict || loadingUnits}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
        >
          <option value="">Select Sub-district</option>
          {subdistricts.map((sub) => (
            <option key={sub.code} value={sub.code}>{sub.name}</option>
          ))}
        </select>
      </div>

      {/* Block Selector */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#475569' }}>
          Development Block
        </label>
        <select
          value={selectedBlock}
          onChange={(e) => setSelectedBlock(e.target.value)}
          disabled={!selectedDistrict || loadingUnits}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
        >
          <option value="">Select Block</option>
          {blocks.map((b) => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

## Advantages of the Pattern

1. **Zero Client Bundle Bloat:** Users only download the exact districts and tehsils they view, saving bandwidth for rural mobile connections.
2. **Deterministic Foreign Keys:** The database receives unambiguous LGD integer codes rather than misspellings of regional revenue offices.
3. **Automatic Upstream Invalidation:** Changing the selected state automatically clears stale child selections.
