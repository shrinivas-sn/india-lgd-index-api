import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function JsonViewer({ data, label = 'Response Body' }) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-box">
      <div className="code-header">
        <span className="meta-line">{label}</span>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? <Check size={14} color="var(--ok)" /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy JSON'}</span>
        </button>
      </div>
      <div className="code-body" style={{ maxHeight: 480 }}>
        <pre>{jsonString}</pre>
      </div>
    </div>
  );
}
