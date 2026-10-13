import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchChecked, ProviderError } from './request';
import { buildSnapshot, featureVector, type LogData, type ScheduleData } from './pregame-features';

export type Model = {
  version: number;
  trainedAt: string;
  features: string[];
  minimumGames: number;
  mean: number[];
  scale: number[];
  coefficients: number[];
  intercept: number;
  metrics: {
    testSeason: number;
    trainSeasons: number[];
    trainGames: number;
    testGames: number;
    totalTestSeasonGames: number;
    accuracy: number;
    homeAlwaysBaseline: number;
    brierScore: number;
    logLoss: number;
    method: string;
  };
};

export async function readModel(): Promise<Model> {
  const file = path.join(process.cwd(), 'models/win-model.json');
  const model: Model = JSON.parse(await readFile(file, 'utf8'));
  if (model.version !== 2) throw new Error('Please install the updated model files.');
  return model;
}

export function score(model: Pick<Model, 'mean' | 'scale' | 'coefficients' | 'intercept'>, features: number[]) {
  if (features.length !== model.coefficients.length || features.some(value => !Number.isFinite(value))) {
    throw new Error('Invalid model inputs');
  }
  const weightedSum = features.reduce((total, value, index) => {
    const scaled = (value - model.mean[index]) / model.scale[index];
    return total + scaled * model.coefficients[index];
  }, model.intercept);
  return 1 / (1 + Math.exp(-weightedSum));
}

async function mlbJSON<T>(endpoint: string, optionalPlayoffLog = false): Promise<T> {
  try {
    const response = await fetchChecked(`https://statsapi.mlb.com/api/v1/${endpoint}`, {
      next: { revalidate: 300 }
    });
    return response.json();
  } catch (error) {
    // Teams can skip a playoff round or never reach it; MLB returns 404 for that log.
    if (optionalPlayoffLog && error instanceof ProviderError && error.status === 404) {
      return { stats: [] } as T;
    }
    throw error;
  }
}

type Game = {
  gamePk: number;
  officialDate: string;
  season: string;
  gameType: string;
  teams: { home: { team: { id: number; name: string } }; away: { team: { id: number; name: string } } };
};

export async function predictGame(gamePk: number) {
  const [model, data] = await Promise.all([
    readModel(),
    mlbJSON<{ dates?: { games: Game[] }[] }>(`schedule?gamePk=${gamePk}`)
  ]);
  const game = data.dates?.[0]?.games?.[0];
  if (!game) throw new Error('Game not found');
  const year = Number(game.season);
  if (year <= Math.max(...model.metrics.trainSeasons)) {
    throw new Error('Select a season after the model’s training period (2025 or later).');
  }
  if (!['R', 'F', 'D', 'L', 'W'].includes(game.gameType)) {
    throw new Error('Predictions are available for regular-season and postseason MLB games.');
  }
  const homeTeam = game.teams.home.team;
  const awayTeam = game.teams.away.team;
  const postseason = game.gameType !== 'R';
  const gameTypes = postseason ? ['R', 'F', 'D', 'L', 'W'] : ['R'];
  async function teamLogs(teamId: number): Promise<LogData> {
    // MLB's team stats endpoint takes one game type per request.
    const responses = await Promise.all(gameTypes.map(type =>
      mlbJSON<LogData>(`teams/${teamId}/stats?stats=gameLog&group=hitting,pitching&season=${year}&gameType=${type}`, type !== 'R')
    ));
    return { stats: ['hitting', 'pitching'].map(group => ({
      group: { displayName: group },
      splits: responses.flatMap(response => response.stats?.find(block => block.group.displayName === group)?.splits || [])
    })) };
  }
  const [schedule, homeLogs, awayLogs] = await Promise.all([
    mlbJSON<ScheduleData>(`schedule?sportId=1&season=${year}&gameTypes=${gameTypes.join(',')}`),
    teamLogs(homeTeam.id),
    teamLogs(awayTeam.id)
  ]);
  const home = buildSnapshot(homeLogs, schedule, game.officialDate, model.minimumGames);
  const away = buildSnapshot(awayLogs, schedule, game.officialDate, model.minimumGames);
  const homeProbability = score(model, featureVector(home, away));
  return {
    gamePk, date: game.officialDate, home: homeTeam.name, away: awayTeam.name,
    homeProbability, awayProbability: 1 - homeProbability,
    featureSeason: year, inputs: { home, away }, metrics: model.metrics, trainedAt: model.trainedAt,
    kind: 'Pregame win probability',
    dataSource: 'MLB Stats API',
    dataCutoff: 'Completed current-season games before the selected date',
    postseason,
    limitations: 'Uses current-season team AVG, ERA, OPS, run differential and last-10 win rate, plus learned home advantage. Does not explicitly model starting pitchers, injuries, lineups, odds or in-game events. Historical predictions use retrospectively retrieved MLB records. Evaluation covers regular-season games; postseason performance has not been validated.'
  };
}
