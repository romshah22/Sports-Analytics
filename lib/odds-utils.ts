import { fetchChecked } from './request';
export interface OddsData { gameId:string; awayTeam:string; homeTeam:string; awayMoneyline:number; homeMoneyline:number; spread:number|null; overUnder:number|null; startTime?:string; provider?:string; }
export function parseAmericanOdds(value:unknown):number|null {
  if(typeof value==='string' && /^(EVEN|EVS)$/i.test(value.trim()))return 100;
  if(typeof value!=='number' && (typeof value!=='string'||! /^[+-]?\d+$/.test(value.trim())))return null;
  const n=Number(value);return Number.isFinite(n)&&Math.abs(n)>=100?n:null;
}
function numeric(value:unknown):number|null {if(value===undefined||value===null||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;}
function normalize(name:string){return name.toLowerCase().replace(/^oakland athletics$|^athletics$|^sacramento athletics$/,'athletics').replace(/[^a-z0-9]/g,'');}
export function formatDateForEspn(d:Date){return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;}
export function formatOdds(line:number){return line>0?`+${line}`:String(line);}
export function formatLine(line:number|null){return line===null?'—':`${line>0?'+':''}${line.toFixed(1)}`;}
export function getImpliedProbability(moneyline:number){return moneyline>0?100/(moneyline+100):Math.abs(moneyline)/(Math.abs(moneyline)+100);}
export function findOddsForGame(away:string,home:string,map:Map<string,OddsData>,gameTime?:string){
 const matches=[...map.values()].filter(o=>normalize(o.awayTeam)===normalize(away)&&normalize(o.homeTeam)===normalize(home));
 if(matches.length===1)return matches[0];
 if(gameTime)return matches.find(o=>o.startTime&&Math.abs(Date.parse(o.startTime)-Date.parse(gameTime))<15*60*1000);
 return undefined; // Never attach one doubleheader game's line to both games.
}
/* Provider schemas vary. Only actual, parseable moneylines produce an odds card. */
export function parseEspnOdds(data:any):Map<string,OddsData>{
 const output=new Map<string,OddsData>();
 for(const event of data.events||[]){
  const c=event.competitions?.[0],competitors=c?.competitors||[];
  const home=competitors.find((v:any)=>v.homeAway==='home'),away=competitors.find((v:any)=>v.homeAway==='away');
  const o=c?.odds?.[0];if(!o||!home||!away)continue;
  const a=parseAmericanOdds(o.awayTeamOdds?.moneyLine??o.moneyline?.away?.close?.odds??o.moneyline?.away?.open?.odds??o.moneyline?.away);
  const h=parseAmericanOdds(o.homeTeamOdds?.moneyLine??o.moneyline?.home?.close?.odds??o.moneyline?.home?.open?.odds??o.moneyline?.home);
  if(a===null||h===null)continue;
  output.set(String(event.id),{gameId:String(event.id),awayTeam:away.team.displayName||away.team.name,homeTeam:home.team.displayName||home.team.name,awayMoneyline:a,homeMoneyline:h,
    spread:numeric(typeof o.spread==='number' && typeof o.homeTeamOdds?.favorite==='boolean' ? (o.homeTeamOdds.favorite ? -Math.abs(o.spread) : Math.abs(o.spread)) : o.pointSpread?.home?.close?.line??o.spread?.home?.close?.line),
    overUnder:numeric(typeof o.overUnder==='number'?o.overUnder:o.total?.over?.close?.line??o.overUnder?.close?.line),startTime:event.date,provider:o.provider?.name});
 }
 return output;
}
export async function fetchEspnOdds(date:Date){
 const response=await fetchChecked(`/api/odds?date=${formatDateForEspn(date)}`, {signal: AbortSignal.timeout(45000)});
 return parseEspnOdds(await response.json());
}
