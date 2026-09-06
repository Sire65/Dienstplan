(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const direct=typeof window.KCDPSupabaseProvider==='function'?window.KCDPSupabaseProvider:null;
  if(!direct||!K.sync?.setProvider){return;}

  const PRIMARY='https://kc-failover-gateway.ha-joko.workers.dev';
  const SECONDARY='https://kc-failover-gateway.netlify.app/.netlify/functions/gateway';
  const REGISTER_ID='kc-dp2';
  const INSTANCE_KEY='kc_dp_failover_instance_v1';
  const state=K.failoverState=K.failoverState||{activeBackend:'SUPABASE',gateway:null,lastError:null,lastSwitchAt:null,lastRecoveryAt:null,recovered:0,conflicts:0};
  let recoveryRunning=false;

  function instanceId(){try{let v=localStorage.getItem(INSTANCE_KEY);if(!v){v='dp2-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36));localStorage.setItem(INSTANCE_KEY,v);}return v;}catch(_){return 'dp2-browser';}}
  function switchTo(backend,gateway,error){if(state.activeBackend!==backend){state.lastSwitchAt=new Date().toISOString();}state.activeBackend=backend;state.gateway=gateway||null;state.lastError=error?String(error.message||error):null;try{window.dispatchEvent(new CustomEvent('kc:failover-status',{detail:{...state}}));}catch(_){}}
  function isTransportFailure(e){const s=String(e?.message||e||'');return !e?.status||/nicht erreichbar|zeitüberschreitung|network|fetch|failed|offline|cors|dns|connection/i.test(s);}
  async function gatewayFetch(path,opt={}){let last=null;for(const [name,base] of [['CLOUDFLARE',PRIMARY],['NETLIFY',SECONDARY]]){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),7000);try{const r=await fetch(base+path,{...opt,signal:ctrl.signal,cache:'no-store',headers:{'content-type':'application/json','x-kc-client':'kc-dp2/'+instanceId(),...(opt.headers||{})}});const body=await r.json().catch(()=>({}));if(r.ok||r.status===207||r.status===409)return {r,body,name};last=new Error('Gateway HTTP '+r.status);}catch(e){last=e;}finally{clearTimeout(timer);}}throw last||new Error('Alle KC-Failover-Gateways sind nicht erreichbar.');}
  function transactionFor(wire){const id=String(wire?.operationId||'').trim();if(!id)throw new Error('Failover: operationId fehlt.');return {transactionId:id,registerId:REGISTER_ID,registerName:instanceId(),time:new Date().toISOString(),payload:{kcFailover:true,schema:'kc.dp2.sync.v1',programId:REGISTER_ID,wireOperation:wire}};}
  async function fallbackPush(wire){const g=await gatewayFetch('/sync/transaction',{method:'POST',body:JSON.stringify({transaction:transactionFor(wire)})});if(g.r.status===409||g.body?.status==='CONFLICT'){state.conflicts++;switchTo('NEON',g.name,'Konflikt im Neon-Failover-Journal');return {status:'conflict',remote:{operationId:wire.operationId,source:'NEON_FAILOVER'}};}switchTo('NEON',g.name,null);return {status:'ok',remoteVersion:null,failover:true,backend:'NEON'};}
  async function fallbackPull(){const g=await gatewayFetch('/sync/transactions?register_id='+encodeURIComponent(REGISTER_ID),{method:'GET'});const rows=Array.isArray(g.body?.transactions)?g.body.transactions:[];const wireOperations=[];for(const row of rows){const p=row?.payload;const w=p?.wireOperation||p?.payload?.wireOperation;if(w?.operationId)wireOperations.push(w);}switchTo('NEON',g.name,null);return {ok:true,wireOperations,cursor:null,failover:true,backend:'NEON'};}
  async function recoverToSupabase(){if(recoveryRunning||state.activeBackend!=='NEON')return;recoveryRunning=true;try{const g=await gatewayFetch('/sync/transactions?register_id='+encodeURIComponent(REGISTER_ID),{method:'GET'});const rows=Array.isArray(g.body?.transactions)?g.body.transactions:[];let recovered=0,conflicts=0;for(const row of rows){const w=row?.payload?.wireOperation||row?.payload?.payload?.wireOperation;if(!w?.operationId)continue;try{const res=await direct({action:'push',contract:'KC_DP_SYNC_V1',wireOperation:w});if(res?.status==='conflict')conflicts++;else recovered++;}catch(e){if(isTransportFailure(e))throw e;}}
      state.lastRecoveryAt=new Date().toISOString();state.recovered=recovered;state.conflicts+=conflicts;switchTo('SUPABASE',null,null);
    }catch(e){state.lastError=String(e?.message||e);}finally{recoveryRunning=false;}}

  async function provider(req){
    try{
      const res=await direct(req);
      if(state.activeBackend==='NEON'&&req?.action==='health')setTimeout(()=>recoverToSupabase(),0);
      else if(state.activeBackend!=='NEON')switchTo('SUPABASE',null,null);
      return res;
    }catch(e){
      if(!isTransportFailure(e)||!['health','push','pull'].includes(req?.action))throw e;
      if(req.action==='push')return fallbackPush(req.wireOperation);
      if(req.action==='pull')return fallbackPull();
      const g=await gatewayFetch('/',{method:'GET'});const active=g.body?.activeBackend||'LOCAL_QUEUE';if(active==='LOCAL_QUEUE'){switchTo('LOCAL_QUEUE',g.name,e);throw e;}switchTo(active==='NEON'?'NEON':'SUPABASE',g.name,e);return {ok:true,failover:true,backend:active};
    }
  }

  K.failover={version:'1.0.0',state,recoverToSupabase,health:async()=>{const g=await gatewayFetch('/',{method:'GET'});return g.body;}};
  K.sync.setProvider(provider);
})();
