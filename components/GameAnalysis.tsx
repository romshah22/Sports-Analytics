'use client';

import { useState, useEffect } from 'react';
import GeminiAnalysis from './GeminiAnalysis';

interface GameAnalysisProps {
  awayTeam: string;
  homeTeam: string;
  awayStats: { avg: string; era: string; recent: string };
  homeStats: { avg: string; era: string; recent: string };
}

export default function GameAnalysis({
  awayTeam,
  homeTeam,
  awayStats,
  homeStats,
}: GameAnalysisProps) {
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    setPrompt(`You are a professional baseball analyst. Provide a detailed game preview for tonight's MLB game.

${awayTeam} (Away):
- Team Batting AVG: ${awayStats.avg}
- Team ERA: ${awayStats.era}
- Last 10 games: ${awayStats.recent}

${homeTeam} (Home):
- Team Batting AVG: ${homeStats.avg}
- Team ERA: ${homeStats.era}
- Last 10 games: ${homeStats.recent}

Cover starting pitching matchups, recent form, bullpen outlook, and betting angles. 300-400 words.`);
  }, [awayTeam, homeTeam, awayStats, homeStats]);

  if (!prompt) return null;

  return (
    <GeminiAnalysis
      prompt={prompt}
      label="✨ Gemini AI Game Analysis"
      loadingLabel="Gemini AI Analyzing..."
      deps={[awayTeam, homeTeam]}
    />
  );
}
