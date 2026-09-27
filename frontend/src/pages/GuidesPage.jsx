import React, { useState } from 'react';
import { LGD_GUIDES } from '../content/guidesData';

export default function GuidesPage() {
  const [selectedGuide, setSelectedGuide] = useState(LGD_GUIDES[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGuides = LGD_GUIDES.filter((g) =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="page guides-page" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      <header className="page-header" style={{ marginBottom: 24 }}>
        <h1>Technical Guides & SEO Reference</h1>
        <p className="page-intro" style={{ color: 'var(--color-text-muted, #64748b)' }}>
          Authoritative architectural guides for India's Local Government Directory, Census mappings, and KYC address verification.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="search"
            placeholder="Search guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '10px 12px', borderRadius: 6, border: '1px solid var(--color-border, #cbd5e1)',
              background: 'var(--color-bg, #ffffff)', color: 'inherit', width: '100%'
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredGuides.map((guide) => {
              const isSelected = selectedGuide?.id === guide.id;
              return (
                <div
                  key={guide.id}
                  onClick={() => setSelectedGuide(guide)}
                  style={{
                    padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${isSelected ? 'var(--color-primary, #0284c7)' : 'var(--color-border, #e2e8f0)'}`,
                    background: isSelected ? 'var(--color-bg-hover, #f0f9ff)' : 'var(--color-card, #ffffff)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                    <span>{guide.category}</span>
                    <span>{guide.readTime}</span>
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.4, color: isSelected ? 'var(--color-primary, #0284c7)' : 'inherit' }}>
                    {guide.title}
                  </h3>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Reader */}
        {selectedGuide && (
          <article style={{
            padding: '28px 32px', borderRadius: 8,
            border: '1px solid var(--color-border, #e2e8f0)', background: 'var(--color-card, #ffffff)'
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              <span style={{
                padding: '2px 8px', borderRadius: 4, background: '#e0f2fe',
                color: '#0369a1', fontWeight: 600, fontSize: 11
              }}>
                {selectedGuide.category}
              </span>
              <span>• {selectedGuide.readTime}</span>
              <span>• Published {selectedGuide.date}</span>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px 0', lineHeight: 1.3 }}>
              {selectedGuide.title}
            </h2>

            <p style={{
              fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 24,
              borderLeft: '3px solid var(--color-primary, #0284c7)', paddingLeft: 14
            }}>
              {selectedGuide.summary}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {selectedGuide.sections.map((sec, idx) => (
                <div key={idx}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px 0' }}>
                    {sec.heading}
                  </h3>
                  {sec.content && (
                    <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-line', color: 'inherit' }}>
                      {sec.content}
                    </div>
                  )}
                  {sec.code && (
                    <pre style={{
                      marginTop: 10, padding: 14, borderRadius: 6, fontSize: 12,
                      background: '#0f172a', color: '#f8fafc', overflowX: 'auto'
                    }}>
                      <code>{sec.code}</code>
                    </pre>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                Indexed SEO Keywords:
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedGuide.keywords.map((kw) => (
                  <span key={kw} style={{
                    padding: '2px 8px', borderRadius: 4, background: '#f1f5f9',
                    border: '1px solid #e2e8f0', color: '#475569', fontSize: 11
                  }}>
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
