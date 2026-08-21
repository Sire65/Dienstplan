const { chromium } = require('playwright');
const assert = require('assert');

const checkpoint=name=>console.log(`[mobile-regression] ${new Date().toISOString()} ${name}`);
const watchdog=setTimeout(()=>{
  console.error('KC DP2 real traffic LED / session / diagnostics regression: FAIL');
  console.error('Hard timeout after 45s');
  process.exit(124);
},45000);

(async()=>{
  const launchOptions={headless:true};
  if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  checkpoint('launch browser');
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'de-DE'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));

  await page.route('**/src/core/member-access.js*',async route=>{
    const response=await route.fetch();
    let body=await response.text();
    const marker="function configured(){const c=publicConfig();return /^https:\\/\\//.test(c.url)&&String(c.publishableKey||'').trim().length>20;}";
    if(!body.includes(marker))throw new Error('member-access configured()-Marker nicht gefunden');
    body=body.replace(marker,'function configured(){return false;}');
    await route.fulfill({response,body,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });

  checkpoint('goto app');
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:15000});
  checkpoint('real mobile login');
  await page.waitForFunction(()=>window.KCDP?.roleUx&&window.KCDP?.memberAccess&&window.KCDP?.diagnosticsCenter?.version==='0.19.65-clean3',{timeout:15000});
  assert.strictEqual(await page.evaluate(()=>!!window.KCDP?.runtimeRecoveryBridge),false,'legacy recovery bridge must not be loaded');
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:10000});
  const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');
  if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');
  await page.locator('#uxTestLogin').click();
  await page.waitForSelector('#unlockSecret',{timeout:8000});
  await page.locator('#unlockSecret').fill('KC-DP2-Mobile-Smoke-2026!');
  await page.locator('#unlockBtn').click();
  await page.waitForSelector('#kcChoiceEdit',{state:'visible',timeout:12000});
  await page.locator('#kcChoiceEdit').click();
  await page.waitForFunction(()=>document.body.classList.contains('ux-legacy'),{timeout:8000});
  await page.waitForSelector('#userBtn',{state:'visible',timeout:5000});

  checkpoint('check real LEDs');
  for(const id of ['#idbStatusLed','#idbTrafficLed','#supabaseStatusLed','#supabaseTrafficLed'])await page.waitForSelector(id,{state:'attached',timeout:3000});
  assert.strictEqual(await page.locator('#idbTrafficLed').count(),1,'IDX traffic LED missing or duplicated');
  assert.strictEqual(await page.locator('#supabaseTrafficLed').count(),1,'SUP traffic LED missing or duplicated');
  assert.strictEqual(await page.locator('#kcMobileDbStatus').count(),0,'obsolete duplicate mobile IDX/SUP block is visible');

  checkpoint('prepare heavy diagnostics payload');
  await page.evaluate(()=>{
    const K=window.KCDP;
    const heavy=Array.from({length:500},(_,i)=>({id:`E${i}`,severity:i%9===0?'critical':'error',status:i%3===0?'reviewed':'new',error_code:`freeze.sample.${i}`,message:'x'.repeat(300),occurrence_count:i+1,last_seen_at:new Date(Date.now()-i*1000).toISOString(),member_name:'Test',person_id:'TEST',device_id:`DEV-${i}`,platform:'Android',browser:'Chrome',online:true,source:'android-regression'}));
    if(!K.diagnostics)K.diagnostics={};
    window.__kcAdminListCalls=0;
    K.diagnostics.adminList=limit=>{window.__kcAdminListCalls++;return new Promise(resolve=>setTimeout(()=>resolve(heavy.slice(0,limit||500)),250))};
    K.diagnostics.setStatus=async()=>true;
    window.__kcHeartbeat=0;
    window.__kcHeartbeatTimer=setInterval(()=>window.__kcHeartbeat++,25);
  });

  checkpoint('open real session panel');
  await page.locator('#userBtn').tap({timeout:3000});
  await page.waitForSelector('#kcDiagnosticsAdminEntry',{state:'visible',timeout:3000});
  await page.waitForSelector('#kcSessionTopClose',{state:'visible',timeout:3000});
  const size=await page.locator('#kcSessionTopClose').boundingBox();
  assert(size&&size.width>=44&&size.height>=44,'Close button touch target too small');

  checkpoint('tap diagnostics without database access');
  const started=Date.now();
  await page.locator('#kcDiagnosticsAdminEntry').tap({timeout:3000});
  await page.waitForSelector('#kcDiagOverlay',{state:'visible',timeout:1000});
  assert(Date.now()-started<1500,'diagnostics shell did not open immediately');
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Session modal still blocks diagnostics');
  await page.waitForTimeout(700);
  assert.strictEqual(await page.evaluate(()=>window.__kcAdminListCalls),0,'opening diagnostics unexpectedly accessed database');
  const heartbeatBeforeLoad=await page.evaluate(()=>window.__kcHeartbeat);
  assert(heartbeatBeforeLoad>=15,`main thread stalled while idle diagnostics shell was open; heartbeat=${heartbeatBeforeLoad}`);
  assert(await page.locator('#kcDiagLoad').isVisible(),'explicit diagnostics load button missing');

  checkpoint('load diagnostics explicitly');
  await page.locator('#kcDiagLoad').tap({timeout:3000});
  await page.waitForFunction(()=>window.__kcAdminListCalls===1,{timeout:2000});
  await page.waitForSelector('.kc-diag-mobile-card',{state:'visible',timeout:3000});
  const cards=await page.locator('.kc-diag-mobile-card').count();
  assert(cards>0&&cards<=80,`diagnostics rendered invalid mobile card count: ${cards}`);
  const heartbeatAfterLoad=await page.evaluate(()=>window.__kcHeartbeat);
  assert(heartbeatAfterLoad>heartbeatBeforeLoad,'main thread stopped after explicit diagnostics load');

  checkpoint('close diagnostics');
  await page.locator('#kcDiagClose').tap({timeout:3000});
  await page.waitForSelector('#kcDiagOverlay',{state:'hidden',timeout:1000});

  checkpoint('reopen session and test closes');
  await page.locator('#userBtn').tap({timeout:3000});
  await page.waitForSelector('#kcSessionTopClose',{state:'visible',timeout:3000});
  await page.locator('#kcSessionTopClose').tap({timeout:3000});
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Top close X did not close modal');

  await page.locator('#userBtn').tap({timeout:3000});
  await page.waitForSelector('#sessionClose',{state:'visible',timeout:3000});
  await page.locator('#sessionClose').tap({timeout:3000});
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Bottom close button did not close modal');

  await page.evaluate(()=>clearInterval(window.__kcHeartbeatTimer));
  assert(!errors.length,'Browser page errors: '+errors.join(' | '));

  checkpoint('PASS');
  console.log('KC DP2 real traffic LED / session / diagnostics regression: PASS');
  clearTimeout(watchdog);
  await browser.close();
})().catch(err=>{clearTimeout(watchdog);console.error('KC DP2 real traffic LED / session / diagnostics regression: FAIL');console.error(err.stack||err);process.exit(1);});
