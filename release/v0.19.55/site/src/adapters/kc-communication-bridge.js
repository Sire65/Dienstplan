(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const state={version:'1.0.0',mode:'central-first',status:'starting',lastCentralAt:null,lastFallbackAt:null,lastError:null,lastResult:null};

  async function authContext(){
    const conn=K.supabaseConnection,c=conn?.validateConfig?.();
    if(!c)throw new Error('Supabase-Konfiguration fehlt.');
    try{await conn?.ensureSession?.();}catch(_){/* existing session may still be usable */}
    const token=conn?.sessionSnapshot?.()?.access_token;
    if(!token)throw new Error('Keine gültige DP2-Anmeldung für KC Communication.');
    return {url:String(c.url||'').replace(/\/$/,''),publishableKey:c.publishableKey,token};
  }

  async function route(eventKey,personIds,variables={},options={}){
    const ctx=await authContext();
    const recipients=[...new Set((personIds||[]).map(String).filter(Boolean))].map(personId=>({personId}));
    if(!recipients.length)throw new Error('Keine Empfänger für KC Communication.');
    const correlationId=options.correlationId||`kc-dp2-${eventKey}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const r=await fetch(`${ctx.url}/functions/v1/kc-communication-router`,{
      method:'POST',
      headers:{'Content-Type':'application/json',apikey:ctx.publishableKey,Authorization:`Bearer ${ctx.token}`,'x-client-info':'kc-dp2-communication-bridge/1.0.0'},
      body:JSON.stringify({sourceProgram:'kc-dp2',eventKey,recipients,variables,priority:options.priority||'normal',testOnly:options.testOnly===true,correlationId,orgId:options.orgId||null})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok||data?.ok!==true){const e=new Error(data?.error||data?.code||`KC Communication HTTP ${r.status}`);e.status=r.status;e.data=data;throw e;}
    state.status='central';state.lastCentralAt=new Date().toISOString();state.lastError=null;state.lastResult=data;
    try{K.recordAudit?.('communication.central.sent',{entity:'notification',entityId:correlationId,meta:{eventKey,recipientCount:recipients.length,result:data}})}catch(_){}
    return data;
  }

  function install(){
    const push=K.pushAdapter;
    if(!push||push.__kcCommunicationBridgeInstalled)return false;
    const legacySend=push.send.bind(push),legacySendMany=push.sendMany.bind(push),legacySelf=push.sendSelfTest?.bind(push);

    push.send=async function(notification,personId,options={}){
      try{
        const out=await route('manual_notification',[personId],{title:notification?.title||'KC DP2',body:notification?.body||'',notificationId:notification?.id||'',data:notification?.data||{}},{priority:options.priority||'normal',testOnly:false});
        return {status:'sent',via:'kc-communication',result:out};
      }catch(e){
        state.status='fallback';state.lastFallbackAt=new Date().toISOString();state.lastError=e.message;
        console.warn('KC Communication nicht verfügbar – DP2 Legacy-Push wird verwendet:',e.message);
        const out=await legacySend(notification,personId,options);
        return {...out,via:'kc-dp-legacy',centralError:e.message};
      }
    };

    push.sendMany=async function(notification,personIds,options={}){
      const ids=[...new Set((personIds||[]).map(String).filter(Boolean))];
      try{
        const out=await route('manual_notification',ids,{title:notification?.title||'KC DP2',body:notification?.body||'',notificationId:notification?.id||'',data:notification?.data||{}},{priority:options.priority||'normal',testOnly:false});
        return {status:'sent',recipients:ids.length,via:'kc-communication',result:out};
      }catch(e){
        state.status='fallback';state.lastFallbackAt=new Date().toISOString();state.lastError=e.message;
        console.warn('KC Communication nicht verfügbar – DP2 Legacy-Push wird verwendet:',e.message);
        const out=await legacySendMany(notification,ids,options);
        return {...out,via:'kc-dp-legacy',centralError:e.message};
      }
    };

    push.sendSelfTest=async function(){
      const personId=K.currentUser?.personId;
      if(!personId)throw new Error('Keine angemeldete Person gefunden.');
      return push.send({id:`KC-COMM-SELFTEST-${Date.now()}`,title:'KC DP2 – KC Communication Test',body:'Diese Push-Nachricht wurde über KC Communication versendet.',data:{route:'notifications',test:true}},personId,{bypassSafety:true});
    };

    push.sendShiftChanged=(personId,{date,from,to,area=''},{priority='normal'}={})=>route('shift_changed',[personId],{personId,date,from,to,area},{priority,testOnly:false});
    push.sendReplacementRequested=(personIds,{date,from,to,area=''},{priority='high'}={})=>route('replacement_requested',personIds,{date,from,to,area,recipientPersonIds:personIds},{priority,testOnly:false});
    push.sendPlanReleased=(personIds,{periodLabel,orgId},{priority='normal'}={})=>route('plan_released',personIds,{periodLabel,orgId},{priority,testOnly:false,orgId});
    push.communicationState=state;
    push.__kcCommunicationBridgeInstalled=true;
    state.status='ready';
    return true;
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>500)clearInterval(timer)},20);
  K.communicationBridge={state,route,install};
})();
