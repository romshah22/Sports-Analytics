import { generateContent } from '@/lib/gemini';
export async function POST(req: Request) {
  let body;
  try {body=await req.json();} catch {return Response.json({error:'Invalid JSON'},{status:400});}
  if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>24000) return Response.json({error:'Supply a prompt between 1 and 24,000 characters.'},{status:400});
  try {
    const content=await generateContent({contents:[{role:'user',parts:[{text:body.prompt}]}]});
    return Response.json({text:content.parts.map((p:{text?:string})=>p.text||'').join('\n')});
  } catch(e) {return Response.json({error:e instanceof Error?e.message:'Analysis unavailable'},{status:503});}
}
