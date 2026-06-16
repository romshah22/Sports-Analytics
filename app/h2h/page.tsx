'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Search, Swords, UserRound } from 'lucide-react';
import { getAllPlayers, getHeadToHead } from '@/lib/mlb-api';

type Player = {
  id: number;
  fullName: string;
  currentTeam?: { name?: string; abbreviation?: string };
  primaryPosition?: { name?: string; abbreviation?: string };
  batSide?: { description?: string };
  pitchHand?: { description?: string };
};

type MatchupResult = {
  stat: Record<string, string | number | undefined>;
  player?: Player;
  team?: { name?: string; abbreviation?: string };
} | null;

const seasons = [undefined, 2026, 2025, 2024, 2023, 2022] as const;

function playerMeta(player: Player) {
  return [
    player.currentTeam?.name || 'MLB',
    player.primaryPosition?.abbreviation,
  ].filter(Boolean).join(' · ');
}

function initials(name: string) {
  return name.split(' ').map((word) => word[0]).join('').slice(0, 2);
}

function isPitcher(player: Player) {
  return player.primaryPosition?.abbreviation === 'P';
}

function formatValue(value: string | number | undefined) {
  return value ?? '-';
}

function PlayerSearchBox({
  label,
  placeholder,
  players,
  selected,
  onSelect,
  accent,
}: {
  label: string;
  placeholder: string;
  players: Player[];
  selected: Player | null;
  onSelect: (player: Player | null) => void;
  accent: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return players.slice(0, 8);

    return players
      .filter((player) => player.fullName.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [players, query]);

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      minWidth: 0,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--muted)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.5px',
        marginBottom: '12px',
        textTransform: 'uppercase',
      }}>
        <UserRound size={14} color={accent} />
        {label}
      </div>

      {selected ? (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--navy3)',
            border: `1px solid ${accent}`,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '10px',
          }}>
            <div style={{
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
            }}>
              {initials(selected.fullName)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: '#fff' }}>{selected.fullName}</div>
              <div style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '3px' }}>
                {playerMeta(selected)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery('');
              setOpen(false);
            }}
            style={{
              width: '100%',
              background: 'var(--navy3)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: '6px',
              padding: '8px',
              cursor: 'pointer',
              fontFamily: "'Barlow', sans-serif",
              fontSize: '13px',
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              color="var(--muted)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
            />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              style={{ width: '100%', paddingLeft: '36px' }}
            />
          </div>

          {open && (
            <div style={{
              position: 'absolute',
              zIndex: 10,
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: 'var(--navy2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              maxHeight: '292px',
              overflowY: 'auto',
              boxShadow: '0 18px 40px rgba(0,0,0,.22)',
            }}>
              {results.length > 0 ? results.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => {
                    onSelect(player);
                    setQuery(player.fullName);
                    setOpen(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text)',
                    padding: '11px 14px',
                    cursor: 'pointer',
                    fontFamily: "'Barlow', sans-serif",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{player.fullName}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '3px' }}>
                    {playerMeta(player)}
                  </div>
                </button>
              )) : (
                <div style={{ color: 'var(--muted)', fontSize: '13px', padding: '14px' }}>
                  No matching players found.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string | number | undefined; accent?: boolean }) {
  return (
    <div style={{
      background: 'var(--navy3)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '14px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '26px',
        fontWeight: 700,
        color: accent ? 'var(--accent2)' : '#fff',
        lineHeight: 1,
      }}>
        {formatValue(value)}
      </div>
      <div style={{
        color: 'var(--muted)',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        marginTop: '8px',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  );
}

export default function HeadToHeadPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [batter, setBatter] = useState<Player | null>(null);
  const [pitcher, setPitcher] = useState<Player | null>(null);
  const [season, setSeason] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<MatchupResult>(null);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [matchupLoading, setMatchupLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPlayers() {
      try {
        const allPlayers = await getAllPlayers();
        setPlayers(allPlayers);
      } catch (err) {
        console.error(err);
        setError('Could not load MLB players.');
      } finally {
        setPlayersLoading(false);
      }
    }

    loadPlayers();
  }, []);

  const pitcherOptions = useMemo(() => players.filter(isPitcher), [players]);
  const batterOptions = useMemo(() => players.filter((player) => !isPitcher(player)), [players]);

  async function runMatchup() {
    if (!batter || !pitcher) return;

    setMatchupLoading(true);
    setSearched(true);
    setError('');

    try {
      const data = await getHeadToHead(batter.id, pitcher.id, season);
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult(null);
      setError('Could not fetch that matchup from the MLB Stats API.');
    } finally {
      setMatchupLoading(false);
    }
  }

  const stat = result?.stat;

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '36px',
            fontWeight: 700,
            marginBottom: '8px',
          }}>
            Head-to-Head
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '620px', lineHeight: 1.6 }}>
            Pick a batter and pitcher to see their direct matchup history from the official MLB Stats API.
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px 10px',
          color: 'var(--accent2)',
          fontSize: '12px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          <Swords size={16} />
          Batter vs. Pitcher
        </div>
      </div>

      {playersLoading ? (
        <p style={{ color: 'var(--muted)' }}>Loading player data...</p>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '16px',
            marginBottom: '16px',
          }}>
            <PlayerSearchBox
              label="Batter"
              placeholder="Search hitters..."
              players={batterOptions}
              selected={batter}
              onSelect={(player) => {
                setBatter(player);
                setResult(null);
                setSearched(false);
              }}
              accent="var(--accent2)"
            />
            <PlayerSearchBox
              label="Pitcher"
              placeholder="Search pitchers..."
              players={pitcherOptions}
              selected={pitcher}
              onSelect={(player) => {
                setPitcher(player);
                setResult(null);
                setSearched(false);
              }}
              accent="var(--accent)"
            />
          </div>

          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                color: 'var(--muted)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}>
                Split
              </span>
              {seasons.map((year) => (
                <button
                  key={year ?? 'career'}
                  type="button"
                  onClick={() => {
                    setSeason(year);
                    setResult(null);
                    setSearched(false);
                  }}
                  style={{
                    background: season === year ? 'var(--accent2)' : 'var(--navy3)',
                    border: season === year ? '1px solid var(--accent2)' : '1px solid var(--border)',
                    color: season === year ? '#081426' : 'var(--muted)',
                    borderRadius: '6px',
                    padding: '7px 13px',
                    fontFamily: "'Barlow', sans-serif",
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {year ?? 'Career'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={runMatchup}
              disabled={!batter || !pitcher || matchupLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: !batter || !pitcher ? 'var(--navy3)' : 'var(--accent)',
                border: 'none',
                color: '#fff',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: !batter || !pitcher ? 'not-allowed' : 'pointer',
                fontFamily: "'Barlow', sans-serif",
                fontSize: '14px',
                fontWeight: 700,
                minWidth: '150px',
                opacity: !batter || !pitcher ? 0.65 : 1,
              }}
            >
              <RefreshCcw size={16} />
              {matchupLoading ? 'Loading...' : 'Run Matchup'}
            </button>
          </div>
        </>
      )}

      {error && (
        <div style={{
          background: 'rgba(232,50,26,0.12)',
          border: '1px solid var(--accent)',
          borderRadius: '8px',
          color: '#fff',
          padding: '12px 14px',
          marginBottom: '16px',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {batter && pitcher && (
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{ textAlign: 'right', minWidth: 0 }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--accent2)',
              }}>
                {batter.fullName}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px' }}>
                {playerMeta(batter)}
              </div>
            </div>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              border: '1px solid var(--border)',
              background: 'var(--navy3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
            }}>
              VS
            </div>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--accent)',
              }}>
                {pitcher.fullName}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px' }}>
                {playerMeta(pitcher)}
              </div>
            </div>
          </div>

          {matchupLoading && (
            <p style={{ color: 'var(--muted)', textAlign: 'center' }}>
              Fetching matchup stats...
            </p>
          )}

          {!matchupLoading && searched && !stat && (
            <div style={{
              background: 'var(--navy3)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--muted)',
              padding: '18px',
              textAlign: 'center',
            }}>
              No recorded at-bats found for this split.
            </div>
          )}

          {!matchupLoading && stat && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                gap: '10px',
                marginBottom: '22px',
              }}>
                <StatTile label="AVG" value={stat.avg} accent />
                <StatTile label="OPS" value={stat.ops} accent />
                <StatTile label="AB" value={stat.atBats} />
                <StatTile label="Hits" value={stat.hits} />
                <StatTile label="HR" value={stat.homeRuns} />
                <StatTile label="RBI" value={stat.rbi} />
              </div>

              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
              }}>
                <thead>
                  <tr>
                    {['PA', 'AB', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'SO', 'OBP', 'SLG', 'OPS'].map((header) => (
                      <th key={header} style={{
                        color: 'var(--muted)',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.4px',
                        padding: '8px',
                        textAlign: 'right',
                        textTransform: 'uppercase',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {[
                      stat.plateAppearances,
                      stat.atBats,
                      stat.hits,
                      stat.doubles,
                      stat.triples,
                      stat.homeRuns,
                      stat.rbi,
                      stat.baseOnBalls,
                      stat.strikeOuts,
                      stat.obp,
                      stat.slg,
                      stat.ops,
                    ].map((value, index) => (
                      <td key={index} style={{
                        color: index > 8 ? 'var(--accent2)' : 'var(--text)',
                        padding: '12px 8px',
                        textAlign: 'right',
                        borderBottom: '1px solid rgba(30,58,95,.4)',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: '18px',
                        fontWeight: 700,
                      }}>
                        {formatValue(value)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
