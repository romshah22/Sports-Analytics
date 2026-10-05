import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchChecked } from './request';
type Model={version:number;trainedAt:string;features:string[];mean:number[];scale:number[];coefficients:number[];intercept:number;metrics:{testSeason:number;trainSeasons:number[];trainGames:number;testGames:number;accuracy:number;homeAlwaysBaseline:number;brierScore:number;logLoss:number;method:string};teamStats:Record<string,Record<string,{avg:number;era:number}>>};
export async function readModel():Promise<Model>{try{return JSON.parse(await readFile(path.join(process.cwd(),'models/win-model.json'),'utf8'));}catch{throw new Error('Model unavailable. Run python ml/train.py first.');}}
export function score(model:Pick<Model,'mean'|'scale'|'coefficients'|'intercept'>,features:number[]){if(features.length!==model.coefficients.length||features.some(v=>!Number.isFinite(v)))throw new Error('Invalid model features');const z=features.reduce((total,x,i)=>total+(x-model.mean[i])/model.scale[i]*model.coefficients[i],model.intercept);return 1/(1+Math.exp(-z));}
export async function predictGame(gamePk:number){
  const [model,response]=await Promise.all([readModel(),fetchChecked(`https://statsapi.mlb.com/api/v1/schedule?gamePk=${gamePk}`)]);
  const game=(await response.json()).dates?.[0]?.games?.[0];if(!game)throw new Error('Game not found');
  const year=Number(game.season);if(year<=Math.max(...model.metrics.trainSeasons))throw new Error('This game is in or before the training period. Select a later season for an out-of-sample prediction.');
  const stats=model.teamStats[String(year-1)];const home=stats?.[String(game.teams.home.team.id)],away=stats?.[String(game.teams.away.team.id)];
  if(!home||!away)throw new Error(`Prior-season ${year-1} features unavailable. Retrain the model for this season.`);
  const features=[home.avg-away.avg,home.era-away.era],homeProbability=score(model,features);
  return {gamePk,date:game.officialDate,home:game.teams.home.team.name,away:game.teams.away.team.name,homeProbability,awayProbability:1-homeProbability,featureSeason:year-1,inputs:{home,away},metrics:model.metrics,trainedAt:model.trainedAt,
    kind:'Pregame baseline (not live win probability)',limitations:'Uses prior-season team AVG and ERA plus learned home advantage. Does not incorporate today’s starters, injuries, roster changes, betting odds, or in-game score. Historical games are retrospective estimates.'};
}
