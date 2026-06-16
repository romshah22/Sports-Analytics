'use client';

import { useState, useEffect } from 'react';
import { searchPlayers, getAllPlayers, fuzzyMatch } from '@/lib/mlb-api';
import Link from 'next/link';

export default function PlayersPage() {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [didYouMean, setDidYouMean] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load all players once for autocomplete
  useEffect(() => {
    async function load() {
      const all = await getAllPlayers();
      setAllPlayers(all);
    }
    load();
  }, []);

  // Autocomplete as user types
  useEffect(() => {
    if (query.length < 1) {
      setSuggestions([]);
      setDidYouMean([]);
      setShowSuggestions(false);
      return;
    }

    // Search for matching players
    const matching = allPlayers.filter(p =>
      p.fullName.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    // If no direct matches, try fuzzy matching for "did you mean"
    let suggestions = matching;
    let didYouMeanResults: string[] = [];

    if (matching.length === 0 && query.length > 2) {
      const playerNames = allPlayers.map(p => p.fullName);
      didYouMeanResults = fuzzyMatch(query, playerNames);
      // Find player objects for "did you mean"
      suggestions = allPlayers
        .filter(p => didYouMeanResults.includes(p.fullName))
        .slice(0, 3);
    }

    setSuggestions(suggestions);
    setDidYouMean(didYouMeanResults);
    setShowSuggestions(true);
  }, [query, allPlayers]);

  async function handleSearch(e: React.FormEvent | null, selectedPlayer?: any) {
    if (e) e.preventDefault();
    
    const searchQuery = selectedPlayer ? selectedPlayer.fullName : query;
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);
    setShowSuggestions(false);

    try {
      const results = await searchPlayers(searchQuery);
      setPlayers(results);
      setQuery(searchQuery);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function selectSuggestion(player: any) {
    handleSearch(null, player);
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
        Search any active MLB player. Type to see suggestions, or find what you meant if you mistype.
      </p>

      {/* Search Bar with Autocomplete */}
      <div style={{ position: 'relative', marginBottom: '28px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length > 0 && setShowSuggestions(true)}
              placeholder="e.g. Shohei Ohtani, Aaron Judge, Spencer Strider..."
              style={{ flex: 1, position: 'relative', zIndex: 1 }}
            />

            {/* Dropdown Suggestions */}
            {showSuggestions && (suggestions.length > 0 || didYouMean.length > 0) && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'var(--navy2)', border: '1px solid var(--border)',
                borderTop: 'none', borderRadius: '0 0 8px 8px',
                zIndex: 1000, maxHeight: '300px', overflowY: 'auto',
              }}>
                {/* Direct matches */}
                {suggestions.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => selectSuggestion(player)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'background .15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--navy3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontWeight: 600, color: '#fff' }}>
                      {player.fullName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                      {player.currentTeam?.name} · {player.primaryPosition?.abbreviation}
                    </div>
                  </div>
                ))}

                {/* "Did you mean" */}
                {didYouMean.length > 0 && suggestions.length === 0 && (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{
                      fontSize: '11px', color: 'var(--accent2)',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      fontWeight: 600, marginBottom: '8px',
                    }}>
                      Did you mean?
                    </div>
                    {suggestions.map((player) => (
                      <div
                        key={player.id}
                        onClick={() => selectSuggestion(player)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginBottom: '6px',
                          background: 'var(--navy3)',
                          transition: 'all .15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--navy3)')}
                      >
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>
                          {player.fullName}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button type="submit" style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            padding: '10px 28px', borderRadius: '8px', fontWeight: 600,
            cursor: 'pointer', fontSize: '14px', fontFamily: "'Barlow', sans-serif",
          }}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <p style={{ color: 'var(--muted)' }}>Fetching players from MLB API...</p>
      )}

      {/* No results */}
      {!loading && searched && players.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>No players found.</p>
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
                View profile →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
