import React from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import CodeSnippet from '../components/CodeSnippet';
import StatusBadge from '../components/StatusBadge';

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero">
        <h1>The government&rsquo;s own hierarchy, as one clean JSON API.</h1>
        <p className="lede">
          Every state, district, sub-district and development block in India — with the official
          Local Government Directory codes — served keyless, with CORS enabled, straight from the
          LGD data through an independent community mirror. No signup, no API key, no charge.
        </p>
        <div className="btn-row">
          <Link to="/playground" className="btn btn-primary">
            Try it now
          </Link>
          <Link to="/docs" className="btn">
            Read the docs
          </Link>
        </div>
      </section>

      <StatusBadge />

      <h2>The full hierarchy, one endpoint per level</h2>
      <p className="lede">
        Drill from a state to its districts, from a district to its sub-districts and blocks, or
        search every level at once — results always carry the parent chain, because real place
        names repeat (there is more than one Bilaspur).
      </p>
      <table className="endpoint-table">
        <tbody>
          {[
            { p: '/v1/states', d: 'All 36 states and union territories with LGD codes.' },
            { p: '/v1/districts?state=<code>', d: 'Districts of one state, or all 780+ unfiltered.' },
            {
              p: '/v1/subdistricts?district=<code>',
              d: 'Sub-districts (tehsils) of one district — filter required.'
            },
            {
              p: '/v1/blocks?district=<code>',
              d: 'Development blocks of one district — filter required.'
            },
            { p: '/v1/search?q=<text>', d: 'One search box across all four levels at once.' }
          ].map((row) => (
            <tr key={row.p}>
              <td>
                <span className="code-chip">GET {row.p}</span>
              </td>
              <td>{row.d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Zero to first request</h2>
      <p className="lede">
        Send this request from any HTTP client, or open the Playground to inspect a live response.
      </p>
      <CodeSnippet url={`${API_BASE_URL}/v1/states`} />
    </div>
  );
}
