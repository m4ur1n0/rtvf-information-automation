'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { searchHandbook } from './data';

const areaLabel: Record<string, string> = {
  summary: 'Summary',
  'key-point': 'Key point',
  detail: 'Detail',
  tag: 'Tag',
};

export function HandbookGlobalSearch({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => searchHandbook(query).slice(0, 12), [query]);

  return (
    <section
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: compact ? 'var(--space-md)' : 'var(--space-lg)',
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
        Global Handbook Search
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search across all handbook sections (e.g. wildcard, locker, prop weapon, tax, helmerich)"
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          marginBottom: query ? 'var(--space-sm)' : 0,
        }}
      />

      {query && (
        <div style={{ display: 'grid', gap: 'var(--space-xs)' }}>
          {results.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              No matches for &quot;{query}&quot;.
            </div>
          )}

          {results.map((result) => (
            <Link
              key={`${result.slug}-${result.excerpt}`}
              href={`/production-handbook/${result.slug}`}
              style={{
                textDecoration: 'none',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
                background: 'var(--bg-tertiary)',
              }}
            >
              <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
                {result.title}
              </div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginTop: '2px' }}>
                {areaLabel[result.area]}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                {result.excerpt}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
