const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const {webcrypto}=require('crypto');

const ROOT='release/v0.19.54/site';
const clientCode=fs.readFileSync(`${ROOT}/vendor/kc-communication/kc-communication-client.js`,'utf8');
const adapterCode=fs.readFileSync(`${ROOT}/vendor/kc-communication/kc-communication-adapters.js`,'utf8');
const bridgeCode=fs.readFileSync(`${ROOT}/src/adapters/communication-bridge.js`,'utf8');
const html=fs.readFileSync(`${ROOT}/index.html`,'utf8');

assert(html.includes('vendor/kc-communication/kc-communication-client.js?v=0.1.0'),'KC Communication Client wird nicht geladen');
assert(html.includes('vendor/kc-communication/kc-communication-adapters.js?v=0.1.0'),'KC Communication Adapter wird nicht geladen');
assert(html.includes('src/adapters/communication-bridge.js?v=0.20.0-p8'),'DP2 Communication Bridge wird nicht geladen');
assert(html.indexOf('src/ui/app.js')<html.indexOf('src/adapters/communication-bridge.js'),'Communication Bridge muss erst nach app.js geladen werden');
assert(bridgeCode.includes("defaultTestOnly:true"),'Bridge muss TEST als Default erzwingen');
assert(bridgeCode.includes("testOnly:true"),'Bridge darf LIVE nicht freischalten');
assert(!bridgeCode.includes('.health()')||bridgeCode.includes('manualHealth'),'Health darf nur manuell aufgerufen werden');
assert(!bridgeCode.includes("orgId:orgId()||'kc-dp2'"),'Bridge darf keine erfundene orgId senden');

const calls=[];
let failNetwork=false;
const fetchMock=async(url,opt={})=>{
  calls.push({url,opt,body:opt.body?JSON.parse(opt.body):null});
  if(failNetwork)throw new Error('simulierter Kommunikationsausfall');
  return {ok:true,status:200,json:async()=>({ok:true,test:true})};
};
const K={
  integrationConfig:{supabase:{orgId:'ORG-TEST'}},
  days:[{date:'2026-12-04'},{date:'2026-12-13'}],
  supabaseConnection:{sessionSnapshot:()=>({access_token:'TEST-TOKEN'})},
  publishPlan:()=>({version:7,publishedAt:'2026-08-22T18:00:00Z'}),
  mutations:{saveShift:(candidate)=>({record:{...candidate,id:'S-1'}})},
  pushAdapter:{createReplacement:(input)=>Promise.resolve({ok:true,input})}
};
const context={window:{KCDP:K},globalThis:null,console,fetch:fetchMock,AbortController,setTimeout,clearTimeout,Promise,crypto:webcrypto};
context.globalThis=context.window;
vm.createContext(context);
vm.runInContext(clientCode,context,{filename:'kc-communication-client.js'});
vm.runInContext(adapterCode,context,{filename:'kc-communication-adapters.js'});
vm.runInContext(bridgeCode,context,{filename:'communication-bridge.js'});

assert.strictEqual(calls.length,0,'KC Communication darf beim DP2-Start keinen Netzwerkaufruf auslösen');
assert.strictEqual(K.communicationBridge.state.mode,'test','Bridge muss im TEST-Modus starten');
assert.strictEqual(K.communicationBridge.state.ready,true,'Bridge muss mit offiziellem SDK bereit sein');

const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
(async()=>{
  const pub=K.publishPlan({publishedBy:'Test'});
  assert.strictEqual(pub.version,7,'publishPlan-Rückgabewert darf nicht verändert werden');
  await tick();
  assert.strictEqual(calls.length,1,'plan_released muss genau ein Event auslösen');
  assert.strictEqual(calls[0].body.eventKey,'plan_released');
  assert.strictEqual(calls[0].body.testOnly,true,'plan_released muss TEST-only bleiben');
  assert.strictEqual(calls[0].body.sourceProgram,'kc-dp2');
  assert.strictEqual(calls[0].body.data.orgId,'ORG-TEST','plan_released muss die echte orgId verwenden');

  const shift=K.mutations.saveShift({personId:'P-1',date:'2026-12-04',start:12,end:16,zone:'front',area:'Verkauf'});
  assert.strictEqual(shift.record.id,'S-1','saveShift-Rückgabewert darf nicht verändert werden');
  await tick();
  assert.strictEqual(calls.length,2,'shift_changed muss genau ein Event auslösen');
  assert.strictEqual(calls[1].body.eventKey,'shift_changed');
  assert.strictEqual(calls[1].body.testOnly,true);
  assert.deepStrictEqual(calls[1].body.recipients,[{personId:'P-1'}]);

  const replacementPromise=K.pushAdapter.createReplacement({date:'2026-12-05',start:'14:00',end:'18:00',personIds:['P-2','P-3'],area:'Hinten',zone:'back'});
  const replacement=await replacementPromise;
  assert.strictEqual(replacement.ok,true,'bestehende Replacement-Funktion muss normal zurückkehren');
  await tick();
  assert.strictEqual(calls.length,3,'replacement_requested muss genau ein Event auslösen');
  assert.strictEqual(calls[2].body.eventKey,'replacement_requested');
  assert.strictEqual(calls[2].body.testOnly,true);
  assert.deepStrictEqual(calls[2].body.recipients,[{personId:'P-2'},{personId:'P-3'}]);

  await K.pushAdapter.createReplacement({date:'2026-12-05',start:0,end:1,personIds:['P-5']});
  await tick();
  assert.strictEqual(calls.length,4,'replacement_requested muss numerische Startzeit 0 akzeptieren');
  assert.strictEqual(calls[3].body.data.from,'0');
  assert.strictEqual(calls[3].body.data.to,'1');

  const beforeNoOrg=calls.length;
  K.integrationConfig.supabase.orgId='';
  const pubNoOrg=K.publishPlan({publishedBy:'Test'});
  assert.strictEqual(pubNoOrg.version,7,'publishPlan muss auch ohne orgId normal zurückkehren');
  await tick();
  assert.strictEqual(calls.length,beforeNoOrg,'plan_released darf ohne echte orgId nicht gesendet werden');
  assert.strictEqual(K.communicationBridge.state.lastEvent,'plan_released');
  assert(/Keine echte orgId/i.test(K.communicationBridge.state.lastSkippedReason||''),'fehlende orgId muss diagnostizierbar protokolliert werden');
  K.integrationConfig.supabase.orgId='ORG-TEST';

  failNetwork=true;
  const before=calls.length;
  const out=K.mutations.saveShift({personId:'P-4',date:'2026-12-06',start:10,end:12});
  assert.strictEqual(out.record.personId,'P-4','Kommunikationsausfall darf saveShift nicht stören');
  await tick();await tick();
  assert(calls.length>before,'Fehlerpfad muss den Kommunikationsversuch ausführen');
  assert.strictEqual(K.communicationBridge.state.lastOk,false,'Kommunikationsfehler muss im Bridge-State sichtbar sein');
  assert(/nicht erreichbar|simulierter Kommunikationsausfall/i.test(K.communicationBridge.state.lastError||''),'Fehler muss diagnostizierbar bleiben');

  console.log('KC DP2 V0.20 P12 Communication Bridge Gate PASS');
})().catch(err=>{console.error(err);process.exit(1);});
