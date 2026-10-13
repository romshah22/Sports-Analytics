// The training script uses these same definitions in ml/train.py.
export type TeamSnapshot = {
  avg: number;
  era: number;
  ops: number;
  runDifferential: number;
  recentWinPct: number;
  games: number;
  lastGameDate: string;
};

type ScheduleGame = {
  gamePk: number;
  officialDate: string;
  status: { abstractGameState?: string };
};
export type ScheduleData = { dates?: { date: string; games?: ScheduleGame[] }[] };
type LogSplit = { game: { gamePk: number }; stat: Record<string, unknown>; isWin?: boolean };
export type LogData = { stats?: { group: { displayName: string }; splits?: LogSplit[] }[] };
type GameRecord = {
  gamePk: number;
  date: string;
  hits: number;
  atBats: number;
  walks: number;
  hbp: number;
  sacFlies: number;
  totalBases: number;
  runsFor: number;
  runsAgainst: number;
  earnedRuns: number;
  outs: number;
  win: number;
};

export function completionDates(schedule: ScheduleData): Map<number, string> {
  const dates = new Map<number, string>();
  for (const day of schedule.dates || []) {
    for (const game of day.games || []) {
      if (game.status.abstractGameState !== 'Final') continue;
      // Resumed games cannot contribute completed stats before their later date.
      const completed = day.date > game.officialDate ? day.date : game.officialDate;
      if (!dates.has(game.gamePk) || completed > dates.get(game.gamePk)!) {
        dates.set(game.gamePk, completed);
      }
    }
  }
  return dates;
}

function hasNumbers(stats: Record<string, unknown>, keys: string[]): boolean {
  return keys.every(key => typeof stats[key] === 'number' && Number.isFinite(stats[key]));
}

export function buildSnapshot(logs: LogData, schedule: ScheduleData, before: string, minimumGames = 10): TeamSnapshot {
  const dates = completionDates(schedule);
  const batting = logs.stats?.find(block => block.group.displayName === 'hitting')?.splits || [];
  const pitching = logs.stats?.find(block => block.group.displayName === 'pitching')?.splits || [];
  const pitchers = new Map(pitching.map(row => [row.game.gamePk, row.stat]));
  const unique = new Map<number, GameRecord>();

  for (const row of batting) {
    const id = row.game.gamePk;
    const date = dates.get(id);
    const hit = row.stat;
    const pitch = pitchers.get(id);
    // Exclude the selected day entirely, including an earlier doubleheader game.
    if (!date || date >= before || !pitch || typeof row.isWin !== 'boolean') continue;
    if (!hasNumbers(hit, ['hits', 'atBats', 'baseOnBalls', 'hitByPitch', 'sacFlies', 'totalBases', 'runs'])) continue;
    if (!hasNumbers(pitch, ['earnedRuns', 'outs', 'runs'])) continue;
    if (Number(hit.atBats) <= 0 || Number(pitch.outs) <= 0) continue;
    unique.set(id, {
      gamePk: id, date,
      hits: Number(hit.hits), atBats: Number(hit.atBats), walks: Number(hit.baseOnBalls),
      hbp: Number(hit.hitByPitch), sacFlies: Number(hit.sacFlies), totalBases: Number(hit.totalBases),
      runsFor: Number(hit.runs), runsAgainst: Number(pitch.runs),
      earnedRuns: Number(pitch.earnedRuns), outs: Number(pitch.outs), win: Number(row.isWin)
    });
  }

  const games = [...unique.values()].sort((a, b) => a.date.localeCompare(b.date) || a.gamePk - b.gamePk);
  if (games.length < minimumGames) {
    throw new Error(`Prediction needs at least ${minimumGames} completed games per team this season before the selected date.`);
  }
  const sum = (key: keyof Omit<GameRecord, 'date'>) => games.reduce((total, game) => total + game[key], 0);
  const atBats = sum('atBats');
  const obp = (sum('hits') + sum('walks') + sum('hbp')) / (atBats + sum('walks') + sum('hbp') + sum('sacFlies'));
  return {
    avg: sum('hits') / atBats,
    // Innings are measured in outs: 8.2 means 26 outs, not 8.2 decimal innings.
    era: 27 * sum('earnedRuns') / sum('outs'),
    ops: obp + sum('totalBases') / atBats,
    runDifferential: (sum('runsFor') - sum('runsAgainst')) / games.length,
    recentWinPct: games.slice(-10).reduce((total, game) => total + game.win, 0) / 10,
    games: games.length,
    lastGameDate: games[games.length - 1].date
  };
}

export function featureVector(home: TeamSnapshot, away: TeamSnapshot): number[] {
  return [home.avg - away.avg, home.era - away.era, home.ops - away.ops,
    home.runDifferential - away.runDifferential, home.recentWinPct - away.recentWinPct];
}
