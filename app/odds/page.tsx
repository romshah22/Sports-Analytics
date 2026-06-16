'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSchedule } from '@/lib/mlb-api';
import {
  fetchEspnOdds,
  findOddsForGame,
  formatOdds,
  getImpliedProbability,
  type OddsData,
} from '@/lib/odds-utils';
import GeminiAnalysis from '@/components/GeminiAnalysis';
import DateCalendar from '@/components/DateCalendar';

const ODDS_GUIDE = [
  {
    title: 'Moneyline (ML)',
    desc: 'Pick the outright winner — no spread. Favorites show negative odds (e.g. -150 means bet $150 to win $100). Underdogs show positive odds (e.g. +130 means bet $100 to win $130). Best for backing a team to win regardless of margin.',
  },
  {
    title: 'Run Line (Spread)',
    desc: 'Baseball\'s point spread, almost always ±1.5 runs. The favorite must win by 2+ runs to cover -1.5; the underdog covers +1.5 by losing by 1 or winning outright. Higher variance than moneyline but better payouts on favorites.',
  },
  {
    title: 'Over/Under (Total)',
    desc: 'Bet on combined runs scored by both teams. If the line is 8.5, "Over" wins if 9+ runs are scored; "Under" wins if 8 or fewer. Weather, park factors, and pitching matchups heavily influence totals.',
  },
  {
    title: 'First 5 Innings (F5)',
    desc: 'Same markets as full game but settled after 5 innings. Isolates starting pitcher performance and removes bullpen variance. Popular when a team has a pitching edge but a weak bullpen.',
  },
  {
    title: 'Player Props',
    desc: 'Bets on individual outcomes: strikeouts, hits, home runs, total bases, etc. Useful when you have an edge on a specific matchup (e.g. a power hitter vs a fly-ball pitcher).',
  },
  {
    title: 'Implied Probability',
    desc: 'Convert American odds to win %: for -150, implied prob = 150/(150+100) = 60%. Compare implied prob to your own model to find value. The vig (juice) means both sides sum to >100%.',
  },
];

function formatDateForAPI(d: Date) {
  return d.toISOString().split('T')[0];
}

