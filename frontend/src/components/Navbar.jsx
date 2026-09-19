import React from 'react';
import { Link, NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/playground', label: 'Playground' },
  { to: '/docs', label: 'Docs' },
  { to: '/status', label: 'Status' }
];

export default function Navbar() {
  return (
    <header className="site-header">
      <Link to="/" className="brand">
        LGD Hierarchy API
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
