import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import CustomSelect from '../components/CustomSelect';
import JsonViewer from '../components/JsonViewer';
import CodeSnippet from '../components/CodeSnippet';

const LEVELS = [
  { key: 'states', label: 'States & UTs', path: '/v1/states' },
  { key: 'districts', label: 'Districts', path: '/v1/districts' },
  { key: 'subdistricts', label: 'Sub-districts', path: '/v1/subdistricts' },
  { key: 'blocks', label: 'Blocks', path: '/v1/blocks' },
  { key: 'search', label: 'Search (all levels)', path: '/v1/search' }
];

const NEEDS_DISTRICT = new Set(['subdistricts', 'blocks']);
const NEEDS_STATE_OR_DISTRICT = new Set(['subdistricts', 'blocks', 'districts']);

export default function PlaygroundPage() {
  const [level, setLevel] = useState('states');
  const [stateCode, setStateCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [query, setQuery] = useState('');
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeLevel = LEVELS.find((l) => l.key === level);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/v1/states`)
      .then((r) => r.json())
      .then((json) => {
        if (alive) {
          setStates(
            json.data.map((s) => ({
              value: String(s.code),
              label: s.name,
              sublabel: `code ${s.code}`
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!stateCode) {
      setDistricts([]);
      return;
    }
    let alive = true;
    setDistrictCode('');
    fetch(`${API_BASE_URL}/v1/districts?state=${stateCode}`)
      .then((r) => r.json())
      .then((json) => {
        if (alive) {
          setDistricts(
            json.data.map((d) => ({
              value: String(d.code),
              label: d.name,
              sublabel: `code ${d.code}`
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [stateCode]);

  function buildPath() {
    if (level === 'search') {
      const q = query.trim();
      return q ? `/v1/search?q=${encodeURIComponent(q)}` : null;
    }
    if (level === 'states') return '/v1/states';
    if (level === 'districts') return stateCode ? `/v1/districts?state=${stateCode}` : '/v1/districts';
    if (districtCode) return `${activeLevel.path}?district=${districtCode}`;
    if (stateCode) return `${activeLevel.path}?state=${stateCode}`;
    return null;
  }

  async function send() {
    const path = buildPath();
    if (!path) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}${path}`);
      const json = await res.json();
      setResult({ status: res.status, json });
    } catch (err) {
      setResult({
        status: 0,
        json: { success: false, error: { code: 'NETWORK_ERROR', message: String(err) } }
      });
    }
    setLoading(false);
  }

  const needsQuery = level === 'search';
  const showState = NEEDS_STATE_OR_DISTRICT.has(level);
  const showDistrict = NEEDS_DISTRICT.has(level);
  const canSend =
    level === 'states' ||
    (needsQuery ? query.trim() !== '' : stateCode !== '' || districtCode !== '');

  return (
    <div className="page">
      <h1>Playground</h1>
      <p className="lede">
        Pick a level, add filters, fire the request — the JSON viewer shows exactly what your code
        would receive, envelopes and all.
      </p>

      <div className="playground-grid">
        <div className="panel">
          <h2>Request</h2>
          <div className="field">
            <CustomSelect
              label="Level"
              value={level}
              onChange={(v) => {
                setLevel(v);
                setResult(null);
              }}
              options={LEVELS.map((l) => ({ value: l.key, label: l.label }))}
            />
          </div>

          {needsQuery && (
            <div className="field">
              <label className="field-label" htmlFor="pg-query">
                Search text (q)
              </label>
              <input
                id="pg-query"
                type="text"
                className="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. ramgarh"
              />
            </div>
          )}

          {showState && (
            <div className="field">
              <CustomSelect
                label="State (state)"
                value={stateCode}
                onChange={setStateCode}
                options={states}
                placeholder="All states — optional"
              />
            </div>
          )}

          {showDistrict && (
            <div className="field">
              <CustomSelect
                label="District (district)"
                value={districtCode}
                onChange={setDistrictCode}
                options={districts}
                placeholder={stateCode ? 'All districts of this state' : 'Pick a state first'}
                disabled={!stateCode}
              />
            </div>
          )}

          <button className="btn btn-primary" onClick={send} disabled={!canSend || loading}>
            {loading ? 'Requesting…' : 'Send request'}
          </button>
        </div>

        <div>
          {result ? (
            <>
              <p className="meta-line">
                HTTP {result.status} ·{' '}
                <span className="code-chip">
                  GET {API_BASE_URL}
                  {buildPath()}
                </span>
              </p>
              {result.json.success === false && (
                <div className="error-box">
                  <span className="code-chip">{result.json.error?.code}</span>{' '}
                  {result.json.error?.message}
                </div>
              )}
              <JsonViewer data={result.json} label={`${activeLevel.label} · live response`} />
              <CodeSnippet path={buildPath()} />
            </>
          ) : (
            <div className="panel">
              <h2>Response</h2>
              <p className="lede">
                Configure the request on the left and press <strong>Send request</strong>. The
                response appears here with its HTTP status, plus the exact cURL / JavaScript /
                Python equivalent below it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
