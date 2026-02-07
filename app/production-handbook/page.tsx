'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  handbookMetrics,
  handbookSections,
  overviewLinks,
  overviewRules,
} from './data';
import { HandbookGlobalSearch } from './GlobalSearch';
import { HandbookSidebar } from './ui';

function includesQuery(query: string, section: (typeof handbookSections)[number]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    section.title,
    section.summary,
    ...section.tags,
    ...section.keyPoints,
    ...section.details.flatMap((d) => [d.heading, ...d.bullets]),
  ]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

export default function ProductionHandbookOverviewPage() {
  const [query, setQuery] = useState('');

  const filteredSections = useMemo(
    () => handbookSections.filter((section) => includesQuery(query, section)),
    [query]
  );

  return (
    <div className="dashboard-container" style={{ paddingTop: 0 }}>
      <header className="dashboard-header" style={{ marginTop: 0 }}>
        <div className="header-content">
          <div className="header-top">
            <h1 className="dashboard-title">Production Handbook Wiki</h1>
            <div className="header-stats">
              <div className="stat-pill stat-total">
                <span className="stat-value">2025-26</span>
                <span className="stat-label">Fall update</span>
              </div>
              <div className="stat-pill stat-open">
                <span className="stat-value">{filteredSections.length}</span>
                <span className="stat-label">section matches</span>
              </div>
            </div>
          </div>
          <p className="dashboard-subtitle">
            Front page overview + full section-by-section wiki with dedicated detail pages
          </p>
        </div>
      </header>

      <div style={{ marginBottom: 'var(--space-md)' }}>
        <HandbookGlobalSearch />
      </div>

      <div
        className="wiki-shell"
        style={{
          display: 'grid',
          gridTemplateColumns: '320px minmax(0, 1fr)',
          gap: 'var(--space-lg)',
          alignItems: 'start',
        }}
      >
        <HandbookSidebar sections={handbookSections} />

        <main style={{ minWidth: 0 }}>
          <section style={{ marginBottom: 'var(--space-lg)' }}>
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-lg)',
                marginBottom: 'var(--space-md)',
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '28px',
                  marginBottom: 'var(--space-sm)',
                }}
              >
                High-Level Overview
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                Use this as your quick policy briefing, then jump into the linked section pages for detailed
                constraints, timelines, and operational rules.
              </p>
              <ul style={{ paddingLeft: '18px', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                {overviewRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>

              <div
                style={{
                  marginTop: 'var(--space-md)',
                  display: 'flex',
                  gap: 'var(--space-sm)',
                  flexWrap: 'wrap',
                }}
              >
                {overviewLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-sm)',
              }}
            >
              {handbookMetrics.map((metric) => (
                <div
                  key={metric.label}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '20px',
                      color: 'var(--accent-grant)',
                    }}
                  >
                    {metric.value}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-md)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-tertiary)',
                marginBottom: 'var(--space-xs)',
              }}
            >
              Filter Section Directory
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all sections (e.g. deposit, 25Live, prop weapons, SAG, term break)"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
              }}
            />
          </section>

          <section>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '26px',
                marginBottom: 'var(--space-sm)',
              }}
            >
              Detailed Section Directory
            </h2>
            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
              {filteredSections.map((section) => (
                <article
                  key={section.slug}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-lg)',
                  }}
                >
                  <h3 style={{ fontSize: '20px', marginBottom: 'var(--space-xs)' }}>
                    {section.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                    {section.summary}
                  </p>

                  <ul style={{ paddingLeft: '18px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {section.keyPoints.slice(0, 3).map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>

                  <Link
                    href={`/production-handbook/${section.slug}`}
                    style={{
                      display: 'inline-block',
                      marginTop: 'var(--space-sm)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--accent-crew)',
                      color: 'var(--accent-crew)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Open Full Section
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
