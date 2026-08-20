import { createClient } from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const SECRET_NAMES={resendWebhook:'kc_dp_resend_webhook_secret',resendApi:'kc_dp_resend_api_key',mailAttachment:'kc_dp_mail_attachment_key_b64'} as const;
const mask=(v:string)=>v?`${v.slice(0,4)}••••${v.slice(-4)}`:'';
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'POST erforderlich'},405);
 const url=Deno.env.get('SUPABASE_URL')||'',anon=Deno.env.get('SUPABASE_ANON_KEY')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',auth=req.headers.get('Authorization')||'';
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}}),admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}}=await userClient.auth.getUser();if(!user)return json({error:'Anmeldung erforderlich'},401);
 let body:any={};try{body=await req.json()}catch{return json({error:'Ungültige JSON-Anfrage'},400)}
 const orgId=String(body.orgId||'KC_WERNE'),projectId=String(body.projectId||'KC_DP');
 const {data:m}=await admin.from('kc_dp_memberships').select('role,active').eq('org_id',orgId).eq('user_id',user.id).eq('active',true).maybeSingle();
 if(!m||!['planner','duty_manager','admin'].includes(String(m.role||'')))return json({error:'Keine Berechtigung'},403);
 const action=String(body.action||'overview');
 if(action==='overview'){
  const [{data:providers,error:pErr},{data:inbox,error:iErr},{data:jobs,error:jErr},{data:secretState,error:sErr}]=await Promise.all([
   admin.from('kc_dp_mail_provider_settings').select('id,provider_key,display_name,enabled,priority,send_enabled,receive_enabled,free_tier_note,last_health_status,last_health_at,last_error').eq('org_id',orgId).eq('project_id',projectId).order('priority'),
   admin.from('kc_dp_inbox_messages').select('id,received_at,from_address,subject,status,person_id,person_match_method,person_match_confidence,document_id,quarantine_reason').eq('org_id',orgId).eq('project_id',projectId).order('received_at',{ascending:false}).limit(100),
   admin.from('kc_dp_import_jobs').select('id,message_id,status,source_kind,confidence,auto_apply_eligible,detected_rows,valid_rows,error_rows,issues,created_at,applied_at').eq('org_id',orgId).eq('project_id',projectId).order('created_at',{ascending:false}).limit(100),
   admin.rpc('kc_dp_mail_secret_status')
  ]);if(pErr||iErr||jErr||sErr)return json({error:(pErr||iErr||jErr||sErr)?.message||'Datenfehler'},400);return json({ok:true,providers:providers||[],inbox:inbox||[],jobs:jobs||[],secretState:secretState||{}});
 }
 if(action==='providerPatch'){
  if(String(m.role)!=='admin')return json({error:'Nur Admin darf Provider ändern.'},403);const p=body.patch||{},key=String(p.providerKey||'');if(!['resend','brevo','smtp','custom'].includes(key))return json({error:'Ungültiger Provider'},400);
  const row={org_id:orgId,project_id:projectId,provider_key:key,display_name:String(p.displayName||key),priority:Number(p.priority||100),enabled:p.enabled===true,send_enabled:p.sendEnabled!==false,receive_enabled:p.receiveEnabled===true,from_address:p.fromAddress||null,inbound_address:p.inboundAddress||null,free_tier_note:p.freeTierNote||null,settings:p.settings||{},updated_at:new Date().toISOString(),updated_by:user.id};
  const {data,error}=await admin.from('kc_dp_mail_provider_settings').upsert(row,{onConflict:'org_id,project_id,provider_key'}).select().single();return error?json({error:error.message},400):json({ok:true,provider:data});
 }
 if(action==='saveSecret'){
   if(String(m.role)!=='admin')return json({error:'Nur Admin darf Zugangsdaten speichern.'},403);
   const key=String(body.key||'') as keyof typeof SECRET_NAMES,value=String(body.value||'').trim();if(!(key in SECRET_NAMES)||!value)return json({error:'Ungültiger Schlüssel oder leerer Wert.'},400);
   const {data,error}=await admin.rpc('kc_dp_mail_secret_set',{p_name:SECRET_NAMES[key],p_secret:value,p_actor:user.id});if(error)return json({error:error.message},400);return json({ok:true,key,stored:true,masked:mask(value),vaultId:data||null});
 }
 if(action==='ensureAttachmentKey'){
   if(String(m.role)!=='admin')return json({error:'Nur Admin darf den Mail-Schlüssel erzeugen.'},403);
   const bytes=crypto.getRandomValues(new Uint8Array(32)),value=btoa(String.fromCharCode(...bytes));const {data,error}=await admin.rpc('kc_dp_mail_secret_ensure',{p_name:SECRET_NAMES.mailAttachment,p_secret:value,p_actor:user.id});if(error)return json({error:error.message},400);return json({ok:true,created:!!data});
 }
 return json({error:'Unbekannte Aktion'},400);
});
