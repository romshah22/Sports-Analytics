'use client';

import { useState } from 'react';
import { searchPlayers } from '@/lib/mlb-api';
import Link from 'next/link';

export default function PlayersPage() {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const results = await searchPlayers(query);
      setPlayers(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '36px', fontWeight: 700, marginBottom: '8px',
      }}>
        Player Search
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>
        Search any active MLB player by name. Powered by the official MLB Stats API.
      </p>

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Shohei Ohtani, Aaron Judge, Spencer Strider..."
          style={{ flex: 1 }}
        />
        <button type="submit" style={{
          background: 'var(--accent)', color: '#fff', border: 'none',
          padding: '10px 28px', borderRadius: '8px', fontWeight: 600,
          cursor: 'pointer', fontSize: '14px', fontFamily: "'Barlow', sans-serif",
        }}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <p style={{ color: 'var(--muted)' }}>Fetching players from MLB API...</p>
      )}

      {/* No results */}
      {!loading && searched && players.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>No players found. Try a different name.</p>
      )}

      {/* Results Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '12px',
      }}>
        {players.map((player) => (
          <Link key={player.id} href={`/player/${player.id}`} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '16px', cursor: 'pointer',
              transition: 'border-color .15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Player Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'var(--navy3)', border: '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '14px', fontWeight: 700, color: 'var(--accent2)',
                  flexShrink: 0,
                }}>
                  {player.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: '17px', fontWeight: 700, color: 'var(--text)',
                  }}>
                    {player.fullName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    {player.currentTeam?.name || 'MLB'}
                  </div>
                  <div style={{
                    display: 'inline-block', background: 'var(--navy3)',
                    color: 'var(--accent2)', fontSize: '10px', fontWeight: 700,
                    padding: '2px 7px', borderRadius: '4px', marginTop: '4px', letterSpacing: '0.5px',
                  }}>
                    {player.primaryPosition?.abbreviation || '—'}
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: '12px', color: 'var(--muted)',
                borderTop: '1px solid var(--border)', paddingTop: '10px',
              }}>
                Click to view full profile →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
