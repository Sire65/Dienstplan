(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const KEY='kc_dp_login_trace_v1';
  const MAX=80;
  function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}}
  function write(rows){try{localStorage.setItem(KEY,JSON.stringify(rows.slice(-MAX)))}catch(_){}}
  function add(stage,status='info',detail='',extra={}){
    const row={at:new Date().toISOString(),ms:Date.now(),stage,status,detail:String(detail||''),...extra};
    const rows=read();rows.push(row);write(rows);window.dispatchEvent(new CustomEvent('KC_DP_LOGIN_TRACE',{detail:row}));if(stage==='login'&&status==='red')setTimeout(show,120);return row;
  }
  function clear(){write([]);add('trace','info','Neue Login-Messung gestartet');}
  function snapshot(){return read();}
  function safeUrl(input){try{const u=new URL(typeof input==='string'?input:input?.url||'',location.href);return u.origin+u.pathname+u.search}catch(_){return String(input?.url||input||'')}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function show(){
    document.getElementById('kcLoginTraceOverlay')?.remove();
    const rows=read(),base=rows[0]?.ms||Date.now();
    const lines=rows.map(r=>{const d=Math.max(0,Number(r.ms||0)-base),ico=r.status==='green'?'✓':r.status==='red'?'✕':'•';return `${ico} +${d} ms · ${r.stage}: ${r.detail}`}).join('\n');
    const ov=document.createElement('div');ov.id='kcLoginTraceOverlay';Object.assign(ov.style,{position:'fixed',inset:'0',zIndex:'2147483646',background:'rgba(0,0,0,.55)',display:'grid',placeItems:'center',padding:'14px'});
    ov.innerHTML=`<section style="width:min(760px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 18px 60px #0006;font-family:system-ui,Arial,sans-serif"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><h2 style="margin:0;color:#8f1422;font-size:23px">Login-Protokoll</h2><button id="kcLoginTraceClose" type="button" style="width:46px;height:46px;border-radius:50%;border:1px solid #d8c9c1;background:#fff;font-size:28px">×</button></div><p style="margin:10px 0;color:#555">Keine Passwörter oder Tokens werden protokolliert.</p><pre style="white-space:pre-wrap;word-break:break-word;background:#faf7f3;border:1px solid #ded4cd;border-radius:12px;padding:12px;font:12px/1.45 ui-monospace,monospace">${esc(lines||'Noch keine Login-Messwerte.')}</pre></section>`;
    document.body.appendChild(ov);document.getElementById('kcLoginTraceClose').onclick=()=>ov.remove();ov.addEventListener('click',e=>{if(e.target===ov)ov.remove()});
  }
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,opt={}){
    const url=safeUrl(input),method=String(opt?.method||input?.method||'GET').toUpperCase();
    const isPasswordToken=/\/auth\/v1\/token\?grant_type=password/i.test(url);
    const isMembership=/\/rest\/v1\/kc_dp_memberships/i.test(url);
    if(!isPasswordToken&&!isMembership)return nativeFetch(input,opt);
    const started=performance.now();
    add(isPasswordToken?'token-post':'membership-get','start',`${method} gesendet`,{url});
    try{
      const response=await nativeFetch(input,opt),latency=Math.round(performance.now()-started);
      add(isPasswordToken?'token-post':'membership-get',response.ok?'green':'red',`HTTP ${response.status} nach ${latency} ms`,{url,httpStatus:response.status,latencyMs:latency});
      return response;
    }catch(e){
      const latency=Math.round(performance.now()-started);add(isPasswordToken?'token-post':'membership-get','red',`${e?.name||'Fehler'} nach ${latency} ms: ${e?.message||e}`,{url,latencyMs:latency});throw e;
    }
  };
  function wrapLater(){
    const sb=K.supabaseConnection,ma=K.memberAccess;
    if(sb?.signInWithPassword&&!sb.signInWithPassword.__kcTrace){const orig=sb.signInWithPassword.bind(sb);const f=async args=>{add('supabase-signin','start','Passwort-Anmeldung gestartet');const t=performance.now();try{const r=await orig(args);add('supabase-signin','green',`Auth-Sitzung übernommen nach ${Math.round(performance.now()-t)} ms`);return r}catch(e){add('supabase-signin','red',`${e?.message||e} nach ${Math.round(performance.now()-t)} ms`);throw e}};f.__kcTrace=true;sb.signInWithPassword=f;}
    if(sb?.currentMembership&&!sb.currentMembership.__kcTrace){const orig=sb.currentMembership.bind(sb);const f=async(...args)=>{add('membership','start','Mitgliedschaft/Rolle wird geladen');const t=performance.now();try{const r=await orig(...args);add('membership','green',`Mitgliedschaft geladen nach ${Math.round(performance.now()-t)} ms`);return r}catch(e){add('membership','red',`${e?.message||e} nach ${Math.round(performance.now()-t)} ms`);throw e}};f.__kcTrace=true;sb.currentMembership=f;}
    if(ma?.signInPassword&&!ma.signInPassword.__kcTrace){const orig=ma.signInPassword.bind(ma);const f=async args=>{clear();add('login','start','Anmeldebutton verarbeitet');const t=performance.now();try{const r=await orig(args);add('login','green',`Login vollständig abgeschlossen nach ${Math.round(performance.now()-t)} ms`);return r}catch(e){add('login','red',`${e?.message||e} nach ${Math.round(performance.now()-t)} ms`);throw e}};f.__kcTrace=true;ma.signInPassword=f;}
  }
  K.loginTrace={version:'0.19.55-logintrace-2',add,clear,snapshot,show};
  let attempts=0;const timer=setInterval(()=>{wrapLater();if(++attempts>30)clearInterval(timer)},250);wrapLater();
})();
