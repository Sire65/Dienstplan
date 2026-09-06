(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const SOURCE='kc-dp2';
  const ORG_ID='KC_WERNE';
  async function configAndToken(){
    const conn=K.supabaseConnection,c=conn?.validateConfig?.();
    if(!c)throw new Error('Supabase-Konfiguration fehlt.');
    try{await conn?.ensureSession?.();}catch(_){/* handled below */}
    const token=conn?.sessionSnapshot?.()?.access_token;
    if(!token)throw new Error('Keine aktive Supabase-Anmeldung.');
    return {c,token};
  }
  async function send(eventKey,recipients=[],variables={},options={}){
    const {c,token}=await configAndToken();
    const r=await fetch(`${c.url}/functions/v1/kc-communication-router`,{
      method:'POST',
      headers:{apikey:c.publishableKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json','x-client-info':'kc-dp2-kc-communication/0.19.55'},
      body:JSON.stringify({sourceProgram:SOURCE,eventKey,orgId:options.orgId||ORG_ID,recipients:Array.isArray(recipients)?recipients:[],variables,priority:options.priority||'normal',testOnly:options.testOnly===true,correlationId:options.correlationId||`dp2-${Date.now()}-${Math.random().toString(16).slice(2)}`})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||data.code||`KC Communication HTTP ${r.status}`);
    return data;
  }
  async function selfRecipient(){
    const {c,token}=await configAndToken();
    const r=await fetch(`${c.url}/auth/v1/user`,{headers:{apikey:c.publishableKey,Authorization:`Bearer ${token}`}});
    const u=await r.json();
    if(!r.ok||!u?.id)throw new Error('Benutzer konnte nicht ermittelt werden.');
    return [{userId:u.id,email:u.email||null}];
  }
  const api={version:'0.1.0',send,
    shiftChanged:(recipients,variables,options={})=>send('shift_changed',recipients,variables,options),
    replacementRequested:(recipients,variables,options={})=>send('replacement_requested',recipients,variables,{...options,priority:options.priority||'high'}),
    planReleased:(variables,options={})=>send('plan_released',[],variables,{...options,orgId:options.orgId||ORG_ID}),
    async testPush(message='KC DP2 Test-Push über KC Communication'){
      const recipients=await selfRecipient();
      return send('shift_changed',recipients,{date:new Date().toLocaleDateString('de-DE'),from:'Test',to:'Test',message,title:'KC DP2'}, {testOnly:true});
    }
  };
  K.kcCommunication=api;
  const install=()=>{
    if(!K.pushAdapter||K.pushAdapter.__kcCommunicationWrapped)return;
    const legacy=K.pushAdapter.sendSelfTest?.bind(K.pushAdapter);
    if(legacy){
      K.pushAdapter.sendSelfTest=async function(){
        try{return await api.testPush('Server-Push-Test über KC Communication');}
        catch(e){console.warn('KC Communication Test nicht möglich, Legacy-Push wird verwendet:',e?.message||e);return legacy();}
      };
    }
    K.pushAdapter.__kcCommunicationWrapped=true;
  };
  install();
  let tries=0;const timer=setInterval(()=>{install();if(K.pushAdapter?.__kcCommunicationWrapped||++tries>200)clearInterval(timer)},25);
})();
