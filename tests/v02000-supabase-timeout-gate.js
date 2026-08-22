const fs=require('fs');const vm=require('vm');const assert=require('assert');
const provider=fs.readFileSync('release/v0.19.54/site/src/adapters/supabase-provider.js','utf8');
function context(fetchImpl){const window={KCDP:{integrationConfig:{supabase:{url:'https://abc.supabase.co',publishableKey:'sb_publishable_test',orgId:'org',projectId:'proj',authMode:'password'}},storage:{unlocked:false}}};const ctx={window,globalThis:window,fetch:fetchImpl,console,Date,Math,JSON,String,Number,Array,Object,RegExp,Error,Promise,encodeURIComponent,setTimeout,clearTimeout,atob:s=>Buffer.from(s,'base64').toString('binary'),navigator:{onLine:true},location:{protocol:'https:',origin:'https://example.test'},isSecureContext:true};vm.createContext(ctx);vm.runInContext(provider,ctx);return window.KCDP.supabaseConnection;}
(async()=>{
 let calls=0;const timeoutErr=Object.assign(new Error('Keine Antwort innerhalb von 15 Sekunden.'),{name:'KCDPNetworkTimeoutError',code:'KC_DP_NETWORK_TIMEOUT',timeoutMs:15000});
 let sup=context(async()=>{calls++;throw timeoutErr});
 await assert.rejects(()=>sup.signInWithPassword({email:'a@b.de',password:'x'}),e=>e.code==='KC_DP_NETWORK_TIMEOUT'&&e.timeoutMs===15000);
 assert.strictEqual(calls,1,'Timeout darf keine zweite Transportdiagnose starten');
 assert.strictEqual(sup.state.transport.detail,'Supabase hat innerhalb der zulässigen Zeit nicht geantwortet.');
 calls=0;let diagnosisOptions=null;sup=context(async(url,opt)=>{calls++;if(calls===1)throw new Error('network down');diagnosisOptions=opt;return {ok:true};});
 await assert.rejects(()=>sup.signInWithPassword({email:'a@b.de',password:'x'}),/KC Sync ist nicht erreichbar/);
 assert.strictEqual(calls,2,'Normale Netzwerkfehler dürfen genau eine Transportdiagnose starten');
 assert.strictEqual(diagnosisOptions.kcTimeoutMs,3000,'Transportdiagnose muss auf 3 Sekunden begrenzt sein');
 console.log('P10 Supabase timeout gate: OK');
})().catch(e=>{console.error(e);process.exit(1)});
