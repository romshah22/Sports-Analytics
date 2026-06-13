// app/standings/page.tsx
// This is a Server Component — no 'use client' needed because
// we're just fetching data and displaying it, no user interaction.

import { getStandings } from '@/lib/mlb-api';

// Helper to get division name from the API data
function getDivisionName(div: any) {
  return div?.division?.name || 'Unknown Division';
}

export default async function StandingsPage() {
  let records: any[] = [];

  try {
    records = await getStandings();
  } catch (err) {
    console.error(err);
  }

  // Separate AL and NL — leagueId 103 = AL, 104 = NL
  const al = records.filter((r) => r.league?.id === 103);
  const nl = records.filter((r) => r.league?.id === 104);

  return (
    <div>
      <h1 style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '36px', fontWeight: 700, marginBottom: '8px',
      }}>
        2025 MLB Standings
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '28px', fontSize: '14px' }}>
        Live standings pulled from the official MLB Stats API.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* American League */}
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '20px', fontWeight: 700,
            color: 'var(--accent2)', marginBottom: '16px',
            paddingBottom: '8px', borderBottom: '2px solid var(--accent2)',
          }}>
            American League
          </div>
          {al.map((division) => (
            <DivisionTable key={division.division?.id} division={division} />
          ))}
        </div>

        {/* National League */}
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '20px', fontWeight: 700,
            color: 'var(--accent)', marginBottom: '16px',
            paddingBottom: '8px', borderBottom: '2px solid var(--accent)',
          }}>
            National League
          </div>
          {nl.map((division) => (
            <DivisionTable key={division.division?.id} division={division} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DivisionTable({ division }: { division: any }) {
  const teams = division.teamRecords || [];

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '16px', marginBottom: '16px',
    }}>
      {/* Division Name */}
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '13px', fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: '12px', paddingBottom: '8px',
        borderBottom: '1px solid var(--border)',
      }}>
        {getDivisionName(division)}
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {['Team', 'W', 'L', 'PCT', 'GB', 'L10', 'Strk'].map((h) => (
              <th key={h} style={{
                color: 'var(--muted)', fontWeight: 500,
                textAlign: h === 'Team' ? 'left' : 'right',
                padding: '4px 8px', fontSize: '11px',
                textTransform: 'uppercase', letterSpacing: '0.3px',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((t: any, i: number) => {
            const streak = t.streak?.streakCode || '—';
            const isWinStreak = streak.startsWith('W');
            const isFirst = i === 0;

            return (
              <tr key={t.team?.id}
                style={{ background: isFirst ? 'rgba(245,166,35,0.05)' : 'transparent' }}
              >
                <td style={{
                  padding: '8px 8px',
                  borderBottom: '1px solid rgba(30,58,95,.4)',
                  fontWeight: isFirst ? 600 : 400,
                  color: isFirst ? 'var(--accent2)' : 'var(--text)',
                }}>
                  {i + 1}. {t.team?.name}
                </td>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(30,58,95,.4)', textAlign: 'right' }}>
                  {t.wins}
                </td>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(30,58,95,.4)', textAlign: 'right' }}>
                  {t.losses}
                </td>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(30,58,95,.4)', textAlign: 'right' }}>
                  {t.winningPercentage}
                </td>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(30,58,95,.4)', textAlign: 'right', color: 'var(--muted)' }}>
                  {t.gamesBack === '0' ? '—' : t.gamesBack}
                </td>
                <td style={{ padding: '8px 8px', borderBottom: '1px solid rgba(30,58,95,.4)', textAlign: 'right' }}>
                  {t.records?.splitRecords?.find((s: any) => s.type === 'lastTen')?.wins ?? '—'}
                  -
                  {t.records?.splitRecords?.find((s: any) => s.type === 'lastTen')?.losses ?? '—'}
                </td>
                <td style={{
                  padding: '8px 8px',
                  borderBottom: '1px solid rgba(30,58,95,.4)',
                  textAlign: 'right',
                  color: isWinStreak ? '#4ade80' : 'var(--accent)',
                  fontWeight: 600,
                }}>
                  {streak}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}