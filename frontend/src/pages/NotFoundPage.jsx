import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page">
      <h1>Page not found</h1>
      <p className="lede">
        The path you followed does not exist on this portal. The API itself returns a JSON 404 the
        same way — try the <Link to="/playground">Playground</Link> to see one live.
      </p>
      <div className="btn-row">
        <Link to="/" className="btn btn-primary">
          Back home
        </Link>
        <Link to="/docs" className="btn">
          Read the docs
        </Link>
      </div>
    </div>
  );
}
