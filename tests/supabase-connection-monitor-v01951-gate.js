'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const SRC=fs.readFileSync(path.join(ROOT,'release/v0.19.51/site/src/core/supabase-connection-monitor.js'),'utf8');
for(const needle of ['monitor3','failures<3','automatische Wiederverbindung','healthCheck','visibilitychange','browser-online','enforceLed','MutationObserver'])assert.ok(SRC.includes(needle),'Supabase monitor contract fehlt: '+needle);

class MO{constructor(cb){this.cb=cb}observe(){}disconnect(){}}
function makeContext(){
  const led={className:'led led-status error',title:'',dataset:{},classList:{contains(v){return led.className.split(/\s+/).includes(v)}}};
  const timers=[];
  const listeners={};
  const syncListeners=[];
  const K={
    integrationConfig:{supabase:{onlineSyncEnabled:true}},
    state:{supabaseConnected:false},
    sync:{
      hasProvider:()=>true,
      healthCheck:async()=>({ok:true}),
      on(fn){syncListeners.push(fn);return()=>{};}
    },
    supabaseConnection:{ensureSession:async()=>({ok:true}),configureIfPossible(){} }
  };
  const document={readyState:'loading',visibilityState:'visible',getElementById:id=>id==='supabaseStatusLed'?led:null,addEventListener:(t,fn)=>{listeners[t]=fn}};
  const context={window:{KCDP:K},document,navigator:{onLine:true},MutationObserver:MO,queueMicrotask:fn=>fn(),setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},addEventListener:(t,fn)=>{listeners[t]=fn},Date,console,Promise};
  vm.createContext(context);vm.runInContext(SRC,context,{filename:'supabase-connection-monitor.js'});
  return {K,led,timers,listeners,syncListeners};
}
(async()=>{
  const x=makeContext(),m=x.K.supabaseConnectionMonitor;
  assert.ok(m,'Monitor wurde nicht registriert');
  m.start();
  assert.ok(x.led.className.includes('maintenance'),'Start muss gelb/prüfend sein');
  let r=await m.check('gate-success');
  assert.equal(r.ok,true);assert.ok(x.led.className.includes('ok'),'Erfolgreicher Healthcheck muss grün sein');assert.equal(x.K.state.supabaseConnected,true);
  x.led.className='led led-status error';m.enforceLed();assert.ok(x.led.className.includes('ok'),'Fremdes Rot muss bei gesundem Monitor zurück auf Grün korrigiert werden');
  x.K.sync.healthCheck=async()=>{throw new Error('kurzer Netzfehler')};
  m.state.lastOkAt=new Date().toISOString();m.state.failures=0;
  r=await m.check('gate-short-failure');assert.equal(r.failures,1);assert.ok(x.led.className.includes('maintenance'),'Ein einzelner Fehler darf nicht sofort Rot werden');
  m.state.lastOkAt=null;m.state.failures=2;
  r=await m.check('gate-third-failure');assert.equal(r.failures,3);assert.ok(x.led.className.includes('error'),'Erst drei bestätigte Fehler dürfen Rot setzen');
  x.K.integrationConfig.supabase.onlineSyncEnabled=false;m.state.failures=0;
  r=await m.check('gate-disabled');assert.equal(r.reason,'disabled');assert.ok(x.led.className.includes('maintenance'),'Bewusst deaktivierter Online-Sync ist kein roter Fehler');
  console.log('KC DP2 Supabase startup/heartbeat/reconnect gate: OK');
})().catch(e=>{console.error(e);process.exit(1)});
