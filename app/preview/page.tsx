'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getSchedule,
  getTeamRecentForm,
  getTeamSeasonStats,
  getTeamHeadToHead,
} from '@/lib/mlb-api';
import {
  fetchEspnOdds,
  findOddsForGame,
  getImpliedProbability,
  formatOdds,
} from '@/lib/odds-utils';
import GeminiAnalysis from '@/components/GeminiAnalysis';
import DateCalendar from '@/components/DateCalendar';

function formatDateForAPI(d: Date) {
  return d.toISOString().split('T')[0];
}

function formatDateDisplay(d: Date) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function isToday(d: Date) {
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function WinProbBar({
  awayTeam,
  homeTeam,
  awayPct,
}: {
  awayTeam: string;
  homeTeam: string;
  awayPct: number;
}) {
  const homePct = 100 - awayPct;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '6px',
        }}
      >
        <span>
          {awayTeam} {awayPct.toFixed(1)}%
        </span>
        <span>Win Probability</span>
        <span>
          {homePct.toFixed(1)}% {homeTeam}
        </span>
      </div>
      <div
        style={{
          height: '8px',
          borderRadius: '4px',
          background: 'var(--navy3)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div
          style={{
            width: `${awayPct}%`,
            background: 'var(--accent)',
            borderRadius: '4px 0 0 4px',
            transition: 'width 1s ease',
          }}
        />
        <div
          style={{
            width: `${homePct}%`,
            background: 'var(--accent2)',
            borderRadius: '0 4px 4px 0',
          }}
        />
      </div>
    </div>
  );
}

function StreakBadges({ results }: { results: string[] }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {results.map((r, i) => (
        <div
          key={i}
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '3px',
            background:
              r === 'W' ? '#4ade80' : r === 'L' ? 'var(--accent)' : 'var(--navy3)',
            fontSize: '8px',
            fontWeight: 700,
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {r}
        </div>
      ))}
    </div>
  );
}

interface GameStats {
  awayForm: string[];
  homeForm: string[];
  awayAvg: string;
  homeAvg: string;
  awayEra: string;
  homeEra: string;
  awayLast10: string;
  homeLast10: string;
  awayRecord: string;
  homeRecord: string;
  h2h: string;
  awayWinPct: number;
  oddsSummary: string;
}

