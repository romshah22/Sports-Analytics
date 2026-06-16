'use client';

import { useState, useEffect } from 'react';

interface GameAnalysisProps {
  awayTeam: string;
  homeTeam: string;
  awayStats: { avg: string; era: string; recent: string };
  homeStats: { avg: string; era: string; recent: string };
}

export default function GameAnalysis({ awayTeam, homeTeam, awayStats, homeStats }: GameAnalysisProps) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function generateAnalysis() {
      setLoading(true);
      try {
        const prompt = `You are a professional baseball analyst. Provide a 2-3 sentence game preview for tonight's MLB game.

${awayTeam} (Away):
- Team Batting AVG: ${awayStats.avg}
- Team ERA: ${awayStats.era}
- Last 10 games: ${awayStats.recent}

${homeTeam} (Home):
- Team Batting AVG: ${homeStats.avg}
- Team ERA: ${homeStats.era}
- Last 10 games: ${homeStats.recent}

Give a concise prediction with key matchup insights. Keep it under 150 words.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
            }),
          }
        );

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate analysis.';
        setAnalysis(text);
      } catch (err) {
        console.error('Error generating analysis:', err);
        setAnalysis('Analysis unavailable.');
      } finally {
        setLoading(false);
      }
    }

    generateAnalysis();
  }, [awayTeam, homeTeam, awayStats, homeStats]);

  return (
    <div style={{
      background: 'var(--navy3)', borderLeft: '3px solid var(--accent2)',
      borderRadius: '8px', padding: '16px', marginTop: '16px',
    }}>
      <div style={{
        color: 'var(--accent2)', fontSize: '11px', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: loading ? 'orange' : 'var(--accent2)',
          animation: loading ? 'pulse 1.5s infinite' : 'none',
        }} />
        {loading ? 'Gemini AI Analyzing...' : '✨ AI Game Analysis'}
      </div>
      <p style={{
        color: 'var(--text)', fontSize: '13px', lineHeight: 1.7,
        margin: 0, fontStyle: 'italic',
      }}>
        {analysis || 'Generating analysis...'}
      </p>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}