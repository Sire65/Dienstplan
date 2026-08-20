import { createClient } from 'npm:@supabase/supabase-js@2';
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const sha256=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req)=>{
 if(req.method!=='POST')return json({error:'POST erforderlich'},405);
 const url=Deno.env.get('SUPABASE_URL')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 let b:any={};try{b=await req.json()}catch{return json({error:'Ungültiges JSON'},400)}
 const {data:key}=await admin.from('kc_dp_cron_auth').select('secret_hash').eq('id','nightly_push').maybeSingle();
 if(!key||await sha256(String(b.cronSecret||''))!==key.secret_hash)return json({error:'Cron nicht berechtigt'},403);
 const {data:rows,error}=await admin.from('kc_dp_inbox_attachments').select('id,storage_path').eq('content_status','encrypted').lte('retention_until',new Date().toISOString()).limit(200);if(error)return json({error:error.message},400);
 let deleted=0,failed=0;
 for(const r of rows||[]){try{if(r.storage_path){const {error:rm}=await admin.storage.from('kc-dp-mail-quarantine').remove([r.storage_path]);if(rm)throw rm}await admin.from('kc_dp_inbox_attachments').update({content_status:'deleted',storage_path:null,encryption_iv:null,cipher_sha256:null}).eq('id',r.id);deleted++;}catch{failed++;}}
 return json({ok:true,deleted,failed});
});
