import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import StatusBadge from '../components/StatusBadge';

export default function StatusPage() {
  const [freshness, setFreshness] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/v1/states`)
      .then((r) => r.json())
      .then((json) => {
        if (alive) {
          setFreshness({ source_date: json.meta.source_date, ingested_at: json.meta.ingested_at });
          setFailed(json.success !== true);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const rows = [
    {
      label: 'Upstream edition (source_date)',
      value: freshness ? freshness.source_date : '…'
    },
    {
      label: 'Ingested into this API at',
      value: freshness ? new Date(freshness.ingested_at).toLocaleString() : '…'
    },
    { label: 'Automatic refresh', value: 'Every Monday 03:00 UTC (GitHub Actions)' },
    { label: 'License', value: 'Government Open Data License – India (GODL)' },
    {
      label: 'Data source',
      value: 'Ministry of Panchayati Raj — Local Government Directory',
      href: 'https://lgdirectory.gov.in/'
    },
    {
      label: 'Mirror',
      value: 'github.com/ramSeraph/opendata',
      href: 'https://github.com/ramSeraph/opendata'
    }
  ];

  return (
    <div className="page">
      <h1>Status</h1>
      <p className="lede">
        Live health of the API and the freshness of the dataset behind it. The ingested snapshot is
        replaced wholesale on every successful weekly run; responses always carry their own{' '}
        <span className="code-chip">meta.source_date</span>.
      </p>

      <p>
        <StatusBadge />
      </p>

      {failed && (
        <div className="error-box">
          <span className="code-chip">API unreachable</span> The backend at{' '}
          <span className="code-chip">{API_BASE_URL}</span> did not respond. Start it with{' '}
          <span className="code-chip">npm start</span> in <span className="code-chip">backend/</span>.
        </div>
      )}

      <table className="endpoint-table">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td style={{ width: 280, color: 'var(--ink-soft)' }}>{r.label}</td>
              <td>{r.href ? <a href={r.href}>{r.value}</a> : r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
