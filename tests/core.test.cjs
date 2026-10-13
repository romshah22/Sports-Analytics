const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const odds=require('../lib/odds-utils.ts');
const api=require('../lib/mlb-server.ts');
api.fuzzyMatch=require('../lib/player-search.ts').fuzzyMatch;
const {score}=require('../lib/prediction.ts');
const model=require('../models/win-model.json');
const predictions=require('../models/test-predictions.json');
function event(lines,id='1',date='2026-06-01T17:00:00Z'){return {id,date,competitions:[{competitors:[{homeAway:'home',team:{displayName:'New York Yankees'}},{homeAway:'away',team:{displayName:'Boston Red Sox'}}],odds:lines?[lines]:undefined}]};}
test('Missing or malformed moneylines never become fabricated odds',()=>{
 for(const value of [undefined,null,'TBD','',0,'abc-110',90])assert.equal(odds.parseAmericanOdds(value),null);
 assert.equal(odds.parseAmericanOdds('EVEN'),100);
 assert.equal(odds.parseEspnOdds({events:[event()]}).size,0);
 assert.equal(odds.parseEspnOdds({events:[event({awayTeamOdds:{moneyLine:120}})]}).size,0);
});
test('Both ESPN schemas work and missing secondary markets remain null',()=>{
 for(const lines of [{awayTeamOdds:{moneyLine:120},homeTeamOdds:{moneyLine:-130}},{moneyline:{away:{close:{odds:'+120'}},home:{close:{odds:'-130'}}}}]){
  const value=odds.parseEspnOdds({events:[event(lines)]}).get('1');assert.equal(value.homeMoneyline,-130);assert.equal(value.awayMoneyline,120);assert.equal(value.spread,null);assert.equal(value.overUnder,null);
 }
 assert.equal(odds.getImpliedProbability(-150),.6);
});
test('Doubleheaders require correct game time',()=>{
 const lines={awayTeamOdds:{moneyLine:120},homeTeamOdds:{moneyLine:-130}};
 const map=odds.parseEspnOdds({events:[event(lines),event(lines,'2','2026-06-01T23:00:00Z')]});
 assert.equal(odds.findOddsForGame('Boston Red Sox','New York Yankees',map),undefined);
 assert.equal(odds.findOddsForGame('Boston Red Sox','New York Yankees',map,'2026-06-01T23:00:00Z').gameId,'2');
});
test('Node inference matches all Python held-out predictions',()=>{
 for(const row of predictions)assert.ok(Math.abs(score(model,row.x)-row.homeProbability)<1e-12);
 assert.equal(new Set(predictions.map(r=>r.gamePk)).size,predictions.length);
 const accuracy=predictions.filter(r=>Number(r.homeProbability>=.5)===r.y).length/predictions.length;
 assert.equal(accuracy,model.metrics.accuracy);assert.ok(Math.max(...model.metrics.trainSeasons)<model.metrics.testSeason);
});
test('Career, season and H2H queries have distinct contracts; HTTP failures throw',async()=>{
 const original=global.fetch;const urls=[];
 global.fetch=async url=>{urls.push(url);return Response.json({stats:[{splits:[{stat:{hits:5}}]}]});};
 try{
  await api.getPlayerStats(1);assert.match(urls.at(-1),/stats=career/);
  await api.getPlayerStats(1,2024);assert.match(urls.at(-1),/stats=season/);assert.match(urls.at(-1),/season=2024/);
  assert.deepEqual(await api.getHeadToHead(1,2),{stat:{hits:5}});assert.match(urls.at(-1),/stats=vsPlayerTotal/);
  await api.getHeadToHead(1,2,2023);assert.match(urls.at(-1),/stats=vsPlayer&/);
  await api.getTeamSeasonStats(147,2024,'2024-06-01');assert.match(urls.at(-1),/endDate=2024-05-31/);
  global.fetch=async()=>new Response('',{status:503});await assert.rejects(()=>api.searchPlayers('judge'),/503/);
 }finally{global.fetch=original;}
});
test('Fuzzy search recovers a misspelled name',()=>{assert.ok(api.fuzzyMatch('Aaron Judg',['Aaron Judge','Mike Trout']).includes('Aaron Judge'));});
test('Run-line sign follows the home team, not always the favorite',()=>{
 const value=odds.parseEspnOdds({events:[event({awayTeamOdds:{moneyLine:-140},homeTeamOdds:{moneyLine:120,favorite:false},spread:-1.5})]}).get('1');
 assert.equal(value.spread,1.5);
});
const Module=require('node:module');
const path=require('node:path');
const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...args){return resolve.call(this,request.startsWith('@/')?path.join(__dirname,'..',request.slice(2)):request,...args);};
const gemini=require('../lib/gemini.ts');
const agent=require('../app/api/agent/route.ts');
test('Agent executes a requested tool and returns evidence to the model',async()=>{
 const original=gemini.generateContent,search=api.searchPlayers;let turn=0;
 try{
  api.searchPlayers=async name=>[{id:592450,fullName:name}];
  gemini.generateContent=async body=>{turn++;if(turn===1){assert.equal(body.tools[0].functionDeclarations.length,5);return {role:'model',parts:[{functionCall:{name:'search_players',args:{name:'Aaron Judge'}}}]};}
   assert.equal(body.contents[2].parts[0].functionResponse.response.result[0].id,592450);return {role:'model',parts:[{text:'Aaron Judge was found in MLB data.'}]};};
  const response=await agent.POST(new Request('http://localhost/api/agent',{method:'POST',body:JSON.stringify({question:'Find Aaron Judge'})}));const data=await response.json();
  assert.equal(response.status,200);assert.equal(turn,2);assert.equal(data.trace[0].tool,'search_players');assert.equal(data.trace[0].ok,true);assert.match(data.text,/Aaron Judge/);
 }finally{gemini.generateContent=original;api.searchPlayers=search;}
});
test('Agent rejects oversized prompts before making any provider call',async()=>{
 const response=await agent.POST(new Request('http://localhost/api/agent',{method:'POST',body:JSON.stringify({question:'a'.repeat(2001)})}));assert.equal(response.status,400);
});
const mlbRoute=require('../app/api/mlb/route.ts');
const client=require('../lib/mlb-api.ts');
test('MLB route preserves every helper result and validates requests before lookup',async()=>{
 const cases=[['search&name=Judge','searchPlayers',['Judge']],['player&id=1','getPlayer',[1]],['stats&id=1','getPlayerStats',[1,undefined]],['stats&id=1&season=2024','getPlayerStats',[1,2024]],['gameLog&id=1&season=2024','getPlayerGameLog',[1,2024]],['matchup&batterId=1&pitcherId=2','getHeadToHead',[1,2,undefined]],['standings','getStandings',[]],['schedule&date=2026-06-01','getSchedule',['2026-06-01']],['preview&gamePk=1','getGamePreview',[1]],['recentForm&teamId=1&before=2026-06-01','getTeamRecentForm',[1,'2026-06-01']],['teamStats&teamId=1&season=2024','getTeamSeasonStats',[1,2024,undefined]],['teamMatchup&team1Id=1&team2Id=2&season=2024','getTeamHeadToHead',[1,2,2024,undefined]],['players','getAllPlayers',[]],['seasons&id=1','getPlayerSeasons',[1]]];
 for(const [query,name,args] of cases){const original=api[name];try{api[name]=async(...received)=>{assert.deepEqual(received,args);return {fixture:name};};const response=await mlbRoute.GET(new Request('http://localhost/api/mlb?action='+query));assert.equal(response.status,200);assert.deepEqual(await response.json(),{fixture:name});}finally{api[name]=original;}}
 for(const query of ['stats&id=0','stats&id=1&season=1800','schedule&date=2026-02-30','search&name=','unknown','matchup&batterId=1'])assert.equal((await mlbRoute.GET(new Request('http://localhost/api/mlb?action='+query))).status,400);
 const original=api.getStandings;try{api.getStandings=async()=>{throw new Error('Provider failed');};const r=await mlbRoute.GET(new Request('http://localhost/api/mlb?action=standings'));assert.equal(r.status,502);assert.equal((await r.json()).error,'Provider failed');}finally{api.getStandings=original;}
});
test('Browser stats helpers use the local backend and retain career/season contracts',async()=>{
 const original=global.fetch;const urls=[];
 try{global.fetch=async url=>{urls.push(String(url));return Response.json([{stat:'fixture'}]);};assert.deepEqual(await client.getPlayerStats(1),[{stat:'fixture'}]);assert.equal(urls.at(-1),'/api/mlb?action=stats&id=1');await client.getPlayerStats(1,2024);assert.equal(urls.at(-1),'/api/mlb?action=stats&id=1&season=2024');await client.getHeadToHead(1,2);assert.equal(urls.at(-1),'/api/mlb?action=matchup&batterId=1&pitcherId=2');await client.getStandings();assert.equal(urls.at(-1),'/api/mlb?action=standings');global.fetch=async()=>new Response('',{status:502});await assert.rejects(()=>client.getPlayerStats(1),/502/);}finally{global.fetch=original;}
});
const {buildSnapshot,featureVector,completionDates}=require('../lib/pregame-features.ts');
const pregameFixture=require('./pregame-fixture.json');
test('Current-season feature building matches Python on real MLB game logs',()=>{
 const actual=buildSnapshot(pregameFixture.logs,pregameFixture.schedule,pregameFixture.before);
 for(const [key,value] of Object.entries(pregameFixture.expected)){
  if(typeof value==='number')assert.ok(Math.abs(actual[key]-value)<1e-12,key);
  else assert.equal(actual[key],value);
 }
 assert.notDeepEqual(actual,buildSnapshot(pregameFixture.logs,pregameFixture.schedule,'2025-08-01'));
 assert.deepEqual(featureVector(actual,actual),[0,0,0,0,0]);
});
test('Selected-day and future stats cannot change a historical prediction input',()=>{
 const mutated=structuredClone(pregameFixture.logs);
 const dates=completionDates(pregameFixture.schedule);
 for(const group of mutated.stats)for(const row of group.splits){
  if(dates.get(row.game.gamePk)>=pregameFixture.before){
   for(const key of Object.keys(row.stat))if(typeof row.stat[key]==='number')row.stat[key]=999999;
   row.isWin=!row.isWin;
  }
 }
 assert.deepEqual(buildSnapshot(mutated,pregameFixture.schedule,pregameFixture.before),pregameFixture.expected);
 assert.throws(()=>buildSnapshot(pregameFixture.logs,pregameFixture.schedule,'2025-03-28'),/at least 10/);
});
test('ERA uses pitching outs, duplicate game rows count once, suspended games wait for completion',()=>{
 const schedule={dates:[]};const hitting=[],pitching=[];
 for(let i=1;i<=10;i++){
  const date=`2026-04-${String(i).padStart(2,'0')}`;
  schedule.dates.push({date,games:[{gamePk:i,officialDate:date,status:{abstractGameState:'Final'}}]});
  hitting.push({game:{gamePk:i},isWin:i<=6,stat:{hits:9,atBats:30,baseOnBalls:2,hitByPitch:1,sacFlies:0,totalBases:15,runs:5}});
  pitching.push({game:{gamePk:i},stat:{earnedRuns:1,outs:26,runs:3}});
 }
 const logs={stats:[{group:{displayName:'hitting'},splits:[...hitting,hitting[0]]},{group:{displayName:'pitching'},splits:pitching}]};
 const snapshot=buildSnapshot(logs,schedule,'2026-04-11');
 assert.equal(snapshot.games,10);assert.equal(snapshot.era,270/260);assert.equal(snapshot.avg,.3);assert.equal(snapshot.recentWinPct,.6);assert.equal(snapshot.runDifferential,2);
 schedule.dates.push({date:'2026-04-20',games:[{gamePk:1,officialDate:'2026-04-01',status:{abstractGameState:'Final'}}]});
 assert.throws(()=>buildSnapshot(logs,schedule,'2026-04-11'),/at least 10/);
});
test('Postseason inference requests the selected season and tolerates unplayed rounds',async()=>{
 const original=global.fetch,urls=[];
 const fixture=JSON.parse(JSON.stringify(pregameFixture).replaceAll('2025','2026'));
 try{
  global.fetch=async url=>{
   urls.push(String(url));
   if(String(url).includes('schedule?gamePk='))return Response.json({dates:[{games:[{gamePk:1,officialDate:'2026-10-08',season:'2026',gameType:'D',teams:{home:{team:{id:147,name:'Home'}},away:{team:{id:111,name:'Away'}}}}]}]});
   if(String(url).includes('/schedule?'))return Response.json(fixture.schedule);
   if(String(url).endsWith('gameType=R'))return Response.json(fixture.logs);
   return new Response('',{status:404});
  };
  const result=await require('../lib/prediction.ts').predictGame(1);
  assert.equal(result.featureSeason,2026);assert.equal(result.postseason,true);
  assert.ok(result.inputs.home.lastGameDate.startsWith('2026-'));
  assert.ok(urls.filter(url=>url.includes('/stats?')).every(url=>url.includes('season=2026')));
  assert.equal(result.homeProbability+result.awayProbability,1);
 }finally{global.fetch=original;}
});
