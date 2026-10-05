import { generateContent } from '@/lib/gemini';
import { getSchedule, getPlayer, getPlayerStats, searchPlayers, getStandings } from '@/lib/mlb-api';
import { predictGame } from '@/lib/prediction';
const functions=[
  {name:'search_players',description:'Find MLB player IDs by full or partial name.',parameters:{type:'OBJECT',properties:{name:{type:'STRING'}},required:['name']}},
  {name:'player_stats',description:'Get MLB player profile and hitting/pitching stats; omit season for career totals.',parameters:{type:'OBJECT',properties:{id:{type:'INTEGER'},season:{type:'INTEGER'}},required:['id']}},
  {name:'schedule',description:'Get MLB games, scores, venue and probable starters for a YYYY-MM-DD date.',parameters:{type:'OBJECT',properties:{date:{type:'STRING'}},required:['date']}},
  {name:'standings',description:'Get current season MLB standings.',parameters:{type:'OBJECT',properties:{}}},
  {name:'predict_game',description:'Get trained logistic regression pregame probability for an MLB game ID, model metrics and limitations.',parameters:{type:'OBJECT',properties:{gamePk:{type:'INTEGER'}},required:['gamePk']}},
];
function integer(v:unknown) {if(!Number.isInteger(v)||Number(v)<1)throw new Error('Invalid numeric ID');return Number(v);}
async function execute(name:string,args:Record<string,unknown>) {
  switch(name){
    case 'search_players': if(typeof args.name!=='string'||args.name.length>100)throw new Error('Invalid player name');return (await searchPlayers(args.name)).slice(0,10);
    case 'player_stats': {const id=integer(args.id);const year=args.season===undefined?undefined:integer(args.season);if(year&&(year<1876||year>new Date().getFullYear()))throw new Error('Invalid season');const [profile,stats]=await Promise.all([getPlayer(id),getPlayerStats(id,year)]);return {profile,stats};}
    case 'schedule': if(typeof args.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(args.date))throw new Error('Invalid date');return getSchedule(args.date);
    case 'standings': return getStandings();
    case 'predict_game':return predictGame(integer(args.gamePk));
    default:throw new Error('Unknown tool');
  }
}
export async function POST(req:Request){
  let body;try{body=await req.json();}catch{return Response.json({error:'Invalid JSON'},{status:400});}
  if(typeof body.question!=='string'||!body.question.trim()||body.question.length>2000)return Response.json({error:'Enter a question up to 2,000 characters.'},{status:400});
  const contents:unknown[]=[{role:'user',parts:[{text:`Current date (US Eastern): ${new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'})}. Retrieve evidence using tools before answering. Question: ${body.question}`}]}];
  const trace:{tool:string;args:Record<string,unknown>;source:string;retrievedAt:string;ok:boolean}[]=[];
  try{
    for(let turn=0;turn<5;turn++){
      const content=await generateContent({contents,tools:[{functionDeclarations:functions}]});contents.push(content);
      const calls=content.parts.filter((p:{functionCall?:unknown})=>p.functionCall);
      if(!calls.length){const text=content.parts.map((p:{text?:string})=>p.text||'').join('\n');return Response.json({text,trace});}
      if(calls.length>6)throw new Error('Too many data requests. Please narrow the question.');
      const results=[];
      for(const part of calls){const {name,args={}}=part.functionCall;const event={tool:name,args,source:name==='predict_game'?'Local trained model + MLB Stats API':'MLB Stats API',retrievedAt:new Date().toISOString(),ok:true};let result;
        try{result=await execute(name,args);}catch(e){event.ok=false;result={error:e instanceof Error?e.message:'Data unavailable'};}
        trace.push(event);results.push({functionResponse:{name,response:{result,source:event.source,retrievedAt:event.retrievedAt}}});
      }
      contents.push({role:'user',parts:results});
    }
    return Response.json({error:'The question needed too many lookups. Try one player or game at a time.',trace},{status:422});
  }catch(e){return Response.json({error:e instanceof Error?e.message:'AI analyst unavailable',trace},{status:503});}
}
