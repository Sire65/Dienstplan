import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,pub=Deno.env.get('KC_DP_VAPID_PUBLIC_KEY')||'',priv=Deno.env.get('KC_DP_VAPID_PRIVATE_KEY')||'',subject=Deno.env.get('KC_DP_VAPID_SUBJECT')||'mailto:admin@koecheclub-werne.de';
 if(req.method==='GET')return json({ok:!!pub,vapidPublicKey:pub});
 const auth=req.headers.get('Authorization')||'',userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}}),admin=createClient(url,service),{data:{user}}=await userClient.auth.getUser();if(!user)return json({error:'Anmeldung erforderlich'},401);
 const body=await req.json(),action=String(body.action||''),orgId=String(body.orgId||'KC_WERNE'),projectId=String(body.projectId||'KC_DP');
 const {data:membership}=await admin.from('kc_dp_memberships').select('person_id,role,active').eq('org_id',orgId).eq('user_id',user.id).eq('active',true).maybeSingle();if(!membership)return json({error:'Keine aktive Mitgliedschaft'},403);
 if(action==='subscribe'){
  const sub=body.subscription;if(!sub?.endpoint)return json({error:'Subscription fehlt'},400);
  const {error}=await admin.from('kc_dp_push_subscriptions').upsert({org_id:orgId,project_id:projectId,user_id:user.id,person_id:membership.person_id,endpoint:sub.endpoint,subscription:sub,user_agent:String(body.userAgent||'').slice(0,500),active:true,updated_at:new Date().toISOString()},{onConflict:'org_id,project_id,user_id,endpoint'});return error?json({error:error.message},400):json({ok:true});
 }
 if(action==='unsubscribe'){await admin.from('kc_dp_push_subscriptions').update({active:false,updated_at:new Date().toISOString()}).eq('org_id',orgId).eq('project_id',projectId).eq('user_id',user.id).eq('endpoint',String(body.endpoint||''));return json({ok:true});}
 if(action==='send'){
  if(!['planner','duty_manager','admin'].includes(String(membership.role)))return json({error:'Keine Versandberechtigung'},403);if(!pub||!priv)return json({error:'VAPID noch nicht serverseitig konfiguriert'},503);webpush.setVapidDetails(subject,pub,priv);
  const ids=[...new Set((body.personIds||[]).map(String))],payload=JSON.stringify(body.payload||{}),{data:subs,error}=await admin.from('kc_dp_push_subscriptions').select('id,subscription').eq('org_id',orgId).eq('project_id',projectId).eq('active',true).in('person_id',ids);if(error)return json({error:error.message},400);let sent=0,failed=0;for(const row of subs||[]){try{await webpush.sendNotification(row.subscription,payload);sent++}catch(e){failed++;if([404,410].includes(Number((e as {statusCode?:number}).statusCode)))await admin.from('kc_dp_push_subscriptions').update({active:false}).eq('id',row.id)}}return json({ok:true,sent,failed});
 }
 return json({error:'Unbekannte Aktion'},400);
});
