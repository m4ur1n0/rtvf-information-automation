'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      marginBottom: 'var(--space-lg)',
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '0 var(--space-xl)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-lg)',
        height: '56px',
      }}>
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            textDecoration: 'none',
            letterSpacing: '-0.02em',
          }}
        >
          RTVF Info
        </Link>

        <div style={{
          display: 'flex',
          gap: 'var(--space-sm)',
          flex: 1,
        }}>
          <Link
            href="/"
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive('/') ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: isActive('/') ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${isActive('/') ? 'var(--border-emphasis)' : 'transparent'}`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive('/')) {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }
            }}
          >
            📊 Dashboard
          </Link>

          <Link
            href="/petitions"
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive('/petitions') ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: isActive('/petitions') ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${isActive('/petitions') ? 'var(--border-emphasis)' : 'transparent'}`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive('/petitions')) {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/petitions')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }
            }}
          >
            📋 Petitions
          </Link>

          <Link
            href="/grants"
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive('/grants') ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: isActive('/grants') ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${isActive('/grants') ? 'var(--border-emphasis)' : 'transparent'}`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive('/grants')) {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/grants')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }
            }}
          >
            💰 Grants
          </Link>

          <Link
            href="/locations"
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive('/locations') ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: isActive('/locations') ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${isActive('/locations') ? 'var(--border-emphasis)' : 'transparent'}`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive('/locations')) {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/locations')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }
            }}
          >
            📍 Locations
          </Link>

          <Link
            href="/people-directory"
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive('/people-directory') ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: isActive('/people-directory') ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${isActive('/people-directory') ? 'var(--border-emphasis)' : 'transparent'}`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive('/people-directory')) {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/people-directory')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }
            }}
          >
            👥 People
          </Link>

          <Link
            href="/temp-forum"
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive('/temp-forum') ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: isActive('/temp-forum') ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${isActive('/temp-forum') ? 'var(--border-emphasis)' : 'transparent'}`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive('/temp-forum')) {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/temp-forum')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }
            }}
          >
            ⏰ Temporary Posts
          </Link>

          <Link
            href="/calendar"
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive('/calendar') ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: isActive('/calendar') ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${isActive('/calendar') ? 'var(--border-emphasis)' : 'transparent'}`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive('/calendar')) {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/calendar')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }
            }}
          >
            📅 Calendar
          </Link>
        </div>

        <div style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          HCI Prototypes
        </div>
      </div>
    </nav>
  );
}
