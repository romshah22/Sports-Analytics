// app/page.tsx
// This is your homepage — the first thing users see at localhost:3000
// It's a Server Component (no 'use client') so it loads fast.

import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '48px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: '48px', top: '50%',
          transform: 'translateY(-50%)', fontSize: '100px', opacity: 0.06,
        }}>⚾</div>

        <span style={{
          background: 'var(--accent)', color: '#fff',
          fontSize: '11px', fontWeight: 600, padding: '3px 10px',
          borderRadius: '4px', letterSpacing: '1px', display: 'inline-block',
          marginBottom: '16px',
        }}>
          2025 MLB SEASON — LIVE DATA
        </span>

        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '44px', fontWeight: 700, lineHeight: 1.1,
          marginBottom: '16px',
        }}>
          Baseball Analytics<br />
          <span style={{ color: 'var(--accent2)' }}>Built Different.</span>
        </h1>

        <p style={{ color: 'var(--muted)', fontSize: '16px', maxWidth: '500px', lineHeight: 1.7 }}>
          Real-time stats, pitcher vs. batter matchups, live standings, and AI-powered
          insights — all powered by the official MLB Stats API.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <Link href="/players" style={{
            background: 'var(--accent)', color: '#fff', padding: '10px 24px',
            borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '14px',
          }}>
            Search Players →
          </Link>
          <Link href="/standings" style={{
            background: 'transparent', color: 'var(--text)', padding: '10px 24px',
            borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '14px',
            border: '1px solid var(--border)',
          }}>
            View Standings
          </Link>
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { val: '750+', label: 'Active Players' },
          { val: '30', label: 'MLB Teams' },
          { val: '162', label: 'Game Season' },
          { val: 'Free', label: 'No API Key Needed' },
        ].map((s) => (
          <div key={s.label} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '20px', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '32px', fontWeight: 700, color: 'var(--accent2)',
            }}>{s.val}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { href: '/players', icon: '🔍', title: 'Player Search', desc: 'Search any active MLB player. View season stats, game logs, and home/away splits.' },
          { href: '/h2h', icon: '⚔️', title: 'Head-to-Head', desc: 'Pick any pitcher and batter. See their all-time matchup history and stats.' },
          { href: '/standings', icon: '🏆', title: 'Live Standings', desc: 'AL and NL standings updated in real time from the official MLB Stats API.' },
        ].map((f) => (
          <Link key={f.href} href={f.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '24px', cursor: 'pointer',
              transition: 'border-color .15s',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{f.icon}</div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '18px', fontWeight: 700, marginBottom: '8px',
              }}>{f.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
