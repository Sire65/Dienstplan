const { chromium } = require('playwright');
const assert = require('assert');
let browser;

(async()=>{
  const launchOptions={headless:true};if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:1280,height:800},locale:'de-DE'});
  const page=await context.newPage();
  await page.route('**/src/core/member-access.js*',async route=>{const response=await route.fetch();let body=await response.text();const marker="function configured(){const c=publicConfig();return /^https:\\/\\//.test(c.url)&&String(c.publishableKey||'').trim().length>20;}";if(!body.includes(marker))throw new Error('member-access configured()-Marker nicht gefunden');body=body.replace(marker,'function configured(){return false;}');await route.fulfill({response,body,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});});
  await page.route('https://*.supabase.co/**',route=>route.abort());
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.sourceHealth&&window.KCDP?.sourceHealthUi,{timeout:20000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');await page.locator('#uxTestLogin').click();await page.waitForSelector('#unlockSecret',{timeout:10000});await page.locator('#unlockSecret').fill('KC-DP2-Source-Health-E2E-2026!');await page.locator('#unlockBtn').click();await page.waitForSelector('#kcChoiceView',{timeout:20000});await page.locator('#kcChoiceEdit').click();await page.waitForSelector('#sourceHealthCard',{timeout:10000});
  const initial=await page.evaluate(()=>({snapshot:window.KCDP.sourceHealth.snapshot(),text:document.querySelector('#sourceHealthCard')?.innerText||''}));assert.ok(['authoritative','mixed','local'].includes(initial.snapshot.overall),'Datenquellenstatus muss klassifiziert sein');assert.ok(/Datenquellen/.test(initial.text),'Datenquellenkarte fehlt');

  const authoritative=await page.evaluate(()=>{const K=window.KCDP,d=K.days[K.state.dateIndex];Object.assign(K.personAdapter.state,{status:'ready',source:'supabase_core_manager',records:18,lastBlock:null});Object.assign(K.pcManagerConnection.state,{status:'ready',mode:'supabase',lastSource:'supabase_core_manager',lastBlock:null});d.weather={...(d.weather||{}),temp:5,condition:'klar',source:'supabase_core_manager',fetchedAt:new Date().toISOString()};d.program=[{title:'Testprogramm',start:d.start+1,end:d.start+2,source:'supabase_core_manager'}];K.sourceHealthUi.refresh();return K.sourceHealth.snapshot();});
  await page.waitForFunction(()=>document.querySelector('#sourceHealthCard')?.dataset.sourceOverall==='authoritative',null,{timeout:10000});const authText=await page.locator('#sourceHealthCard').innerText();assert.strictEqual(authoritative.overall,'authoritative');assert.ok(/PC-Manager\/KC-Core führend/.test(authText));assert.ok(/KC-Core\/Manager/.test(authText));assert.ok(/bereit/.test(authText));

  const mixed=await page.evaluate(()=>{const K=window.KCDP;Object.assign(K.personAdapter.state,{status:'ready',source:'local_snapshot',records:20,lastBlock:null});Object.assign(K.pcManagerConnection.state,{status:'partial',lastSource:'supabase_core_manager',lastBlock:{reason:'Wetter/Programm sind noch nicht vollständig freigegeben.'}});K.sourceHealthUi.refresh();return K.sourceHealth.snapshot();});
  await page.waitForFunction(()=>document.querySelector('#sourceHealthCard')?.dataset.sourceOverall==='mixed',null,{timeout:10000});const mixedText=await page.locator('#sourceHealthCard').innerText();assert.strictEqual(mixed.overall,'mixed');assert.ok(/Gemischte Datenquellen/.test(mixedText));assert.ok(/teilweise/.test(mixedText));assert.ok(/noch nicht vollständig freigegeben/.test(mixedText));

  const html=await page.content();assert.ok(!/service_role/i.test(documentSafe(html)),'Datenquellenanzeige darf keine Service-Role-Bezeichnung/Secrets ausgeben');console.log('KC DP2 V0.19.42 Datenquellenstatus: führend / gemischt / lokal PASS');await browser.close();browser=null;
  function documentSafe(v){return String(v).replace(/src\/core\/source-health\.js/gi,'');}
})().catch(async err=>{console.error(err);try{await browser?.close();}catch(_){}process.exitCode=1;});