function GamePreviewCard({
  game,
  oddsMap,
}: {
  game: any;
  oddsMap: Map<string, import('@/lib/odds-utils').OddsData>;
}) {
  const away = game.teams?.away?.team;
  const home = game.teams?.home?.team;
  const status = game.status?.detailedState;
  const isLive = status === 'In Progress';
  const isFinal = status === 'Final';
  const awayScore = game.teams?.away?.score;
  const homeScore = game.teams?.home?.score;

  const [stats, setStats] = useState<GameStats | null>(null);

  useEffect(() => {
    if (!away?.id || !home?.id) return;

    async function loadStats() {
      try {
        const [awayForm, homeForm, awaySeason, homeSeason, h2h, odds] =
          await Promise.all([
            getTeamRecentForm(away.id),
            getTeamRecentForm(home.id),
            getTeamSeasonStats(away.id),
            getTeamSeasonStats(home.id),
            getTeamHeadToHead(away.id, home.id),
            Promise.resolve(
              findOddsForGame(away.name, home.name, oddsMap)
            ),
          ]);

        const awayWins = awayForm.filter((r) => r === 'W').length;
        const homeWins = homeForm.filter((r) => r === 'W').length;

        let awayWinPct = 47;
        let oddsSummary = 'No live odds available';

        if (odds) {
          const awayProb = getImpliedProbability(odds.awayMoneyline) * 100;
          const homeProb = getImpliedProbability(odds.homeMoneyline) * 100;
          const total = awayProb + homeProb;
          awayWinPct = (awayProb / total) * 100;
          oddsSummary = `${away.name} ML ${formatOdds(odds.awayMoneyline)}, ${home.name} ML ${formatOdds(odds.homeMoneyline)}, O/U ${odds.overUnder}, Run Line ${odds.spread > 0 ? '+' : ''}${odds.spread}`;
        } else {
          const awayWinPctRaw =
            awaySeason.hitting?.wins && awaySeason.hitting?.losses
              ? awaySeason.hitting.wins /
                (awaySeason.hitting.wins + awaySeason.hitting.losses)
              : 0.5;
          awayWinPct = awayWinPctRaw * 100 * 0.9 + 5;
        }

        setStats({
          awayForm: awayForm.length ? awayForm : ['—'],
          homeForm: homeForm.length ? homeForm : ['—'],
          awayAvg: awaySeason.hitting?.avg || '—',
          homeAvg: homeSeason.hitting?.avg || '—',
          awayEra: awaySeason.pitching?.era || '—',
          homeEra: homeSeason.pitching?.era || '—',
          awayLast10: `${awayWins}-${awayForm.length - awayWins}`,
          homeLast10: `${homeWins}-${homeForm.length - homeWins}`,
          awayRecord: awaySeason.hitting
            ? `${awaySeason.hitting.wins}-${awaySeason.hitting.losses}`
            : '—',
          homeRecord: homeSeason.hitting
            ? `${homeSeason.hitting.wins}-${homeSeason.hitting.losses}`
            : '—',
          h2h: `${h2h.team1Wins}-${h2h.team2Wins} (${h2h.totalGames} games)`,
          awayWinPct,
          oddsSummary,
        });
      } catch (err) {
        console.error(err);
      }
    }

    loadStats();
  }, [away?.id, home?.id, away?.name, home?.name, oddsMap]);

  const geminiPrompt = useMemo(() => {
    if (!stats || !away?.name || !home?.name) return '';

    return `You are an expert MLB analyst writing for serious baseball fans and sports bettors. Write a detailed game preview for tonight's matchup.

GAME: ${away.name} @ ${home.name}
Venue: ${game.venue?.name || 'TBD'}
Game Time: ${new Date(game.gameDate).toLocaleString('en-US')}

${away.name} (Away):
- Season Record: ${stats.awayRecord}
- Team AVG: ${stats.awayAvg} | Team ERA: ${stats.awayEra}
- Last 10 Games: ${stats.awayLast10}
- Recent Form (oldest→newest): ${stats.awayForm.join('-')}

${home.name} (Home):
- Season Record: ${stats.homeRecord}
- Team AVG: ${stats.homeAvg} | Team ERA: ${stats.homeEra}
- Last 10 Games: ${stats.homeLast10}
- Recent Form (oldest→newest): ${stats.homeForm.join('-')}

Head-to-Head This Season: ${away.name} ${stats.h2h.split(' ')[0]} vs ${home.name}
Live Odds: ${stats.oddsSummary}
Estimated Away Win Probability: ${stats.awayWinPct.toFixed(1)}%

Write a comprehensive preview covering:
1. Starting pitching matchup and bullpen outlook (use your knowledge of current MLB rosters)
2. Key offensive matchups and recent trends
3. Home field advantage and head-to-head history implications
4. Betting angle: moneyline, run line, and over/under lean with reasoning
5. Final score prediction and confidence level

Use specific baseball terminology. Be analytical but readable. 300-400 words.`;
  }, [stats, away?.name, home?.name, game.venue?.name, game.gameDate]);

  return (
    <div
      style={{
        background: 'var(--card)',
        border: `1px solid ${isLive ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--navy2)',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {new Date(game.gameDate).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short',
          })}
        </div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: '4px',
            background: isLive ? 'rgba(232,50,26,0.15)' : 'var(--navy3)',
            color: isLive ? 'var(--accent)' : 'var(--muted)',
          }}
        >
          {isLive
            ? `▶ LIVE — ${game.linescore?.currentInningOrdinal || ''}`
            : isFinal
              ? 'FINAL'
              : 'PREVIEW'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {game.venue?.name || ''}
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              {away?.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              AWAY · {stats?.awayRecord || '...'}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              <StreakBadges results={stats?.awayForm || ['—']} />
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            {isLive || isFinal ? (
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '36px',
                  fontWeight: 700,
                  color: 'var(--accent2)',
                }}
              >
                {awayScore ?? 0} – {homeScore ?? 0}
              </div>
            ) : (
              <div
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '28px',
                  fontWeight: 700,
                  color: 'var(--muted)',
                }}
              >
                VS
              </div>
            )}
          </div>

          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              {home?.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              HOME · {stats?.homeRecord || '...'}
            </div>
            <div style={{ marginTop: '8px' }}>
              <StreakBadges results={stats?.homeForm || ['—']} />
            </div>
          </div>
        </div>

        {!isFinal && stats && (
          <WinProbBar
            awayTeam={away?.abbreviation || 'AWY'}
            homeTeam={home?.abbreviation || 'HME'}
            awayPct={stats.awayWinPct}
          />
        )}

        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            {[
              { label: 'Team AVG', away: stats.awayAvg, home: stats.homeAvg, lowerBetter: false },
              { label: 'Team ERA', away: stats.awayEra, home: stats.homeEra, lowerBetter: true },
              { label: 'Last 10', away: stats.awayLast10, home: stats.homeLast10, lowerBetter: false },
              { label: 'H2H', away: stats.h2h.split(' ')[0], home: stats.h2h.split(' ')[0], lowerBetter: false },
            ].map((stat) => {
              const numA = parseFloat(stat.away);
              const numB = parseFloat(stat.home);
              const awayBetter = stat.lowerBetter ? numA < numB : numA > numB;
              const homeBetter = stat.lowerBetter ? numB < numA : numB > numA;
              return (
                <div key={stat.label} style={{ display: 'contents' }}>
                  <div
                    style={{
                      background: 'var(--navy3)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: '16px',
                      fontWeight: 700,
                      color: awayBetter ? 'var(--accent2)' : 'var(--text)',
                    }}
                  >
                    {stat.away}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {stat.label}
                  </div>
                  <div
                    style={{
                      background: 'var(--navy3)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: '16px',
                      fontWeight: 700,
                      color: homeBetter ? 'var(--accent2)' : 'var(--text)',
                    }}
                  >
                    {stat.home}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {geminiPrompt && (
          <GeminiAnalysis
            prompt={geminiPrompt}
            label="✨ Gemini AI Game Preview"
            loadingLabel="Gemini analyzing matchup..."
            deps={[game.gamePk, stats?.awayWinPct]}
          />
        )}
      </div>
    </div>
  );
}

export default function PreviewPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [games, setGames] = useState<any[]>([]);
  const [oddsMap, setOddsMap] = useState<
    Map<string, import('@/lib/odds-utils').OddsData>
  >(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [schedule, odds] = await Promise.all([
          getSchedule(formatDateForAPI(selectedDate)),
          fetchEspnOdds(selectedDate),
        ]);
        setGames(schedule);
        setOddsMap(odds);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedDate]);

  return (
    <div>
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px 28px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: '4px',
              letterSpacing: '1px',
              display: 'inline-block',
              marginBottom: '10px',
            }}
          >
            {isToday(selectedDate) ? 'TONIGHT' : 'SCHEDULED'}
          </div>
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '36px',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            Game Previews
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '8px' }}>
            {formatDateDisplay(selectedDate)} · Powered by Gemini AI
          </p>
        </div>

        <DateCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--accent2)',
            }}
          >
            {games.length}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Games
          </div>
        </div>
      </div>

      {loading && (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '60px',
            textAlign: 'center',
            color: 'var(--muted)',
          }}
        >
          Loading games...
        </div>
      )}

      {!loading && games.length === 0 && (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '60px',
            textAlign: 'center',
            color: 'var(--muted)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚾</div>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '8px',
            }}
          >
            No games scheduled
          </div>
          <p>Use the calendar to browse other dates.</p>
        </div>
      )}

      {!loading &&
        games.map((game: any) => (
          <GamePreviewCard key={game.gamePk} game={game} oddsMap={oddsMap} />
        ))}
    </div>
  );
}
