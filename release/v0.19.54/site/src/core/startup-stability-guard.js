(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  if(K.startupStabilityGuard)return;

  const state={version:'0.20.0-recovery-p3',ready:false,lastError:null,lastReadyAt:null,optionalErrors:[]};
  const safeError=e=>String(e?.message||e||'Unbekannter Fehler');

  function recordOptional(source,error){
    const row={source:String(source||'optional'),error:safeError(error),at:new Date().toISOString()};
    state.optionalErrors.unshift(row);
    state.optionalErrors=state.optionalErrors.slice(0,20);
    console.warn('[KC DP2 optional]',row.source,row.error);
    try{window.dispatchEvent(new CustomEvent('KC_DP_OPTIONAL_SERVICE_ERROR',{detail:row}));}catch(_){}
    return row;
  }

  function markReady(){
    state.ready=true;
    state.lastReadyAt=new Date().toISOString();
    state.lastError=null;
    try{window.dispatchEvent(new CustomEvent('KC_DP_STARTUP_READY',{detail:{at:state.lastReadyAt}}));}catch(_){}
  }

  function installRoleGuard(){
    const role=K.roleUx;
    if(!role||role.__startupGuardInstalled)return false;
    role.__startupGuardInstalled=true;
    const originalAfter=role.afterDataLoaded?.bind(role);
    const originalShow=role.showRoleHome?.bind(role);

    role.afterDataLoaded=function guardedAfterDataLoaded(){
      try{
        if(originalAfter){
          const out=originalAfter();
          markReady();
          if(out&&typeof out.then==='function')out.catch(e=>recordOptional('role-after-data-loaded',e));
          return out;
        }
      }catch(e){
        state.lastError=safeError(e);
        recordOptional('role-after-data-loaded',e);
      }
      try{
        originalShow?.();
        markReady();
      }catch(e){
        state.lastError=safeError(e);
        console.error('[KC DP2 startup fallback]',e);
      }
      return null;
    };
    return true;
  }

  function safeBackground(name,fn,delay=0){
    setTimeout(()=>{
      try{
        const out=typeof fn==='function'?fn():null;
        if(out&&typeof out.then==='function')out.catch(e=>recordOptional(name,e));
      }catch(e){recordOptional(name,e);}
    },Math.max(0,Number(delay)||0));
  }

  function install(){
    installRoleGuard();
    const timer=setInterval(()=>{if(installRoleGuard())clearInterval(timer);},50);
    setTimeout(()=>clearInterval(timer),5000);
  }

  K.startupStabilityGuard={state,install,markReady,recordOptional,safeBackground};
  install();
})(typeof window!=='undefined'?window:globalThis);
