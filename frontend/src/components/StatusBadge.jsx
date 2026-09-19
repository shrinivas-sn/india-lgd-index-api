import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const PILL = {
  online: { bg: '#e5f0e8', border: '#b9d4c2', color: 'var(--ok)' },
  sleeping: { bg: '#f4ecd7', border: '#ddcba0', color: 'var(--warn)' },
  offline: { bg: 'var(--bad-bg)', border: '#e3bdb4', color: 'var(--bad)' },
  checking: { bg: 'var(--paper-dim)', border: 'var(--rule-strong)', color: 'var(--ink-soft)' }
};

export default function StatusBadge() {
  const [status, setStatus] = useState('checking');
  const [latency, setLatency] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let timer = null;

    async function checkHealth() {
      const start = Date.now();
      timer = setTimeout(() => {
        if (isMounted) setStatus((s) => (s === 'checking' ? 'sleeping' : s));
      }, 2500);

      try {
        const res = await fetch(`${API_BASE_URL}/`);
        const duration = Date.now() - start;
        const json = await res.json();
        clearTimeout(timer);
        if (isMounted && res.ok && json.success) {
          setStatus('online');
          setLatency(duration);
        } else if (isMounted) {
          setStatus('offline');
        }
      } catch (err) {
        clearTimeout(timer);
        if (isMounted) setStatus('offline');
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const style = PILL[status];

  return (
    <div
      className="status-pill"
      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}
    >
      <div className="status-dot" style={{ backgroundColor: style.color }} />
      <span>
        {status === 'online'
          ? `API online · ${latency}ms`
          : status === 'sleeping'
            ? 'Waking the API…'
            : status === 'checking'
              ? 'Checking…'
              : 'API offline'}
      </span>
    </div>
  );
}