function OddsGameCard({
  game,
  oddsMap,
  isSelected,
  onToggle,
}: {
  game: any;
  oddsMap: Map<string, OddsData>;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const away = game.teams?.away?.team;
  const home = game.teams?.home?.team;
  const gameOdds = findOddsForGame(away?.name || '', home?.name || '', oddsMap);

  const awayProbNum = gameOdds
    ? (getImpliedProbability(gameOdds.awayMoneyline) /
        (getImpliedProbability(gameOdds.awayMoneyline) +
          getImpliedProbability(gameOdds.homeMoneyline))) *
      100
    : null;
  const homeProbNum = awayProbNum !== null ? 100 - awayProbNum : null;

  const geminiPrompt = useMemo(() => {
    if (!isSelected || !gameOdds || !away?.name || !home?.name) return '';

    const awayImplied = (getImpliedProbability(gameOdds.awayMoneyline) * 100).toFixed(1);
    const homeImplied = (getImpliedProbability(gameOdds.homeMoneyline) * 100).toFixed(1);

    return `You are an expert MLB betting analyst. Analyze this game for serious baseball gamblers.

GAME: ${away.name} @ ${home.name}
Venue: ${game.venue?.name || 'TBD'}

CURRENT LINES:
- ${away.name} Moneyline: ${formatOdds(gameOdds.awayMoneyline)} (Implied Win Prob: ${awayImplied}%)
- ${home.name} Moneyline: ${formatOdds(gameOdds.homeMoneyline)} (Implied Win Prob: ${homeImplied}%)
- Run Line: ${gameOdds.spread > 0 ? '+' : ''}${gameOdds.spread}
- Over/Under: ${gameOdds.overUnder} runs

Provide a detailed betting analysis covering:
1. Which side offers value on the moneyline and why
2. Run line recommendation — when to take ±1.5 vs ML
3. Over/under lean based on pitching, park factors, and recent scoring trends
4. Key situational factors (rest days, travel, bullpen fatigue, weather if relevant)
5. Your top bet recommendation with confidence (1-10) and a predicted final score

Use your knowledge of current MLB teams and rosters. Be specific and actionable. 250-350 words.`;
  }, [isSelected, gameOdds, away?.name, home?.name, game.venue?.name]);

  return (
    <div
      style={{
        background: 'var(--card)',
        border: `1px solid ${isSelected ? 'var(--accent2)' : 'var(--border)'}`,
        borderRadius: '12px',
        marginBottom: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={onToggle}
        style={{
          padding: '20px',
          cursor: 'pointer',
          background: isSelected ? 'var(--navy3)' : 'transparent',
          transition: 'background .15s',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr auto',
            gap: '20px',
            alignItems: 'center',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '18px',
                fontWeight: 700,
                marginBottom: '4px',
              }}
            >
              {away?.name}
            </div>
            {gameOdds ? (
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent2)' }}>
                {formatOdds(gameOdds.awayMoneyline)}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>No odds</div>
            )}
          </div>

          <div style={{ minWidth: '140px' }}>
            {awayProbNum !== null && homeProbNum !== null ? (
              <>
                <div
                  style={{
                    height: '24px',
                    borderRadius: '12px',
                    background: 'var(--navy2)',
                    display: 'flex',
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      width: `${awayProbNum}%`,
                      background: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#fff',
                    }}
                  >
                    {awayProbNum.toFixed(0)}%
                  </div>
                  <div
                    style={{
                      width: `${homeProbNum}%`,
                      background: 'var(--accent2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#000',
                    }}
                  >
                    {homeProbNum.toFixed(0)}%
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--muted)',
                    textAlign: 'center',
                    marginTop: '4px',
                  }}
                >
                  Win Prob (no-vig)
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                Odds unavailable
              </div>
            )}
          </div>

          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '18px',
                fontWeight: 700,
                marginBottom: '4px',
              }}
            >
              {home?.name}
            </div>
            {gameOdds && (
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent2)' }}>
                {formatOdds(gameOdds.homeMoneyline)}
              </div>
            )}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--muted)', minWidth: '60px', textAlign: 'center' }}>
            {isSelected ? '▼' : '▶'}
          </div>
        </div>

        <div
          style={{
            fontSize: '11px',
            color: 'var(--muted)',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span>O/U: {gameOdds?.overUnder ?? '—'}</span>
          <span>
            Run Line:{' '}
            {gameOdds
              ? `${gameOdds.spread > 0 ? '+' : ''}${gameOdds.spread.toFixed(1)}`
              : '—'}
          </span>
          <span>
            {new Date(game.gameDate).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {isSelected && gameOdds && (
        <div
          style={{
            background: 'var(--navy2)',
            borderTop: '1px solid var(--border)',
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {[
              { label: `${away?.name} ML`, value: formatOdds(gameOdds.awayMoneyline), sub: `${(getImpliedProbability(gameOdds.awayMoneyline) * 100).toFixed(1)}% implied` },
              { label: `${home?.name} ML`, value: formatOdds(gameOdds.homeMoneyline), sub: `${(getImpliedProbability(gameOdds.homeMoneyline) * 100).toFixed(1)}% implied` },
              { label: 'Over/Under', value: String(gameOdds.overUnder), sub: 'Total runs' },
              { label: 'Run Line', value: `${gameOdds.spread > 0 ? '+' : ''}${gameOdds.spread.toFixed(1)}`, sub: `${home?.name} side` },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--accent2)',
                  }}
                >
                  {item.value}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                  {item.sub}
                </div>
              </div>
            ))}
          </div>

          {geminiPrompt && (
            <GeminiAnalysis
              prompt={geminiPrompt}
              label="✨ Gemini AI Betting Analysis"
              loadingLabel="Gemini analyzing lines..."
              deps={[game.gamePk, gameOdds.awayMoneyline]}
            />
          )}
        </div>
      )}

      {isSelected && !gameOdds && (
        <div
          style={{
            background: 'var(--navy2)',
            borderTop: '1px solid var(--border)',
            padding: '20px',
            color: 'var(--muted)',
            fontSize: '13px',
          }}
        >
          No live odds available for this game yet. Lines typically post 12–24 hours before first pitch.
        </div>
      )}
    </div>
  );
}

export default function OddsPage() {
  const [date, setDate] = useState(new Date());
  const [games, setGames] = useState<any[]>([]);
  const [oddsMap, setOddsMap] = useState<Map<string, OddsData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [schedule, odds] = await Promise.all([
          getSchedule(formatDateForAPI(date)),
          fetchEspnOdds(date),
        ]);
        setGames(schedule);
        setOddsMap(odds);
        setSelectedGame(null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [date]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '36px',
              fontWeight: 700,
              marginBottom: '8px',
            }}
          >
            MLB Odds
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Live lines from ESPN · Gemini AI betting analysis · Powered by Google Gemini
          </p>
        </div>
        <DateCalendar selectedDate={date} onSelectDate={setDate} />
      </div>

      {/* Odds Education */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          marginBottom: '24px',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => setShowGuide(!showGuide)}
          style={{
            width: '100%',
            padding: '16px 20px',
            background: 'var(--navy2)',
            border: 'none',
            borderBottom: showGuide ? '1px solid var(--border)' : 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '16px',
            fontWeight: 700,
          }}
        >
          <span>📚 Baseball Betting Guide — Types of Odds Explained</span>
          <span style={{ color: 'var(--muted)' }}>{showGuide ? '▼' : '▶'}</span>
        </button>
        {showGuide && (
          <div
            style={{
              padding: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {ODDS_GUIDE.map((item) => (
              <div
                key={item.title}
                style={{
                  background: 'var(--navy3)',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '14px',
                    color: 'var(--accent2)',
                    marginBottom: '6px',
                  }}
                >
                  {item.title}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px' }}>
          Loading odds...
        </p>
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
          No games scheduled for this date.
        </div>
      )}

      {!loading &&
        games.map((game) => (
          <OddsGameCard
            key={game.gamePk}
            game={game}
            oddsMap={oddsMap}
            isSelected={selectedGame === game.gamePk.toString()}
            onToggle={() =>
              setSelectedGame(
                selectedGame === game.gamePk.toString()
                  ? null
                  : game.gamePk.toString()
              )
            }
          />
        ))}
    </div>
  );
}
