'use client';

import { useState, useEffect } from 'react';
import { getPlayer, getPlayerStats, getPlayerGameLog } from '@/lib/mlb-api';
import StatTooltip from '@/components/StatTooltip';
import Link from 'next/link';

export default function PlayerProfile({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<number | null>(null);
  const [view, setView] = useState<'season' | 'career'>('season');
  const [selectedSeason, setSelectedSeason] = useState(2026);
  const [player, setPlayer] = useState<any>(null);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [gameLog, setGameLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // Unwrap params promise
  useEffect(() => {
    params.then(p => setId(parseInt(p.id)));
  }, [params]);

  // Load player info once
  useEffect(() => {
    if (!id) return;
    async function loadPlayer() {
      try {
        const p = await getPlayer(id);
        setPlayer(p);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPlayer();
  }, [id]);

  // Reload stats whenever view or season changes
  useEffect(() => {
    if (!id) return;
    async function loadStats() {
      setStatsLoading(true);
      try {
        const season = view === 'career' ? undefined : selectedSeason;
        const [stats, log] = await Promise.all([
          getPlayerStats(id, season),
          view === 'season' ? getPlayerGameLog(id, selectedSeason) : Promise.resolve([]),
        ]);
        setStatsData(stats);
        setGameLog(log);
      } catch (err) {
        console.error(err);
      } finally {
        setStatsLoading(false);
      }
    }
    loadStats();
  }, [id, view, selectedSeason]);

  if (loading || !id) {
    return (
      <div style={{ color: 'var(--muted)', padding: '40px', textAlign: 'center' }}>
        Loading player...
      </div>
    );
  }

  if (!player) {
    return <div style={{ color: 'var(--muted)' }}>Player not found.</div>;
  }

  const hittingStats = statsData.find((s: any) => s.group?.displayName === 'hitting')?.splits?.[0]?.stat;
  const pitchingStats = statsData.find((s: any) => s.group?.displayName === 'pitching')?.splits?.[0]?.stat;
  const isPitcher = !!pitchingStats && !hittingStats;
  const initials = player.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2);

  return (
    <div>
      {/* Back Button */}
      <Link href="/players" style={{
        color: 'var(--muted)', textDecoration: 'none',
        fontSize: '13px', display: 'inline-block', marginBottom: '20px',
      }}>
        ← Back to Player Search
      </Link>

      {/* Profile Header */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '28px',
        display: 'flex', alignItems: 'center', gap: '24px',
        marginBottom: '16px', flexWrap: 'wrap',
      }}>
        {/* Avatar */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'var(--navy3)', border: '3px solid var(--accent2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '24px', fontWeight: 700, color: 'var(--accent2)', flexShrink: 0,
        }}>
          {initials}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '36px', fontWeight: 700, lineHeight: 1, marginBottom: '6px',
          }}>
            {player.fullName}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            {player.currentTeam?.name} · {player.primaryPosition?.name} · #{player.primaryNumber || '—'}
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            {[
              player.primaryPosition?.abbreviation,
              player.batSide?.description ? `Bats ${player.batSide.description}` : null,
              player.pitchHand?.description ? `Throws ${player.pitchHand.description}` : null,
            ].filter(Boolean).map((badge) => (
              <span key={badge} style={{
                background: 'var(--navy3)', color: 'var(--text)',
                fontSize: '11px', padding: '3px 10px', borderRadius: '5px',
                border: '1px solid var(--border)',
              }}>
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* View Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
          {/* Tab Toggle */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setView('season')}
              style={{
                padding: '6px 16px', borderRadius: '6px',
                fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Barlow', sans-serif",
                border: view === 'season' ? 'none' : '1px solid var(--border)',
                background: view === 'season' ? 'var(--accent2)' : 'var(--navy3)',
                color: view === 'season' ? '#000' : 'var(--muted)',
                transition: 'all .15s',
              }}
            >
              By Season
            </button>
            <button
              onClick={() => setView('career')}
              style={{
                padding: '6px 16px', borderRadius: '6px',
                fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Barlow', sans-serif",
                border: view === 'career' ? 'none' : '1px solid var(--border)',
                background: view === 'career' ? 'var(--accent2)' : 'var(--navy3)',
                color: view === 'career' ? '#000' : 'var(--muted)',
                transition: 'all .15s',
              }}
            >
              Career
            </button>
          </div>

          {/* Season Dropdown (only show when on "By Season" tab) */}
          {view === 'season' && (
            <div>
              <label style={{
                fontSize: '11px', color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                display: 'block', marginBottom: '6px',
              }}>
                Season
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                style={{
                  background: 'var(--navy3)', color: 'var(--text)',
                  border: '1px solid var(--border)',
                  padding: '6px 12px', borderRadius: '6px',
                  fontSize: '13px', fontFamily: "'Barlow', sans-serif",
                  cursor: 'pointer',
                  minWidth: '100px',
                }}
              >
                <option value={2026}>2026 (Current)</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
                <option value={2022}>2022</option>
              </select>
            </div>
          )}

          {view === 'career' && (
            <div style={{
              background: 'rgba(245,166,35,0.15)', color: 'var(--accent2)',
              fontSize: '10px', fontWeight: 600, padding: '4px 10px',
              borderRadius: '4px', letterSpacing: '0.5px',
            }}>
              ALL-TIME CAREER STATS
            </div>
          )}
        </div>
      </div>

      {/* AI Insight */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderLeft: '3px solid var(--accent2)',
        borderRadius: '10px', padding: '20px', marginBottom: '16px',
      }}>
        <div style={{
          color: 'var(--accent2)', fontSize: '12px', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
        }}>
          ✦ AI Performance Summary
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
          AI-generated performance summary for {player.fullName} ({view === 'career' ? 'career' : `${selectedSeason} season`})
          will appear here in v2, powered by OpenAI.
        </p>
      </div>

      {/* Stats Loading */}
      {statsLoading && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '40px', textAlign: 'center',
          color: 'var(--muted)', marginBottom: '16px',
        }}>
          Loading {view === 'career' ? 'career' : `${selectedSeason}`} stats...
        </div>
      )}

      {/* Season/Career Stats */}
      {!statsLoading && (hittingStats || pitchingStats) && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '20px', marginBottom: '16px',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '14px', fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>
              {view === 'career' ? 'Career Stats' : `${selectedSeason} Season Stats`}
            </span>
            {view === 'season' && selectedSeason === 2026 && (
              <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}>
                Updates after every game
              </span>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '12px',
          }}>
            {hittingStats && [
              { label: 'AVG', val: hittingStats.avg || '—' },
              { label: 'HR', val: hittingStats.homeRuns ?? '—' },
              { label: 'RBI', val: hittingStats.rbi ?? '—' },
              { label: 'OPS', val: hittingStats.ops || '—' },
              { label: 'H', val: hittingStats.hits ?? '—' },
              { label: 'R', val: hittingStats.runs ?? '—' },
              { label: 'BB', val: hittingStats.baseOnBalls ?? '—' },
              { label: 'K', val: hittingStats.strikeOuts ?? '—' },
              { label: 'SB', val: hittingStats.stolenBases ?? '—' },
              { label: 'OBP', val: hittingStats.obp || '—' },
              { label: 'SLG', val: hittingStats.slg || '—' },
              { label: 'G', val: hittingStats.gamesPlayed ?? '—' },
            ].map((s) => (
              <StatTooltip key={s.label} label={s.label} value={s.val} />
            ))}

            {pitchingStats && [
              { label: 'ERA', val: pitchingStats.era || '—' },
              { label: 'W', val: pitchingStats.wins ?? '—' },
              { label: 'L', val: pitchingStats.losses ?? '—' },
              { label: 'K', val: pitchingStats.strikeOuts ?? '—' },
              { label: 'WHIP', val: pitchingStats.whip || '—' },
              { label: 'IP', val: pitchingStats.inningsPitched || '—' },
              { label: 'BB', val: pitchingStats.baseOnBalls ?? '—' },
              { label: 'GS', val: pitchingStats.gamesStarted ?? '—' },
              { label: 'SV', val: pitchingStats.saves ?? '—' },
              { label: 'BAA', val: pitchingStats.avg || '—' },
              { label: 'K/9', val: pitchingStats.strikeoutsPer9Inn || '—' },
              { label: 'G', val: pitchingStats.gamesPitched ?? '—' },
            ].map((s) => (
              <StatTooltip key={s.label} label={s.label} value={s.val} />
            ))}
          </div>
        </div>
      )}

      {/* No stats found */}
      {!statsLoading && !hittingStats && !pitchingStats && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '32px', textAlign: 'center',
          color: 'var(--muted)', marginBottom: '16px',
        }}>
          {view === 'season' && selectedSeason === 2026
            ? 'No stats yet for the 2026 season. Check back once the season gets underway.'
            : `No stats found for ${view === 'career' ? 'career' : `${selectedSeason}`}.`}
        </div>
      )}

      {/* Game Log — only show for season view */}
      {!statsLoading && view === 'season' && gameLog.length > 0 && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '20px',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '14px', fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px',
          }}>
            Last {gameLog.length} Games — {selectedSeason}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Date', 'Opponent', isPitcher ? 'IP' : 'AB',
                    isPitcher ? 'ER' : 'H', isPitcher ? 'K' : 'HR',
                    isPitcher ? 'BB' : 'RBI', isPitcher ? 'ERA' : 'AVG'
                  ].map((h) => (
                    <th key={h} style={{
                      color: 'var(--muted)', fontWeight: 500, textAlign: 'left',
                      padding: '6px 8px', borderBottom: '1px solid var(--border)',
                      fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gameLog.map((game: any, i: number) => {
                  const s = game.stat;
                  return (
                    <tr key={i}>
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(30,58,95,.4)', color: 'var(--muted)' }}>
                        {game.date}
                      </td>
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(30,58,95,.4)' }}>
                        {game.opponent?.name || '—'}
                      </td>
                      {isPitcher ? (
                        <>
                          <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(30,58,95,.4)' }}>{s.inningsPitched || '—'}</td>
                          <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(30,58,95,.4)' }}>{s.earnedRuns ?? '—'}</td>
                          <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(30,58,95,.4)' }}>{s.strikeOuts ?? '—'}</td>
                          <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(30,58,95,.4)' }}>{s.baseOnBalls ?? '—'}</td>
                          <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(30,58,95,.4)' }}>{s.era || '—'}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(30,58,95,.4)' }}>{s.atBats ?? '—'}</td>
                          <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(30,58,95,.4)' }}>{s.hits ?? '—'}</td>
                          <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(30,58,95,.4)' }}>{s.homeRuns ?? '—'}</td>
                          <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(30,58,95,.4)' }}>{s.rbi ?? '—'}</td>
                          <td style={{ padding: '7px 8px', borderBottom: '1px solid rgba(30,58,95,.4)' }}>{s.avg || '—'}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}