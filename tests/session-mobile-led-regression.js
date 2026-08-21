const { chromium } = require('playwright');
const assert = require('assert');

const checkpoint=name=>console.log(`[mobile-regression] ${new Date().toISOString()} ${name}`);
const watchdog=setTimeout(()=>{
  console.error('KC DP2 real traffic LED / session / diagnostics regression: FAIL');
  console.error('Hard timeout after 30s');
  process.exit(124);
},30000);

(async()=>{
  const launchOptions={headless:true};
  if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  checkpoint('launch browser');
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'de-DE'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));

  checkpoint('goto app');
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:15000});
  checkpoint('wait diagnostics center');
  await page.waitForFunction(()=>window.KCDP?.diagnosticsCenter?.version==='0.19.65-clean2',{timeout:10000});
  assert.strictEqual(await page.evaluate(()=>!!window.KCDP?.runtimeRecoveryBridge),false,'legacy recovery bridge must not be loaded');

  checkpoint('check real LEDs');
  for(const id of ['#idbStatusLed','#idbTrafficLed','#supabaseStatusLed','#supabaseTrafficLed'])await page.waitForSelector(id,{state:'attached',timeout:3000});
  assert.strictEqual(await page.locator('#idbTrafficLed').count(),1,'IDX traffic LED missing or duplicated');
  assert.strictEqual(await page.locator('#supabaseTrafficLed').count(),1,'SUP traffic LED missing or duplicated');
  assert.strictEqual(await page.locator('#kcMobileDbStatus').count(),0,'obsolete duplicate mobile IDX/SUP block is visible');

  checkpoint('prepare heavy diagnostics payload');
  await page.evaluate(()=>{
    const K=window.KCDP;
    K.currentUser={...(K.currentUser||{}),role:'planner',personId:K.currentUser?.personId||'TEST-PLANNER'};
    const heavy=Array.from({length:500},(_,i)=>({id:`E${i}`,severity:i%9===0?'critical':'error',status:i%3===0?'reviewed':'new',error_code:`test.freeze.${i}`,message:'x'.repeat(300),occurrence_count:i+1,last_seen_at:new Date(Date.now()-i*1000).toISOString(),member_name:'Test',person_id:'TEST',device_id:`DEV-${i}`,platform:'Android',browser:'Chrome',online:true,source:'diagnostic-test'}));
    if(!K.diagnostics)K.diagnostics={};
    K.diagnostics.adminList=limit=>new Promise(resolve=>setTimeout(()=>resolve(heavy.slice(0,limit||500)),250));
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

  checkpoint('tap diagnostics');
  const started=Date.now();
  await page.locator('#kcDiagnosticsAdminEntry').tap({timeout:3000});
  checkpoint('assert diagnostics visible before data returns');
  await page.waitForSelector('#kcDiagOverlay',{state:'visible',timeout:1000});
  assert(Date.now()-started<1500,'diagnostics UI did not open independently of data loading');
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Session modal still blocks diagnostics');

  checkpoint('assert main thread remains responsive');
  await page.waitForTimeout(1200);
  const heartbeat=await page.evaluate(()=>window.__kcHeartbeat);
  assert(heartbeat>=20,`main thread stalled after diagnostics open; heartbeat=${heartbeat}`);
  const cards=await page.locator('.kc-diag-mobile-card').count();
  assert(cards<=80,`diagnostics rendered too many mobile cards: ${cards}`);

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
