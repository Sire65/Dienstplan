const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const launchOptions={headless:true};
  if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:1280,height:800},locale:'de-DE'});
  const page=await context.newPage();
  await page.route('https://*.supabase.co/**',route=>route.abort());
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.integrations&&window.KCDP?.pushAdapter,{timeout:20000});

  const out=await page.evaluate(()=>{
    const K=window.KCDP;
    const expectedRef='ptblnpiroqftcvlsrhac';
    const expectedKey='sb_publishable_SqXIeGN-clcZ4gjmpLdSww_4DLfyy24';
    const active=K.integrations.snapshot().supabase;
    K.integrationConfig={...K.integrationConfig,supabase:{
      ...active,
      url:'https://iddudrxuihdodnvejxcp.supabase.co',
      publishableKey:'sb_publishable_DWLycZijZEBvakXVncI5IQ_38LZCQxW',
      supabaseProjectRef:'iddudrxuihdodnvejxcp',
      profile:'FUTURA_SHARED_PROJECT'
    }};
    const migrated=K.integrations.snapshot().supabase;
    const raw=new Uint8Array([4,91,17,222,3,244,88,199]);
    let s='';for(const b of raw)s+=String.fromCharCode(b);
    const key=btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const same=K.pushAdapter.sameApplicationServerKey({options:{applicationServerKey:raw.buffer}},key);
    const different=K.pushAdapter.sameApplicationServerKey({options:{applicationServerKey:new Uint8Array([1,2,3]).buffer}},key);
    return {expectedRef,expectedKey,active,migrated,same,different,pushVersion:K.pushAdapter.version,integrationsVersion:K.integrations.version};
  });

  assert.strictEqual(out.active.supabaseProjectRef,out.expectedRef,'Aktives Supabase-Ziel ist nicht das dedizierte KC-DP2-Projekt');
  assert(out.active.url.includes(out.expectedRef),'Aktive Supabase-URL ist falsch');
  assert.strictEqual(out.active.publishableKey,out.expectedKey,'Publishable Key des dedizierten Projekts fehlt');
  assert.strictEqual(out.active.profile,'KC_DP_DEDICATED_PROJECT','Falsches Integrationsprofil');
  assert.strictEqual(out.migrated.supabaseProjectRef,out.expectedRef,'Alte Academy-Konfiguration wurde nicht migriert');
  assert(out.migrated.url.includes(out.expectedRef),'Academy-URL blieb nach Migration aktiv');
  assert.strictEqual(out.migrated.publishableKey,out.expectedKey,'Academy-Key blieb nach Migration aktiv');
  assert.strictEqual(out.migrated.migratedFrom,'FUTURA_SHARED_PROJECT','Migration wird nicht nachvollziehbar markiert');
  assert.strictEqual(out.same,true,'VAPID-Keyvergleich erkennt identischen Key nicht');
  assert.strictEqual(out.different,false,'VAPID-Keyvergleich erkennt Key-Wechsel nicht');
  assert.strictEqual(out.pushVersion,'0.19.41','Push-Adapter ist nicht V0.19.41');
  assert.strictEqual(out.integrationsVersion,'0.19.41','Integrations-Core ist nicht V0.19.41');
  console.log('KC DP2 V0.19.41 dediziertes Supabase-Ziel und VAPID-Keyvergleich: PASS');
  await browser.close();
})().catch(err=>{console.error(err);process.exitCode=1;});
