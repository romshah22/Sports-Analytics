'use client';

import { useState, useEffect } from 'react';
import { getAllPlayers, getPlayerStats } from '@/lib/mlb-api';
import Link from 'next/link';

export default function ComparePage() {
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [player1, setPlayer1] = useState<any>(null);
  const [player2, setPlayer2] = useState<any>(null);
  const [stats1, setStats1] = useState<any[]>([]);
  const [stats2, setStats2] = useState<any[]>([]);
  const [season, setSeason] = useState(2026);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const players = await getAllPlayers();
      setAllPlayers(players);
      setLoading(false);
    }
    load();
  }, []);

  async function selectPlayer(playerObj: any, slot: 1 | 2) {
    if (slot === 1) {
      setPlayer1(playerObj);
      const stats = await getPlayerStats(playerObj.id, season);
      setStats1(stats);
    } else {
      setPlayer2(playerObj);
      const stats = await getPlayerStats(playerObj.id, season);
      setStats2(stats);
    }
  }

  const hitting1 = stats1.find((s: any) => s.group?.displayName === 'hitting')?.splits?.[0]?.stat;
  const hitting2 = stats2.find((s: any) => s.group?.displayName === 'hitting')?.splits?.[0]?.stat;
  const pitching1 = stats1.find((s: any) => s.group?.displayName === 'pitching')?.splits?.[0]?.stat;
  const pitching2 = stats2.find((s: any) => s.group?.displayName === 'pitching')?.splits?.[0]?.stat;

  // Determine if we're comparing hitters or pitchers
  const isBatters = !!(hitting1 || hitting2);
  const isPitchers = !!(pitching1 || pitching2);

  function getInitials(name: string) {
    return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2);
  }

  function StatComparison({ label, val1, val2 }: { label: string; val1: any; val2: any }) {
    const num1 = parseFloat(val1) || 0;
    const num2 = parseFloat(val2) || 0;
    const isBetter1 = num1 > num2;
    const isBetter2 = num2 > num1;

    return (
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        gap: '12px', alignItems: 'center', marginBottom: '12px',
      }}>
        <div style={{
          background: isBetter1 ? 'rgba(74,222,128,0.15)' : 'var(--navy3)',
          borderRadius: '8px', padding: '12px', textAlign: 'right',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px',
          fontWeight: 700, color: isBetter1 ? '#4ade80' : '#fff',
        }}>
          {val1}
        </div>
        <div style={{
          fontSize: '11px', color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '0.5px',
          fontWeight: 600, whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
        <div style={{
          background: isBetter2 ? 'rgba(74,222,128,0.15)' : 'var(--navy3)',
          borderRadius: '8px', padding: '12px', textAlign: 'left',
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px',
          fontWeight: 700, color: isBetter2 ? '#4ade80' : '#fff',
        }}>
          {val2}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '36px', fontWeight: 700, marginBottom: '8px',
      }}>
        Player Comparison
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>
        Compare any two players side-by-side. Stats highlighted in green show who's better.
      </p>

      {loading && (
        <p style={{ color: 'var(--muted)' }}>Loading player data...</p>
      )}

      {/* Player Selection */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px',
      }}>
        {/* Player 1 */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '20px',
        }}>
          <div style={{
            fontSize: '11px', color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            marginBottom: '12px', fontWeight: 600,
          }}>
            Select Player 1
          </div>
          {!player1 ? (
            <select
              onChange={(e) => {
                const p = allPlayers.find(pl => pl.id === parseInt(e.target.value));
                if (p) selectPlayer(p, 1);
              }}
              style={{
                width: '100%', padding: '10px',
                background: 'var(--navy3)', color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '8px', fontSize: '13px',
                fontFamily: "'Barlow', sans-serif", cursor: 'pointer',
              }}
            >
              <option value="">Choose a player...</option>
              {allPlayers.slice(0, 50).map(p => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.currentTeam?.abbreviation})
                </option>
              ))}
            </select>
          ) : (
            <div>
              <div style={{
                background: 'rgba(245,166,35,0.15)', border: '1px solid var(--accent2)',
                borderRadius: '8px', padding: '12px', marginBottom: '10px',
              }}>
                <div style={{ fontWeight: 600, fontSize: '16px' }}>
                  {player1.fullName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  {player1.currentTeam?.name}
                </div>
              </div>
              <button
                onClick={() => setPlayer1(null)}
                style={{
                  width: '100%', padding: '8px',
                  background: 'var(--navy3)', color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                }}
              >
                Change Player
              </button>
            </div>
          )}
        </div>

        {/* Player 2 */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '20px',
        }}>
          <div style={{
            fontSize: '11px', color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            marginBottom: '12px', fontWeight: 600,
          }}>
            Select Player 2
          </div>
          {!player2 ? (
            <select
              onChange={(e) => {
                const p = allPlayers.find(pl => pl.id === parseInt(e.target.value));
                if (p) selectPlayer(p, 2);
              }}
              style={{
                width: '100%', padding: '10px',
                background: 'var(--navy3)', color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '8px', fontSize: '13px',
                fontFamily: "'Barlow', sans-serif", cursor: 'pointer',
              }}
            >
              <option value="">Choose a player...</option>
              {allPlayers.slice(0, 50).map(p => (
                <option key={p.id} value={p.id} disabled={p.id === player1?.id}>
                  {p.fullName} ({p.currentTeam?.abbreviation})
                </option>
              ))}
            </select>
          ) : (
            <div>
              <div style={{
                background: 'rgba(232,50,26,0.15)', border: '1px solid var(--accent)',
                borderRadius: '8px', padding: '12px', marginBottom: '10px',
              }}>
                <div style={{ fontWeight: 600, fontSize: '16px' }}>
                  {player2.fullName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  {player2.currentTeam?.name}
                </div>
              </div>
              <button
                onClick={() => setPlayer2(null)}
                style={{
                  width: '100%', padding: '8px',
                  background: 'var(--navy3)', color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                }}
              >
                Change Player
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Season Selector */}
      {player1 && player2 && (
        <div style={{
          display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center',
        }}>
          <label style={{
            fontSize: '12px', color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600,
          }}>
            Season:
          </label>
          {[2026, 2025, 2024].map(yr => (
            <button
              key={yr}
              onClick={() => setSeason(yr)}
              style={{
                padding: '6px 14px', borderRadius: '6px',
                fontSize: '13px', fontWeight: 600,
                border: season === yr ? 'none' : '1px solid var(--border)',
                background: season === yr ? 'var(--accent2)' : 'var(--navy3)',
                color: season === yr ? '#000' : 'var(--muted)',
                cursor: 'pointer', fontFamily: "'Barlow', sans-serif",
              }}
            >
              {yr}
            </button>
          ))}
        </div>
      )}

      {/* Comparison */}
      {player1 && player2 && (hitting1 || hitting2 || pitching1 || pitching2) && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '24px',
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '18px', fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            marginBottom: '20px',
          }}>
            {season} Season Comparison
          </div>

          {/* Batting Stats */}
          {(hitting1 || hitting2) && (
            <div>
              <div style={{
                fontSize: '14px', fontWeight: 600, color: '#fff',
                marginBottom: '16px', fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                Batting Stats
              </div>
              <StatComparison label="AVG" val1={hitting1?.avg} val2={hitting2?.avg} />
              <StatComparison label="HR" val1={hitting1?.homeRuns} val2={hitting2?.homeRuns} />
              <StatComparison label="RBI" val1={hitting1?.rbi} val2={hitting2?.rbi} />
              <StatComparison label="OPS" val1={hitting1?.ops} val2={hitting2?.ops} />
              <StatComparison label="OBP" val1={hitting1?.obp} val2={hitting2?.obp} />
              <StatComparison label="SLG" val1={hitting1?.slg} val2={hitting2?.slg} />
              <StatComparison label="K" val1={hitting1?.strikeOuts} val2={hitting2?.strikeOuts} />
              <StatComparison label="BB" val1={hitting1?.baseOnBalls} val2={hitting2?.baseOnBalls} />
            </div>
          )}

          {/* Pitching Stats */}
          {(pitching1 || pitching2) && (
            <div style={{ marginTop: hitting1 || hitting2 ? '24px' : 0 }}>
              <div style={{
                fontSize: '14px', fontWeight: 600, color: '#fff',
                marginBottom: '16px', fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                Pitching Stats
              </div>
              <StatComparison label="ERA" val1={pitching1?.era} val2={pitching2?.era} />
              <StatComparison label="K" val1={pitching1?.strikeOuts} val2={pitching2?.strikeOuts} />
              <StatComparison label="WHIP" val1={pitching1?.whip} val2={pitching2?.whip} />
              <StatComparison label="W" val1={pitching1?.wins} val2={pitching2?.wins} />
              <StatComparison label="L" val1={pitching1?.losses} val2={pitching2?.losses} />
              <StatComparison label="IP" val1={pitching1?.inningsPitched} val2={pitching2?.inningsPitched} />
              <StatComparison label="BB" val1={pitching1?.baseOnBalls} val2={pitching2?.baseOnBalls} />
              <StatComparison label="GS" val1={pitching1?.gamesStarted} val2={pitching2?.gamesStarted} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}