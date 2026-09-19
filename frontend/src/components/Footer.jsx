import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        Data © Ministry of Panchayati Raj, Government of India —{' '}
        <a href="https://lgdirectory.gov.in/" target="_blank" rel="noreferrer">
          Local Government Directory
        </a>
        . Mirrored from{' '}
        <a href="https://github.com/ramSeraph/opendata" target="_blank" rel="noreferrer">
          ramSeraph/opendata
        </a>
        . Licensed under the{' '}
        <a
          href="https://data.gov.in/government-open-data-license-india"
          target="_blank"
          rel="noreferrer"
        >
          Government Open Data License – India (GODL)
        </a>
        .
      </div>
    </footer>
  );
}
