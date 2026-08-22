(function(){
  'use strict';
  const K=window.KCDP=window.KCDP||{};
  const routing=Object.freeze({liveOwner:'legacy_push',centralMode:'shadow_test',centralLiveEnabled:false});
  const state={mode:'test',ready:false,lastEvent:null,lastOk:null,lastError:null,lastAt:null,lastSkippedReason:null,routing};
  const fmtTime=h=>`${String(Math.floor(Number(h))).padStart(2,'0')}:${String(Math.round((Number(h)%1)*60)).padStart(2,'0')}`;
  const orgId=()=>String(K.integrationConfig?.supabase?.orgId||'').trim()||null;
  const present=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
  const periodLabel=()=>{
    const days=Array.isArray(K.days)?K.days:[];
    if(!days.length)return 'Dienstplan';
    return `${days[0]?.date||''} – ${days[days.length-1]?.date||''}`.trim();
  };
  const getAccessToken=async()=>K.supabaseConnection?.sessionSnapshot?.()?.access_token||null;

  let client=null,adapter=null;
  try{
    if(typeof window.KCCommunicationClient==='function'&&typeof window.createKCCommunicationAdapter==='function'){
      client=new window.KCCommunicationClient({sourceProgram:'kc-dp2',getAccessToken,defaultTestOnly:true,timeoutMs:12000});
      adapter=window.createKCCommunicationAdapter(client);
      state.ready=true;
    }else state.lastError='KC Communication SDK nicht geladen';
  }catch(e){state.lastError=e?.message||String(e);}

  function remember(eventKey,ok,error=null){
    state.lastEvent=eventKey;state.lastOk=!!ok;state.lastError=error?String(error?.message||error):null;state.lastAt=new Date().toISOString();state.lastSkippedReason=null;
  }
  function rememberSkip(eventKey,reason){
    state.lastEvent=eventKey;state.lastOk=null;state.lastError=null;state.lastAt=new Date().toISOString();state.lastSkippedReason=String(reason||'übersprungen');
  }
  function emit(eventKey,data={},options={}){
    if(!adapter){remember(eventKey,false,state.lastError||'KC Communication Adapter nicht bereit');return Promise.resolve({ok:false,skipped:true});}
    return Promise.resolve().then(()=>adapter.emit(eventKey,data,{...options,testOnly:true})).then(result=>{remember(eventKey,true);return result;}).catch(error=>{remember(eventKey,false,error);console.warn('KC DP2 Communication TEST:',eventKey,error?.message||error);return {ok:false,error:error?.message||String(error),testOnly:true};});
  }
  function fire(eventKey,data={},options={}){
    Promise.resolve().then(()=>emit(eventKey,data,options));
  }
  function manualHealth(){
    if(!client)return Promise.resolve({ok:false,error:'KC Communication Client nicht bereit'});
    return client.health().then(result=>{remember('health',true);return result;}).catch(error=>{remember('health',false,error);return {ok:false,error:error?.message||String(error)};});
  }

  // Domain hooks: normal DP2 return values and exceptions stay untouched.
  if(typeof K.publishPlan==='function'&&!K.publishPlan.__kcCommunicationWrapped){
    const original=K.publishPlan;
    const wrapped=function(...args){
      const snapshot=original.apply(this,args);
      const oid=orgId();
      if(oid){
        fire('plan_released',{orgId:oid,periodLabel:periodLabel(),version:snapshot?.version,publishedAt:snapshot?.publishedAt},{orgId:oid});
      }else{
        rememberSkip('plan_released','Keine echte orgId vorhanden; zentrales Event nicht gesendet.');
      }
      return snapshot;
    };
    wrapped.__kcCommunicationWrapped=true;K.publishPlan=wrapped;
  }

  if(K.mutations&&typeof K.mutations.saveShift==='function'&&!K.mutations.saveShift.__kcCommunicationWrapped){
    const original=K.mutations.saveShift;
    const wrapped=function(candidate,options){
      const result=original.apply(this,arguments);
      const row=result?.record||candidate||{};
      if(row?.personId&&row?.date&&Number.isFinite(Number(row?.start))&&Number.isFinite(Number(row?.end))){
        fire('shift_changed',{personId:String(row.personId),date:String(row.date),from:fmtTime(row.start),to:fmtTime(row.end),zone:row.zone||null,area:row.area||null,shiftId:row.id||null});
      }
      return result;
    };
    wrapped.__kcCommunicationWrapped=true;K.mutations.saveShift=wrapped;
  }

  if(K.pushAdapter&&typeof K.pushAdapter.createReplacement==='function'&&!K.pushAdapter.createReplacement.__kcCommunicationWrapped){
    const original=K.pushAdapter.createReplacement;
    const wrapped=function(input={}){
      const result=original.apply(this,arguments);
      const ids=Array.isArray(input.personIds)?input.personIds.filter(Boolean):[];
      if(input.date&&present(input.start)&&present(input.end)&&ids.length){
        Promise.resolve(result).then(()=>{
          fire('replacement_requested',{date:String(input.date),from:String(input.start),to:String(input.end),recipientPersonIds:ids.map(String),area:input.area||null,zone:input.zone||null,reasonCategory:input.reasonCategory||null});
        },()=>{});
      }
      return result;
    };
    wrapped.__kcCommunicationWrapped=true;K.pushAdapter.createReplacement=wrapped;
  }

  K.communicationBridge={version:'0.20.0-p13',state,routing,emit,fire,manualHealth,describe:()=>adapter?.describe?.()||null};

  // P9 status UI is a local-only companion. Loading it performs no KC Communication request.
  if(typeof document!=='undefined'&&!document.getElementById('kcDpCommunicationStatusUi')){
    const s=document.createElement('script');s.id='kcDpCommunicationStatusUi';s.src='src/ui/communication-status-ui.js?v=0.20.0-p9';s.defer=true;document.head.appendChild(s);
  }
})();
