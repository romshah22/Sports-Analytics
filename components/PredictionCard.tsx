'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { TeamSnapshot } from '@/lib/pregame-features';

type Prediction = {
  home: string;
  away: string;
  homeProbability: number;
  awayProbability: number;
  date: string;
  featureSeason: number;
  inputs: { home: TeamSnapshot; away: TeamSnapshot };
};

export default function PredictionCard({ gamePk }: { gamePk: number }) {
  const [data, setData] = useState<Prediction | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    fetch(`/api/predict?gamePk=${gamePk}`)
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Prediction unavailable');
        if (active) setData(result);
      })
      .catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [gamePk]);

  if (error) return <section className="panel"><h3>Pregame prediction</h3><p role="status">{error}</p></section>;
  if (!data) return <section className="panel"><h3>Pregame prediction</h3><p role="status" className="muted">Calculating from this season’s results…</p></section>;

  const home = data.inputs.home;
  const away = data.inputs.away;
  const record = (team: TeamSnapshot) => `${Math.round(team.recentWinPct * 10)}–${10 - Math.round(team.recentWinPct * 10)}`;
  const stats = [
    ['Batting average', away.avg.toFixed(3), home.avg.toFixed(3)],
    ['ERA', away.era.toFixed(2), home.era.toFixed(2)],
    ['OPS', away.ops.toFixed(3), home.ops.toFixed(3)],
    ['Run differential / game', away.runDifferential.toFixed(2), home.runDifferential.toFixed(2)],
    ['Last 10 games', record(away), record(home)]
  ];

  return <section className="panel">
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <h3 style={{ margin: 0 }}>Pregame win probability</h3>
      <span className="muted" style={{ fontSize: 13 }}>{data.featureSeason} season + recent form</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, margin: '22px 0 14px' }}>
      <div><div className="muted" style={{ fontSize: 12 }}>AWAY</div><strong>{data.away}</strong><div style={{ fontSize: 36, fontWeight: 700, color: 'var(--accent)' }}>{(data.awayProbability * 100).toFixed(1)}%</div></div>
      <div style={{ textAlign: 'right' }}><div className="muted" style={{ fontSize: 12 }}>HOME</div><strong>{data.home}</strong><div style={{ fontSize: 36, fontWeight: 700, color: 'var(--accent2)' }}>{(data.homeProbability * 100).toFixed(1)}%</div></div>
    </div>
    <div role="img" aria-label={`${data.away}: ${(data.awayProbability * 100).toFixed(1)} percent. ${data.home}: ${(data.homeProbability * 100).toFixed(1)} percent.`} style={{ display: 'flex', height: 10, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ width: `${data.awayProbability * 100}%`, background: 'var(--accent)' }} />
      <div style={{ flex: 1, background: 'var(--accent2)' }} />
    </div>
    <p className="muted" style={{ fontSize: 13 }}>Uses completed games before {data.date}. This estimate does not change with the live score.</p>
    <details>
      <summary style={{ cursor: 'pointer' }}>Matchup stats used</summary>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', fontSize: 14, marginTop: 12 }}>
        <thead><tr><th style={{ textAlign: 'left' }}>Input</th><th>{data.away}</th><th>{data.home}</th></tr></thead>
        <tbody>{stats.map(([label, left, right]) => <tr key={label}><td style={{ padding: '8px 0' }}>{label}</td><td style={{ textAlign: 'center' }}>{left}</td><td style={{ textAlign: 'center' }}>{right}</td></tr>)}</tbody>
      </table></div>
      <p className="muted" style={{ fontSize: 12 }}>{data.away}: {away.games} games through {away.lastGameDate}. {data.home}: {home.games} games through {home.lastGameDate}. Source: MLB.</p>
    </details>
    <Link href="/model" style={{ display: 'inline-block', marginTop: 14, fontSize: 13, color: 'var(--accent2)' }}>How the model works &amp; evaluation →</Link>
  </section>;
}
