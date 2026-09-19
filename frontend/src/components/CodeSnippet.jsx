import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function CodeSnippet({ path, url }) {
  const [lang, setLang] = useState('curl');
  const [copied, setCopied] = useState(false);

  const target = path || url || '';
  const fullUrl = target.startsWith('http') ? target : `${API_BASE_URL}${target}`;

  const getCode = () => {
    switch (lang) {
      case 'curl':
        return `curl "${fullUrl}"`;
      case 'javascript':
        return `const res = await fetch("${fullUrl}");
const json = await res.json();
console.log(json.data);`;
      case 'python':
        return `import requests

response = requests.get("${fullUrl}")
print(response.json())`;
      case 'go':
        return `package main

import (
	"fmt"
	"net/http"
)

func main() {
	res, err := http.Get("${fullUrl}")
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	fmt.Println(res.Status)
}`;
      default:
        return fullUrl;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-box">
      <div className="code-header">
        <div className="code-tabs">
          {['curl', 'javascript', 'python', 'go'].map((l) => (
            <button
              key={l}
              className={`code-tab ${lang === l ? 'active' : ''}`}
              onClick={() => setLang(l)}
            >
              {l === 'javascript' ? 'JavaScript' : l === 'python' ? 'Python' : l === 'go' ? 'Go' : 'cURL'}
            </button>
          ))}
        </div>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? <Check size={14} color="var(--ok)" /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="code-body">
        <code>{getCode()}</code>
      </div>
    </div>
  );
}
