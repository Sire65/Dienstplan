(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  let ensureFlight=null;
  let refreshFlight=null;
  let installed=false;

  function install(){
    const sb=K.supabaseConnection;
    if(!sb||installed||sb.__kcSessionSingleFlight)return !!installed;
    const originalEnsure=typeof sb.ensureSession==='function'?sb.ensureSession.bind(sb):null;
    const originalRefresh=typeof sb.refreshSession==='function'?sb.refreshSession.bind(sb):null;
    if(!originalEnsure)return false;

    sb.ensureSession=async function(){
      if(ensureFlight)return ensureFlight;
      ensureFlight=Promise.resolve().then(()=>originalEnsure()).finally(()=>{ensureFlight=null;});
      return ensureFlight;
    };

    if(originalRefresh){
      sb.refreshSession=async function(){
        if(refreshFlight)return refreshFlight;
        refreshFlight=Promise.resolve().then(()=>originalRefresh()).finally(()=>{refreshFlight=null;});
        return refreshFlight;
      };
    }

    sb.__kcSessionSingleFlight=true;
    installed=true;
    return true;
  }

  async function refreshOnForeground(){
    if(!install())return;
    if(K.memberAccess?.state?.status!=='authenticated'&&!K.supabaseConnection?.hasAccessToken?.())return;
    try{
      await K.supabaseConnection.ensureSession();
      window.dispatchEvent(new CustomEvent('KC_DP_SUPABASE_SESSION_READY'));
    }catch(e){
      K.supabaseConnection.state.lastError=e?.message||String(e);
      window.dispatchEvent(new CustomEvent('KC_DP_SUPABASE_SESSION_REFRESH_FAILED',{detail:{message:e?.message||String(e)}}));
    }
  }

  const boot=()=>{install();setTimeout(refreshOnForeground,0);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('pageshow',()=>setTimeout(refreshOnForeground,0));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(refreshOnForeground,0);});

  K.supabaseSessionGuard={version:'0.19.55-single-flight-1',install,refreshOnForeground};
})();
