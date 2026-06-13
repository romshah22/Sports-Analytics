'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTodaysGames, getGamePreview } from '@/lib/mlb-api';

// Helper to get today's date formatted nicely
function getTodayFormatted() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
}

// Win probability bar component
function WinProbBar({ awayTeam, homeTeam, awayPct }: {
  awayTeam: string;
  homeTeam: string;
  awayPct: number;
}) {
  const homePct = 100 - awayPct;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '11px', color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: '6px',
      }}>
        <span>{awayTeam} {awayPct}%</span>
        <span>Win Probability</span>
        <span>{homePct}% {homeTeam}</span>
      </div>
      <div style={{
        height: '8px', borderRadius: '4px',
        background: 'var(--navy3)', overflow: 'hidden',
        display: 'flex',
      }}>
        <div style={{
          width: `${awayPct}%`,
          background: 'var(--accent)',
          borderRadius: '4px 0 0 4px',
          transition: 'width 1s ease',
        }} />
        <div style={{
          width: `${homePct}%`,
          background: 'var(--accent2)',
          borderRadius: '0 4px 4px 0',
        }} />
      </div>
    </div>
  );
}

// Streak indicator — shows W/L as colored boxes
function StreakBadges({ results }: { results: string[] }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {results.map((r, i) => (
        <div key={i} style={{
          width: '14px', height: '14px', borderRadius: '3px',
          background: r === 'W' ? '#4ade80' : r === 'L' ? 'var(--accent)' : 'var(--navy3)',
          fontSize: '8px', fontWeight: 700, color: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {r}
        </div>
      ))}
    </div>
  );
}

// Single game preview card
function GamePreviewCard({ game }: { game: any }) {
  const away = game.teams?.away?.team;
  const home = game.teams?.home?.team;
  const status = game.status?.detailedState;
  const isLive = status === 'In Progress';
  const isFinal = status === 'Final';
  const awayScore = game.teams?.away?.score;
  const homeScore = game.teams?.home?.score;

  // Simulated win probability based on home field advantage
  // In v2 this will use real ML model
  const awayWinPct = 47;

  // Simulated recent form — in v2 pull from API
  const awayForm = ['W', 'L', 'W', 'W', 'L', 'W', 'W', 'L', 'W', 'W'];
  const homeForm = ['L', 'W', 'W', 'L', 'W', 'W', 'L', 'W', 'W', 'W'];

  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${isLive ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '16px',
    }}>
      {/* Game Header */}
      <div style={{
        background: 'var(--navy2)',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {new Date(game.gameDate).toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
          })}
        </div>
        <div style={{
          fontSize: '11px', fontWeight: 600, padding: '3px 10px',
          borderRadius: '4px',
          background: isLive ? 'rgba(232,50,26,0.15)' : 'var(--navy3)',
          color: isLive ? 'var(--accent)' : 'var(--muted)',
        }}>
          {isLive ? `▶ LIVE — ${game.linescore?.currentInningOrdinal || ''}` :
           isFinal ? 'FINAL' : 'PREVIEW'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {game.venue?.name || ''}
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Teams and Score */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px',
        }}>
          {/* Away Team */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '24px', fontWeight: 700,
            }}>
              {away?.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              AWAY
            </div>
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              <StreakBadges results={awayForm} />
            </div>
          </div>

          {/* Score / VS */}
          <div style={{ textAlign: 'center' }}>
            {(isLive || isFinal) ? (
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '36px', fontWeight: 700,
                color: 'var(--accent2)',
              }}>
                {awayScore ?? 0} – {homeScore ?? 0}
              </div>
            ) : (
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '28px', fontWeight: 700,
                color: 'var(--muted)',
              }}>
                VS
              </div>
            )}
          </div>

          {/* Home Team */}
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '24px', fontWeight: 700,
            }}>
              {home?.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              HOME
            </div>
            <div style={{ marginTop: '8px' }}>
              <StreakBadges results={homeForm} />
            </div>
          </div>
        </div>

        {/* Win Probability Bar */}
        {!isFinal && (
          <WinProbBar
            awayTeam={away?.abbreviation || 'AWY'}
            homeTeam={home?.abbreviation || 'HME'}
            awayPct={awayWinPct}
          />
        )}

        {/* Key Stats Comparison */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '8px',
          marginBottom: '16px',
        }}>
          {[
            { label: 'Team AVG', away: '.261', home: '.258' },
            { label: 'Team ERA', away: '3.84', home: '3.71' },
            { label: 'Last 10', away: '7-3', home: '6-4' },
            { label: 'Home/Away', away: '12-8', home: '14-6' },
          ].map((stat) => (
            <div key={stat.label} style={{
              display: 'contents',
            }}>
              <div style={{
                background: 'var(--navy3)', borderRadius: '6px',
                padding: '8px 12px', textAlign: 'right',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '16px', fontWeight: 700,
                color: parseFloat(stat.away) > parseFloat(stat.home)
                  ? 'var(--accent2)' : 'var(--text)',
              }}>
                {stat.away}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
              }}>
                {stat.label}
              </div>
              <div style={{
                background: 'var(--navy3)', borderRadius: '6px',
                padding: '8px 12px', textAlign: 'left',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '16px', fontWeight: 700,
                color: parseFloat(stat.home) > parseFloat(stat.away)
                  ? 'var(--accent2)' : 'var(--text)',
              }}>
                {stat.home}
              </div>
            </div>
          ))}
        </div>

        {/* AI Prediction Placeholder */}
        <div style={{
          background: 'var(--navy3)',
          borderLeft: '3px solid var(--accent2)',
          borderRadius: '8px',
          padding: '14px 16px',
        }}>
          <div style={{
            color: 'var(--accent2)', fontSize: '11px', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.5px',
            marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--accent2)', display: 'inline-block',
            }} />
            AI Game Preview
          </div>
          <p style={{
            color: 'var(--muted)', fontSize: '13px',
            lineHeight: 1.7, fontStyle: 'italic', margin: 0,
          }}>
            {away?.name} travels to face {home?.name} tonight.
            AI-generated game previews analyzing starting pitcher matchups,
            recent form, bullpen usage, and historical head-to-head trends
            will appear here in v2, powered by OpenAI.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PreviewPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTodaysGames();
        setGames(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{
            background: 'var(--accent)', color: '#fff',
            fontSize: '11px', fontWeight: 600, padding: '3px 10px',
            borderRadius: '4px', letterSpacing: '1px',
            display: 'inline-block', marginBottom: '10px',
          }}>
            TONIGHT
          </div>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '36px', fontWeight: 700, lineHeight: 1,
          }}>
            Game Previews
          </h1>
          <p style={{
            color: 'var(--muted)', fontSize: '14px', marginTop: '8px',
          }}>
            {getTodayFormatted()} · Live MLB data
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '32px', fontWeight: 700, color: 'var(--accent2)',
          }}>
            {games.length}
          </div>
          <div style={{
            fontSize: '12px', color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            Games Today
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '60px',
          textAlign: 'center', color: 'var(--muted)',
        }}>
          Loading tonight's games...
        </div>
      )}

      {/* No games */}
      {!loading && games.length === 0 && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '60px',
          textAlign: 'center', color: 'var(--muted)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚾</div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '24px', fontWeight: 700, marginBottom: '8px',
          }}>
            No games scheduled today
          </div>
          <p>Check back on a game day or use the schedule to browse other dates.</p>
          <Link href="/schedule" style={{
            display: 'inline-block', marginTop: '16px',
            background: 'var(--accent)', color: '#fff',
            padding: '10px 24px', borderRadius: '8px',
            textDecoration: 'none', fontWeight: 600, fontSize: '14px',
          }}>
            View Full Schedule →
          </Link>
        </div>
      )}

      {/* Game Cards */}
      {!loading && games.map((game: any) => (
        <GamePreviewCard key={game.gamePk} game={game} />
      ))}
    </div>
  );
}