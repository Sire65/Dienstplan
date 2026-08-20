import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const TARGET='dp2@kc-werne.de';
const ADMIN_ROLES=['admin','planner','duty_manager'];

async function sha256(v:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,'0')).join('')}

Deno.serve(async(req)=>{
  if(req.method!=='POST')return json({error:'POST erforderlich'},405);
  const url=Deno.env.get('SUPABASE_URL')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  let body:any={};try{body=await req.json()}catch{return json({error:'Ungültiges JSON'},400)}
  const provider=String(body.provider||'').toLowerCase();
  const secret=String(body.webhookSecret||'');
  const expected=Deno.env.get(provider==='brevo'?'KC_DP_BREVO_INBOUND_SECRET':'KC_DP_RESEND_INBOUND_SECRET')||'';
  if(!expected||await sha256(secret)!==await sha256(expected))return json({error:'Webhook nicht berechtigt'},403);

  const to=String(body.to||body.recipient||'').trim().toLowerCase();
  if(to!==TARGET)return json({ok:true,skipped:'other_recipient'});
  const fromAddress=String(body.from||body.sender||'').trim().toLowerCase();
  const subject=String(body.subject||'(ohne Betreff)').slice(0,300);
  const providerMessageId=String(body.messageId||body.id||crypto.randomUUID()).slice(0,300);
  const attachments=Array.isArray(body.attachments)?body.attachments:[];

  const {data:existing}=await admin.from('kc_dp_inbox_messages').select('id').eq('org_id','KC_WERNE').eq('project_id','KC_DP').eq('provider_key',provider).eq('provider_message_id',providerMessageId).maybeSingle();
  if(existing)return json({ok:true,duplicate:true,messageId:existing.id});

  const {data:message,error:mErr}=await admin.from('kc_dp_inbox_messages').insert({org_id:'KC_WERNE',project_id:'KC_DP',provider_key:provider||'custom',provider_message_id:providerMessageId,from_address:fromAddress||'unbekannt',from_name:String(body.fromName||'').slice(0,200)||null,subject,status:'received',person_match_method:'unknown',metadata:{to:TARGET,attachmentCount:attachments.length}}).select().single();
  if(mErr)return json({error:mErr.message},400);

  for(const a of attachments.slice(0,20)){
    const name=String(a.name||a.filename||'anhang').slice(0,260),type=String(a.type||a.contentType||'application/octet-stream').slice(0,120),size=Number(a.size||0)||0,hash=String(a.sha256||await sha256(`${providerMessageId}:${name}:${size}`));
    const lower=name.toLowerCase();const kind=lower.endsWith('.xlsx')?'xlsx':lower.endsWith('.xls')?'xls':lower.endsWith('.csv')?'csv':lower.endsWith('.pdf')?'pdf':/\.(png|jpg|jpeg|webp|heic)$/i.test(lower)?'image':'unknown';
    await admin.from('kc_dp_inbox_attachments').insert({message_id:message.id,file_name:name,media_type:type,byte_size:size,sha256:hash,detected_kind:kind,scan_status:'pending',parse_status:'pending'});
  }

  const {data:members}=await admin.from('kc_dp_memberships').select('person_id,user_id,role,active').eq('org_id','KC_WERNE').eq('active',true).in('role',ADMIN_ROLES);
  const personIds=[...new Set((members||[]).map((m:any)=>String(m.person_id||'')).filter(Boolean))];
  let pushSent=0,pushFailed=0;
  if(personIds.length){
    let pub=Deno.env.get('KC_DP_VAPID_PUBLIC_KEY')||'',priv=Deno.env.get('KC_DP_VAPID_PRIVATE_KEY')||'',subj=Deno.env.get('KC_DP_VAPID_SUBJECT')||'mailto:admin@koecheclub-werne.de';
    if(!pub||!priv){const {data:r}=await admin.rpc('kc_dp_get_push_runtime_secrets');if(r){pub=String(r.vapidPublicKey||'');priv=String(r.vapidPrivateKey||'');subj=String(r.vapidSubject||subj)}}
    if(pub&&priv){
      webpush.setVapidDetails(subj,pub,priv);
      const {data:subs}=await admin.from('kc_dp_push_subscriptions').select('id,user_id,person_id,subscription').eq('org_id','KC_WERNE').eq('project_id','KC_DP').eq('active',true).in('person_id',personIds);
      const notificationId=`MAIL-${message.id}`;
      const title='KC DP2 – Neue E-Mail eingegangen';
      const text=`Von ${fromAddress||'unbekannt'} · ${subject}${attachments.length?` · ${attachments.length} Anhang/Anhänge`:''}. Prüfung läuft.`;
      for(const s of subs||[]){
        await admin.from('kc_dp_push_deliveries').upsert({org_id:'KC_WERNE',project_id:'KC_DP',notification_id:notificationId,subscription_id:s.id,user_id:s.user_id,person_id:s.person_id,title,status:'queued',delivery_meta:{kind:'mail_inbound',messageId:message.id,urgency:'high'}},{onConflict:'notification_id,subscription_id'});
        try{await webpush.sendNotification(s.subscription,JSON.stringify({title,body:text,data:{notificationId,route:'mail_inbox',messageId:message.id}}),{TTL:21600,urgency:'high'});pushSent++;await admin.from('kc_dp_push_deliveries').update({status:'sent',sent_at:new Date().toISOString()}).eq('notification_id',notificationId).eq('subscription_id',s.id)}catch(e){pushFailed++;await admin.from('kc_dp_push_deliveries').update({status:'failed',failed_at:new Date().toISOString(),error_code:String((e as any).statusCode||'push_error')}).eq('notification_id',notificationId).eq('subscription_id',s.id)}
      }
    }
  }

  return json({ok:true,target:TARGET,messageId:message.id,attachments:attachments.length,pushSent,pushFailed});
});
