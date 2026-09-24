import React from 'react';
import JsonViewer from '../components/JsonViewer';
import CodeSnippet from '../components/CodeSnippet';
import { API_BASE_URL } from '../config';

const ERROR_CODES = [
  { code: 'MISSING_PARAM', http: 400, when: 'A required query parameter is absent or empty.' },
  { code: 'INVALID_QUERY_PARAM', http: 400, when: 'An unknown, repeated, empty, or malformed query parameter.' },
  { code: 'FILTER_MISMATCH', http: 400, when: 'The district does not belong to the supplied state.' },
  { code: 'URI_TOO_LONG', http: 414, when: 'The request URL exceeds 2,048 characters.' },
  { code: 'INVALID_STATE_CODE', http: 404, when: 'A ?state value that is not a valid LGD state code.' },
  {
    code: 'INVALID_DISTRICT_CODE',
    http: 404,
    when: 'A ?district value that is not a valid LGD district code.'
  },
  { code: 'ENDPOINT_NOT_FOUND', http: 404, when: 'Any route outside the documented set.' },
  { code: 'TOO_MANY_REQUESTS', http: 429, when: 'More than 100 requests in 15 minutes from one IP.' }
];

export default function DocsPage() {
  return (
    <div className="page">
      <h1>API documentation</h1>
      <p className="lede">
        Five GET endpoints, one JSON envelope shape, no authentication. No API key, CORS open, rate
        limit 100 requests per 15 minutes per IP.
      </p>
      <p>
        <a href={`${API_BASE_URL}/openapi.json`} target="_blank" rel="noreferrer">
          OpenAPI 3.1 JSON contract
        </a>
      </p>

      <h2>Endpoints</h2>
      <table className="endpoint-table">
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Parameters</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span className="code-chip">GET /v1/states</span>
            </td>
            <td>none</td>
            <td>All 36 states and union territories with LGD codes.</td>
          </tr>
          <tr>
            <td>
              <span className="code-chip">GET /v1/districts</span>
            </td>
            <td>
              <span className="code-chip">?state</span> (optional)
            </td>
            <td>Districts of one state, or every district in India if unfiltered.</td>
          </tr>
          <tr>
            <td>
              <span className="code-chip">GET /v1/subdistricts</span>
            </td>
            <td>
              <span className="code-chip">?district</span> or{' '}
              <span className="code-chip">?state</span> (one required)
            </td>
            <td>Sub-districts (tehsils). Omitting both filters returns 400. If both are used, they must agree.</td>
          </tr>
          <tr>
            <td>
              <span className="code-chip">GET /v1/blocks</span>
            </td>
            <td>
              <span className="code-chip">?district</span> or{' '}
              <span className="code-chip">?state</span> (one required)
            </td>
            <td>Development blocks. Omitting both filters returns 400. If both are used, they must agree.</td>
          </tr>
          <tr>
            <td>
              <span className="code-chip">GET /v1/search</span>
            </td>
            <td>
              <span className="code-chip">?q</span> (required)
            </td>
            <td>
              Case-insensitive substring match across all four levels, grouped by level, each row
              carrying its parent chain. Query text is 1–100 characters. Capped at 50 matches per level with a{' '}
              <span className="code-chip">truncated</span> flag.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Envelopes</h2>
      <p>
        Success responses wrap rows in <span className="code-chip">data</span> with a{' '}
        <span className="code-chip">meta</span> object carrying the row count and data freshness:
      </p>
      <JsonViewer
        label="Success envelope · shape"
        data={{
          success: true,
          data: [{ code: '18', name: 'WEST BENGAL' }],
          meta: {
            count: 1,
            source_date: '23Sep2026',
            ingested_at: '2026-09-24T…',
            attribution: { source: 'Ministry of Panchayati Raj — LGD', license: 'GODL-India' }
          }
        }}
      />
      <p>
        Errors are uniform across every failure mode — missing params, unknown codes, unknown
        routes, rate limiting — always with a stable machine-readable{' '}
        <span className="code-chip">error.code</span>:
      </p>
      <JsonViewer
        label="Error envelope · shape"
        data={{ success: false, error: { code: 'MISSING_PARAM', message: '…' } }}
      />

      <h3>Error codes</h3>
      <table className="endpoint-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>HTTP</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {ERROR_CODES.map((e) => (
            <tr key={e.code}>
              <td>
                <span className="code-chip">{e.code}</span>
              </td>
              <td>{e.http}</td>
              <td>{e.when}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Data notes</h2>
      <p>
        Rows preserve normalized LGD names and carry the government LGD
        codes. One upstream quirk to know before you build: block codes are <em>not</em> nationally
        unique — the source data reuses a small number of block codes across different districts —
        so treat <span className="code-chip">(state, district, code)</span> as the block identity.
        State and district codes are nationally unique.
      </p>
      <p>
        An automated refresh is scheduled for Monday 03:00 UTC from the upstream mirror. Check{' '}
        <span className="code-chip">meta.source_date</span> on any response to see which upstream
        edition you are reading.
      </p>

      <h2>Attribution (required)</h2>
      <p>
        This API redistributes Government of India data under the Government Open Data License –
        India (GODL). Any public use must credit the source and link back to it:
      </p>
      <p>
        <a href="https://lgdirectory.gov.in/" target="_blank" rel="noreferrer">
          Ministry of Panchayati Raj — Local Government Directory
        </a>{' '}
        ·{' '}
        <a
          href="https://data.gov.in/government-open-data-license-india"
          target="_blank"
          rel="noreferrer"
        >
          GODL-India license
        </a>{' '}
        ·{' '}
        <a href="https://github.com/ramSeraph/opendata" target="_blank" rel="noreferrer">
          data mirror
        </a>
      </p>

      <h2>Quickstart</h2>
      <CodeSnippet path="/v1/districts?state=18" />
    </div>
  );
}
