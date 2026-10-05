'use client';

import { useEffect, useMemo, useState } from 'react';
import { fuzzyMatch, searchPlayers } from '@/lib/mlb-api';
import { Search } from 'lucide-react';

type Player = {
  id: number;
  fullName: string;
  currentTeam?: { name?: string; abbreviation?: string };
};

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
}

export default function PlayerSearchBox({
  label,
  placeholder,
  players,
  selected,
  onSelect,
  excludeId,
  accent,
}: {
  label: string;
  placeholder: string;
  players: Player[];
  selected: Player | null;
  onSelect: (player: Player | null) => void;
  excludeId?: number;
  accent: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<Player[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setRemote([]); setError('');
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => searchPlayers(query.trim()).then(p => { if(active) setRemote(p); }).catch(() => { if(active) setError('Historical search unavailable. Local matches shown.'); }), 350);
    return () => { active=false; clearTimeout(timer); };
  }, [query]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = [...new Map([...players, ...remote].map(p=>[p.id,p])).values()].filter((p) => p.id !== excludeId);
    if (!normalized) return filtered.slice(0, 10);
    const direct = filtered.filter(p => p.fullName.toLowerCase().includes(normalized));
    const fuzzy = fuzzyMatch(normalized, filtered.map(p=>p.fullName));
    return [...direct, ...filtered.filter(p=>fuzzy.includes(p.fullName) && !direct.includes(p))].slice(0,10);
  }, [players, remote, query, excludeId]);

  if (selected) {
    return (
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px',
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--navy3)',
            border: `1px solid ${accent}`,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'var(--card)',
              color: accent,
              border: `2px solid ${accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials(selected.fullName)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>{selected.fullName}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {selected.currentTeam?.name || 'MLB'}
            </div>
          </div>
        </div>
        <button
          onClick={() => onSelect(null)}
          style={{
            width: '100%',
            padding: '8px',
            background: 'var(--navy3)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Change Player
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
        position: 'relative',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ position: 'relative' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
          }}
        />
        <input
          aria-label={label}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px 12px 10px 36px',
            background: 'var(--navy3)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: "'Barlow', sans-serif",
            boxSizing: 'border-box',
          }}
        />
      </div>
      {error && <p role="status">{error}</p>}
      {open && query.length > 1 && results.length === 0 && <p>No matching players found.</p>}
      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: '20px',
            right: '20px',
            top: '100%',
            marginTop: '4px',
            background: 'var(--navy2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            overflow: 'hidden',
            zIndex: 50,
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {results.map((player) => (
            <button
              key={player.id}
              onClick={() => {
                onSelect(player);
                setQuery('');
                setOpen(false);
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                color: 'var(--text)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: "'Barlow', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--navy3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ fontWeight: 600 }}>{player.fullName}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {player.currentTeam?.abbreviation || 'MLB'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
