(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const KEY='kc_dp_login_trace_v1';
  const MAX=80;
  function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}}
  function write(rows){try{localStorage.setItem(KEY,JSON.stringify(rows.slice(-MAX)))}catch(_){}}
  function add(stage,status='info',detail='',extra={}){
    const row={at:new Date().toISOString(),ms:Date.now(),stage,status,detail:String(detail||''),...extra};
    const rows=read();rows.push(row);write(rows);window.dispatchEvent(new CustomEvent('KC_DP_LOGIN_TRACE',{detail:row}));return row;
  }
  function clear(){write([]);add('trace','info','Neue Login-Messung gestartet');}
  function snapshot(){return read();}
  function safeUrl(input){try{const u=new URL(typeof input==='string'?input:input?.url||'',location.href);return u.origin+u.pathname+u.search}catch(_){return String(input?.url||input||'')}}
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,opt={}){
    const url=safeUrl(input),method=String(opt?.method||input?.method||'GET').toUpperCase();
    const isPasswordToken=/\/auth\/v1\/token\?grant_type=password/i.test(url);
    const isMembership=/\/rest\/v1\/kc_dp_memberships/i.test(url);
    if(!isPasswordToken&&!isMembership)return nativeFetch(input,opt);
    const started=performance.now();
    add(isPasswordToken?'token-post':'membership-get','start',`${method} gesendet`,{url});
    try{
      const response=await nativeFetch(input,opt);
      add(isPasswordToken?'token-post':'membership-get',response.ok?'green':'red',`HTTP ${response.status} nach ${Math.round(performance.now()-started)} ms`,{url,httpStatus:response.status,latencyMs:Math.round(performance.now()-started)});
      return response;
    }catch(e){
      add(isPasswordToken?'token-post':'membership-get','red',`${e?.name||'Fehler'} nach ${Math.round(performance.now()-started)} ms: ${e?.message||e}`,{url,latencyMs:Math.round(performance.now()-started)});
      throw e;
    }
  };
  function wrapLater(){
    const sb=K.supabaseConnection,ma=K.memberAccess;
    if(sb?.signInWithPassword&&!sb.signInWithPassword.__kcTrace){const orig=sb.signInWithPassword.bind(sb);const f=async args=>{add('supabase-signin','start','Passwort-Anmeldung gestartet');const t=performance.now();try{const r=await orig(args);add('supabase-signin','green',`Auth-Sitzung übernommen nach ${Math.round(performance.now()-t)} ms`);return r}catch(e){add('supabase-signin','red',`${e?.message||e} nach ${Math.round(performance.now()-t)} ms`);throw e}};f.__kcTrace=true;sb.signInWithPassword=f;}
    if(sb?.currentMembership&&!sb.currentMembership.__kcTrace){const orig=sb.currentMembership.bind(sb);const f=async(...args)=>{add('membership','start','Mitgliedschaft/Rolle wird geladen');const t=performance.now();try{const r=await orig(...args);add('membership','green',`Mitgliedschaft geladen nach ${Math.round(performance.now()-t)} ms`);return r}catch(e){add('membership','red',`${e?.message||e} nach ${Math.round(performance.now()-t)} ms`);throw e}};f.__kcTrace=true;sb.currentMembership=f;}
    if(ma?.signInPassword&&!ma.signInPassword.__kcTrace){const orig=ma.signInPassword.bind(ma);const f=async args=>{clear();add('login','start','Anmeldebutton verarbeitet');const t=performance.now();try{const r=await orig(args);add('login','green',`Login vollständig abgeschlossen nach ${Math.round(performance.now()-t)} ms`);return r}catch(e){add('login','red',`${e?.message||e} nach ${Math.round(performance.now()-t)} ms`);throw e}};f.__kcTrace=true;ma.signInPassword=f;}
  }
  K.loginTrace={version:'0.19.55-logintrace-1',add,clear,snapshot};
  let attempts=0;const timer=setInterval(()=>{wrapLater();if(++attempts>30)clearInterval(timer)},250);wrapLater();
})();
