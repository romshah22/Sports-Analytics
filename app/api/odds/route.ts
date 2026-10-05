import { fetchChecked } from '@/lib/request';
export const maxDuration = 60;
export async function GET(req:Request){
 const date=new URL(req.url).searchParams.get('date');
 if(!date||!/^\d{8}$/.test(date))return Response.json({error:'Expected YYYYMMDD date'},{status:400});
 try{
  const base='https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/';
  const r=await fetchChecked(`${base}scoreboard?dates=${date}`,{next:{revalidate:60}});const data=await r.json();
  // Scoreboard often omits odds; ESPN's game summary exposes pickcenter lines.
  // Limit work to the MLB slate and preserve games even when a summary fails.
  await Promise.all((data.events||[]).slice(0,20).map(async(event:{id:string;competitions?:{odds?:unknown[]}[]})=>{
   const c=event.competitions?.[0];if(!c||c.odds?.length||!/^\d+$/.test(event.id))return;
   try{const summary=await fetchChecked(`${base}summary?event=${event.id}`,{next:{revalidate:60},signal:AbortSignal.timeout(12000)});const details=await summary.json();c.odds=details.pickcenter?.length?details.pickcenter:details.odds||[];}catch{/* Unavailable markets remain absent. */}
  }));
  return Response.json(data);
 }catch{return Response.json({error:'ESPN odds temporarily unavailable'},{status:502});}
}
