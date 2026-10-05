'use client';
import { useEffect, useState } from 'react';
import { getAllPlayers, getPlayerSeasons, getPlayerStats, type MLBPlayer } from '@/lib/mlb-api';
import PlayerSearchBox from '@/components/PlayerSearchBox';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
const groups = {
  hitting: [['avg','AVG',false],['homeRuns','HR',false],['rbi','RBI',false],['ops','OPS',false],['obp','OBP',false],['slg','SLG',false],['strikeOuts','K',true],['baseOnBalls','BB',false]],
  pitching: [['era','ERA',true],['whip','WHIP',true],['strikeOuts','K',false],['wins','W',false],['losses','L',true],['inningsPitched','IP',false],['baseOnBalls','BB',true]],
} as const;
type Stats = { group?: { displayName?: string }; splits?: { stat?: Record<string,string | number> }[] }[];
export default function ComparePage() {
  const [players,setPlayers]=useState<MLBPlayer[]>([]);
  const [p1,setP1]=useState<MLBPlayer|null>(null), [p2,setP2]=useState<MLBPlayer|null>(null);
  const [y1,setY1]=useState<number|undefined>(), [y2,setY2]=useState<number|undefined>();
  const [years1,setYears1]=useState<number[]>([]),[years2,setYears2]=useState<number[]>([]);
  const [s1,setS1]=useState<Stats>([]),[s2,setS2]=useState<Stats>([]);
  const [group,setGroup]=useState<'hitting'|'pitching'>('hitting');
  const [metric,setMetric]=useState('avg');
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  useEffect(()=>{getAllPlayers().then(setPlayers).catch(()=>setError('Player list unavailable. You can still search by name.'));},[]);
  useEffect(()=>{let active=true;setYears1([]);setY1(undefined);if(p1) getPlayerSeasons(p1.id).then(v=>{if(active)setYears1(v);}).catch(()=>{if(active)setError('Could not load available seasons.');});return()=>{active=false;};},[p1]);
  useEffect(()=>{let active=true;setYears2([]);setY2(undefined);if(p2) getPlayerSeasons(p2.id).then(v=>{if(active)setYears2(v);}).catch(()=>{if(active)setError('Could not load available seasons.');});return()=>{active=false;};},[p2]);
  useEffect(()=>{
    let active=true;setS1([]);setS2([]);setError('');if(!p1||!p2) {setLoading(false);return;}
    setLoading(true);
    Promise.all([getPlayerStats(p1.id,y1),getPlayerStats(p2.id,y2)]).then(([a,b])=>{if(active){setS1(a);setS2(b);}}).catch(()=>{if(active)setError('Stats could not be loaded. Try another selection.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[p1,p2,y1,y2]);
  const a=s1.find(s=>s.group?.displayName===group)?.splits?.[0]?.stat;
  const b=s2.find(s=>s.group?.displayName===group)?.splits?.[0]?.stat;
  function seasonSelect(label:string,years:number[],value:number|undefined,set:(v:number|undefined)=>void) {
    return <label>{label}<select aria-label={label} value={value??'career'} onChange={e=>set(e.target.value==='career'?undefined:Number(e.target.value))}><option value="career">Career totals</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>;
  }
  return <div><h1 style={{fontSize:36,fontWeight:700}}>Player Comparison</h1><p className="muted">Compare different players or the same player across seasons. Search current or historical MLB players.</p>
    <div className="comparison-grid">
      <div><PlayerSearchBox label="Player 1" placeholder="Aaron Judge, Babe Ruth…" players={players} selected={p1} onSelect={setP1} accent="var(--accent2)"/>{p1&&seasonSelect('Player 1 season',years1,y1,setY1)}</div>
      <div><PlayerSearchBox label="Player 2" placeholder="Search player name…" players={players} selected={p2} onSelect={setP2} accent="var(--accent)"/>{p2&&seasonSelect('Player 2 season',years2,y2,setY2)}</div>
    </div>
    <section className="panel"><label>Stat group <select value={group} onChange={e=>{const v=e.target.value as typeof group;setGroup(v);setMetric(v==='hitting'?'avg':'era');}}><option value="hitting">Batting</option><option value="pitching">Pitching</option></select></label></section>
    {loading&&<p role="status">Loading comparison…</p>}{error&&<p role="alert">{error}</p>}
    {p1&&p2&&!loading&&!error&&<section className="panel">
      <h2>{p1.fullName} ({y1??'Career'}) vs {p2.fullName} ({y2??'Career'})</h2>
      {(!a||!b)&&<p className="muted">No {group} data for {!a?p1.fullName:p2.fullName} in the selected period. Missing values are shown as —.</p>}
      <table style={{width:'100%',margin:'20px 0'}}><thead><tr><th>{p1.fullName}</th><th>Stat</th><th>{p2.fullName}</th></tr></thead><tbody>{groups[group].map(([key,label,lower])=>{
        const av=a?.[key],bv=b?.[key];const valid=av!==undefined&&bv!==undefined&&Number.isFinite(Number(av))&&Number.isFinite(Number(bv));
        const left=valid&&(lower?Number(av)<Number(bv):Number(av)>Number(bv));const right=valid&&(lower?Number(bv)<Number(av):Number(bv)>Number(av));
        return <tr key={key}><td style={{textAlign:'center',padding:10,color:left?'#4ade80':undefined}}>{av??'—'}</td><th>{label}</th><td style={{textAlign:'center',padding:10,color:right?'#4ade80':undefined}}>{bv??'—'}</td></tr>;
      })}</tbody></table><p className="muted">Green indicates the favorable value, not a context-adjusted player ranking. Counting stats depend on playing time.</p>
      <label>Chart metric <select value={metric} onChange={e=>setMetric(e.target.value)}>{groups[group].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <div style={{height:260,marginTop:20}}><ResponsiveContainer width="100%" height="100%"><BarChart data={[{name:`${p1.fullName} (${y1??'Career'})`,value:a?.[metric]===undefined?null:Number(a[metric])},{name:`${p2.fullName} (${y2??'Career'})`,value:b?.[metric]===undefined?null:Number(b[metric])}]}><XAxis dataKey="name" stroke="#7a9bbf"/><YAxis stroke="#7a9bbf"/><Tooltip contentStyle={{background:'#0d1f3c'}}/><Bar dataKey="value" fill="#f5a623" name={metric}/></BarChart></ResponsiveContainer></div>
    </section>}
    <style>{`.comparison-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px}.comparison-grid label{display:flex;gap:12px;align-items:center;margin-top:12px}@media(max-width:650px){.comparison-grid{grid-template-columns:1fr}}`}</style>
  </div>;
}
