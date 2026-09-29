import React from 'react';
import { Link, NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/playground', label: 'Playground' },
  { to: '/docs', label: 'Docs' },
  { to: '/guides', label: 'Guides' },
  { to: '/status', label: 'Status' }
];

export default function Navbar() {
  return (
    <header className="site-header">
      <Link to="/" className="brand" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <img src="/images/favicon.svg" alt="LGD API Logo" style={{ width: '22px', height: '22px', display: 'inline-block' }} />
        <span>LGD Hierarchy API</span>
        <span className="brand-tag">v1 · keyless</span>
      </Link>
      <nav className="nav">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
