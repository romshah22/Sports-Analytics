const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const odds=require('../lib/odds-utils.ts');
const api=require('../lib/mlb-api.ts');
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
