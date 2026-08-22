(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  if(window.__kcDpFetchTimeoutGuardInstalled)return;
  window.__kcDpFetchTimeoutGuardInstalled=true;
  const nativeFetch=window.fetch.bind(window);
  const DEFAULT_TIMEOUT_MS=15000;

  function isSupabaseRequest(input){
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const u=new URL(raw,location.href);
      return /\.supabase\.co$/i.test(u.hostname);
    }catch(_){return false;}
  }

  function timeoutFor(input,init={}){
    if(Number.isFinite(Number(init.kcTimeoutMs)))return Math.max(1000,Number(init.kcTimeoutMs));
    return isSupabaseRequest(input)?DEFAULT_TIMEOUT_MS:0;
  }

  window.fetch=function kcDpSafeFetch(input,init={}){
    const timeoutMs=timeoutFor(input,init);
    if(!timeoutMs)return nativeFetch(input,init);

    const controller=new AbortController();
    const externalSignal=init.signal||null;
    let externalAbortHandler=null;
    if(externalSignal){
      if(externalSignal.aborted)controller.abort(externalSignal.reason);
      else{
        externalAbortHandler=()=>controller.abort(externalSignal.reason);
        externalSignal.addEventListener('abort',externalAbortHandler,{once:true});
      }
    }

    const timer=setTimeout(()=>controller.abort(new DOMException('KC DP2 Netzwerk-Zeitüberschreitung','TimeoutError')),timeoutMs);
    const cleanInit={...init,signal:controller.signal};
    delete cleanInit.kcTimeoutMs;

    return nativeFetch(input,cleanInit).catch(err=>{
      if(controller.signal.aborted&&!externalSignal?.aborted){
        const e=new Error(`Keine Antwort innerhalb von ${Math.round(timeoutMs/1000)} Sekunden.`);
        e.name='KCDPNetworkTimeoutError';
        e.code='KC_DP_NETWORK_TIMEOUT';
        e.timeoutMs=timeoutMs;
        throw e;
      }
      throw err;
    }).finally(()=>{
      clearTimeout(timer);
      if(externalSignal&&externalAbortHandler)externalSignal.removeEventListener('abort',externalAbortHandler);
    });
  };

  K.networkTimeoutGuard={version:'0.20.0-recovery-1',defaultTimeoutMs:DEFAULT_TIMEOUT_MS,isSupabaseRequest};
})();
