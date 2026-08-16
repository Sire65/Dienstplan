(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const QUEUE_KEY='kcDpDiagnosticQueueV01951b';
  const DEVICE_KEY='kcDpDeviceId';
  const MAX_QUEUE=40;
  const state={version:'0.19.51b',queued:0,lastSentAt:null,lastError:null,lastFlushAt:null,captured:0,suppressed:0};
  let reporting=false,providerWrapped=false;

  const clip=(v,n)=>String(v??'').slice(0,n);
  const redact=v=>String(v??'')
    .replace(/(bearer\s+)[a-z0-9._-]+/ig,'$1[REDACTED]')
    .replace(/([?&](?:token|access_token|refresh_token|apikey|password|code)=)[^&\s]+/ig,'$1[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig,'[EMAIL]')
    .replace(/(?:\+?\d[\d\s().\/-]{7,}\d)/g,'[PHONE]')
    .replace(/\beyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}\b/g,'[JWT]')
    .replace(/[A-Za-z0-9_-]{80,}/g,'[REDACTED]');

  function cfg(){try{return K.supabaseConnection?.validateConfig?.()||null}catch(_){return null}}
  async function token(){
    let t=K.supabaseConnection?.sessionSnapshot?.()?.access_token;
    if(!t&&K.storage?.unlocked){try{const s=await K.storage.get('supabaseSession');if(s)K.supabaseConnection?.restoreSession?.(s)}catch(_){}}
    try{await K.supabaseConnection?.ensureSession?.()}catch(_){}
    return K.supabaseConnection?.sessionSnapshot?.()?.access_token||null;
  }
  async function rpc(name,args){
    const c=cfg(),t=await token();
    if(!c||!t)throw new Error('Diagnose wartet auf gültige Supabase-Anmeldung.');
    reporting=true;
    try{
      const r=await fetch(`${c.url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:c.publishableKey,Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:JSON.stringify(args||{}),cache:'no-store'});
      const text=await r.text();
      if(!r.ok)throw new Error(`Diagnose RPC ${r.status}: ${redact(text).slice(0,300)}`);
      try{return text?JSON.parse(text):null}catch(_){return text}
    }finally{reporting=false}
  }
  function deviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!id){id=`DEV-${crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)}`;localStorage.setItem(DEVICE_KEY,id)}return id}
  async function sha(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(_){return 'fp-'+btoa(unescape(encodeURIComponent(s))).replace(/[^a-z0-9]/ig,'').slice(0,48)}}
  function safeContext(extra={}){const allow=['action','module','operation','view','phase','channel','component','status'];const out={};for(const k of allow)if(extra?.[k]!=null)out[k]=clip(redact(extra[k]),180);return out}
  function safeRoute(){return clip(location.pathname,260)}
  async function build(err,opt={}){
    const e=err instanceof Error?err:new Error(typeof err==='string'?err:JSON.stringify(err));
    const message=clip(redact(e.message||'Unbekannter Fehler'),1200),stack=clip(redact(e.stack||''),6000),source=clip(redact(opt.source||e.fileName||''),500);
    const fp=await sha([opt.code||e.name||'Error',message.replace(/\d+/g,'#'),source,safeRoute()].join('|'));
    return {p_person_id:K.currentUser?.personId||null,p_device_id:deviceId(),p_app_version:K.CURRENT_RELEASE||K.APP_VERSION||'0.19.51',p_severity:opt.severity||'error',p_error_code:opt.code||e.name||'Error',p_fingerprint:fp,p_message:message,p_stack:stack,p_source:source,p_route:safeRoute(),p_browser:clip(redact(navigator.userAgent),500),p_platform:clip(redact(navigator.platform||navigator.userAgentData?.platform||''),300),p_online:navigator.onLine,p_context:safeContext(opt.context)};
  }

  function queueRead(){try{const q=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');return Array.isArray(q)?q:[]}catch(_){return[]}}
  function queueWrite(q){const trimmed=q.slice(-MAX_QUEUE);try{localStorage.setItem(QUEUE_KEY,JSON.stringify(trimmed))}catch(_){/* quota/full: diagnostics must never break app */}state.queued=trimmed.length}
  function persistentPayload(p){return {...p,p_stack:'',p_message:clip(redact(p.p_message),600),p_context:safeContext(p.p_context),p_route:safeRoute(),queued_at:new Date().toISOString()}}
  function enqueue(p){const q=queueRead(),last=q[q.length-1];if(last?.p_fingerprint===p.p_fingerprint){last.local_occurrences=Math.min(999,Number(last.local_occurrences||1)+1);last.queued_at=new Date().toISOString()}else q.push({...persistentPayload(p),local_occurrences:1});queueWrite(q)}

  async function report(err,opt={}){
    if(reporting){state.suppressed++;return{suppressed:true}}
    const payload=await build(err,opt);state.captured++;
    try{const id=await rpc('kc_dp_report_error',payload);state.lastSentAt=new Date().toISOString();state.lastError=null;return{id,fingerprint:payload.p_fingerprint}}
    catch(e){enqueue(payload);state.lastError=e?.message||String(e);return{queued:true,error:state.lastError,fingerprint:payload.p_fingerprint}}
  }
  async function flush(){
    if(!navigator.onLine)return{sent:0,remaining:queueRead().length};
    const q=queueRead(),keep=[];let sent=0;
    for(const p of q){try{await rpc('kc_dp_report_error',p);sent++}catch(_){keep.push(p)}}
    queueWrite(keep);state.lastFlushAt=new Date().toISOString();return{sent,remaining:keep.length}
  }
  async function adminList(limit=100){return await rpc('kc_dp_error_admin_list',{p_limit:limit})||[]}
  async function setStatus(id,status){return rpc('kc_dp_error_admin_set_status',{p_id:id,p_status:status})}

  function installServiceWorkerHooks(){
    if(!('serviceWorker' in navigator))return;
    navigator.serviceWorker.addEventListener('message',e=>{
      const d=e.data||{};
      if(d.type==='KC_DP_UPDATE_ACTIVATION_FAILED')report(new Error(d.message||'PWA-Update konnte nicht aktiviert werden'),{code:'pwa.update.activation_failed',severity:'critical',context:{module:'service-worker',phase:'activation'}});
    });
    navigator.serviceWorker.getRegistration?.().then(reg=>{
      if(!reg)return;
      reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='redundant')report(new Error('Service Worker wurde beim Update redundant'),{code:'pwa.service_worker.redundant',severity:'warning',context:{module:'service-worker',phase:'update'}})})});
    }).catch(e=>report(e,{code:'pwa.service_worker.registration',severity:'warning',context:{module:'service-worker'}}));
  }

  function wrapSyncProvider(){
    if(providerWrapped||!K.supabaseConnection?.provider)return false;
    const original=K.supabaseConnection.provider;
    K.supabaseConnection.provider=async function(req){
      try{return await original.apply(this,arguments)}catch(e){
        const action=clip(req?.action||'unknown',40);
        report(e,{code:`sync.${action}.failed`,severity:navigator.onLine?'error':'warning',context:{module:'supabase-sync',operation:action,status:navigator.onLine?'online':'offline'}});
        throw e;
      }
    };
    providerWrapped=true;return true;
  }

  function install(){
    if(K.__diagnosticsV01951b)return;K.__diagnosticsV01951b=true;
    window.addEventListener('error',e=>{if(e.error)report(e.error,{source:e.filename,code:'window.error',severity:'error',context:{module:'global'}});else report(new Error(e.message||'Resource konnte nicht geladen werden'),{source:e.filename||e.target?.src||e.target?.href,code:'resource.error',severity:'warning',context:{module:'resource-load'}})},true);
    window.addEventListener('unhandledrejection',e=>report(e.reason instanceof Error?e.reason:new Error(String(e.reason)),{code:'unhandledrejection',severity:'error',context:{module:'promise'}}));
    window.addEventListener('online',()=>flush());
    window.addEventListener('pageshow',()=>{if(navigator.onLine)flush()});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine)flush()});
    window.addEventListener('kc-dp-diagnostic-error',e=>{const d=e.detail||{};report(d.error||new Error(d.message||'KC-DP Diagnoseereignis'),{code:d.code||'app.diagnostic',severity:d.severity||'error',source:d.source||'',context:d.context||{}})});
    installServiceWorkerHooks();
    if(!wrapSyncProvider()){let tries=0;const t=setInterval(()=>{tries++;if(wrapSyncProvider()||tries>40)clearInterval(t)},250)}
    setTimeout(()=>flush(),1600);
    setInterval(()=>{if(navigator.onLine&&queueRead().length)flush()},60000);
  }
  K.diagnostics={state,report,flush,adminList,setStatus,redact,install,deviceId};
  install();
})();