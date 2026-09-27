export const LGD_GUIDES = [
  {
    id: "why-india-needs-free-lgd-api",
    title: "Why India Needs an Open LGD API: Navigating Administrative Hierarchies",
    summary: "The architectural structure of India's Local Government Directory (LGD), why public REST access is missing, and how to query states, districts, sub-districts, and blocks keylessly.",
    readTime: "5 min read",
    category: "Architecture & Standards",
    date: "Sep 2026",
    keywords: ["local government directory api india", "lgd code lookup free api", "state district block village api india", "panchayati raj lgd"],
    sections: [
      {
        heading: "PIN Codes vs Administrative Jurisdictions",
        content: "Building software for Indian public health, rural fintech, logistics, or government welfare programs requires an authoritative standard for geographical subdivisions. While postal PIN codes identify mail delivery routes, they do not correspond to administrative jurisdictions. A single PIN code frequently spans two separate revenue talukas or overlaps district borders.\n\nThe legal and administrative source of truth in India is the Local Government Directory (LGD), maintained by the Ministry of Panchayati Raj."
      },
      {
        heading: "The Four Administrative Tiers",
        content: "• States & Union Territories: 36 primary constitutional divisions\n• Districts: 784 revenue collectorate administrative units\n• Sub-districts: 7,092 Tehsils / Talukas / Mandals\n• Development Blocks: 7,338 rural development and planning units under Panchayati Raj"
      },
      {
        heading: "Quick cURL Query Example",
        code: 'curl "https://india-lgd-api.onrender.com/v1/districts?state=32"'
      }
    ]
  },
  {
    id: "census-2011-vs-lgd-codes-mapping",
    title: "Census 2011 Codes vs LGD Codes: Resolving Administrative Boundaries in Indian Data",
    summary: "How historical 2001/2011 Census codes map to active Local Government Directory identifiers across 784 reorganized districts in India.",
    readTime: "6 min read",
    category: "Data Engineering",
    date: "Sep 2026",
    keywords: ["census 2011 code to lgd code mapping api", "convert census village code to lgd", "india administrative boundary codes"],
    sections: [
      {
        heading: "Why 2011 Census Codes Are Outdated",
        content: "Between the 2011 Census and 2026, the administrative landscape of India expanded dramatically:\n\n• Districts grew from 640 in Census 2011 to 784 active revenue districts today.\n• The creation of Telangana (2014) and reorganization of Jammu & Kashmir (2019) altered dozens of district boundaries.\n• State governments reorganized hundreds of sub-districts to reduce travel distances to revenue collectorates."
      },
      {
        heading: "LGD to Census Mapping in API",
        content: "The /v1/states endpoint cross-references LGD codes with both Census 2001 and Census 2011 codes, allowing developers to correlate historical data without building manual translation tables."
      },
      {
        heading: "Code Example: Resolving Legacy Records",
        code: `const res = await fetch('https://india-lgd-api.onrender.com/v1/states');
const { data: states } = await res.json();
const state = states.find(s => s.census_2011_code === '32');
console.log('Resolved LGD Code:', state.code); // 32 (Kerala)`
      }
    ]
  },
  {
    id: "address-normalization-cascading-dropdowns-react",
    title: "Building Cascading Administrative Dropdowns in React with LGD Hierarchies",
    summary: "Implement dependent cascading selectors in React for Indian states, districts, sub-districts, and blocks without shipping heavy static datasets.",
    readTime: "7 min read",
    category: "Frontend & KYC",
    date: "Sep 2026",
    keywords: ["cascade dropdown state district subdistrict village react", "india address verification lgd api", "kyc village address normalization"],
    sections: [
      {
        heading: "Data Hygiene in Rural Onboarding",
        content: "Onboarding users in Indian rural fintech, credit scoring, e-commerce, or agrarian tech requires collecting verified administrative addresses. Allowing users to enter free-form text for sub-districts and tehsils produces severe data hygiene problems including spelling variations and unmapped locations."
      },
      {
        heading: "The Cascading Dependent Selector Pattern",
        content: "Select State (36 items) -> fires /v1/districts?state=:code\nSelect District (~20-30 items) -> fires /v1/subdistricts?district=:code & /v1/blocks?district=:code\nSelect Sub-district / Block -> Complete normalized address record"
      },
      {
        heading: "React Hook Pattern",
        code: `// Fetch districts dynamically when state is selected
useEffect(() => {
  if (!selectedState) return;
  fetch(\`/v1/districts?state=\${selectedState}\`)
    .then(r => r.json())
    .then(json => setDistricts(json.data));
}, [selectedState]);`
      }
    ]
  }
];
