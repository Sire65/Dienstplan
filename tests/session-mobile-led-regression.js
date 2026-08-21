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
  await page.waitForFunction(()=>window.KCDP?.diagnosticsCenter?.version==='0.19.65-clean1',{timeout:10000});
  assert.strictEqual(await page.evaluate(()=>!!window.KCDP?.runtimeRecoveryBridge),false,'legacy recovery bridge must not be loaded');

  checkpoint('check real LEDs');
  for(const id of ['#idbStatusLed','#idbTrafficLed','#supabaseStatusLed','#supabaseTrafficLed'])await page.waitForSelector(id,{state:'attached',timeout:3000});
  assert.strictEqual(await page.locator('#idbTrafficLed').count(),1,'IDX traffic LED missing or duplicated');
  assert.strictEqual(await page.locator('#supabaseTrafficLed').count(),1,'SUP traffic LED missing or duplicated');
  assert.strictEqual(await page.locator('#kcMobileDbStatus').count(),0,'obsolete duplicate mobile IDX/SUP block is visible');

  checkpoint('build session modal');
  await page.evaluate(()=>{
    const K=window.KCDP;
    K.currentUser={...(K.currentUser||{}),role:'planner',personId:K.currentUser?.personId||'TEST-PLANNER'};
    if(!K.diagnostics)K.diagnostics={};
    K.diagnostics.adminList=()=>new Promise(resolve=>setTimeout(()=>resolve([]),2000));
    K.diagnostics.setStatus=async()=>true;
    const back=document.getElementById('modalBackdrop'),modal=document.getElementById('modal');
    back.classList.remove('hidden');document.body.classList.add('modal-open');
    modal.innerHTML='<h2>👤 Anmeldung / Monitor</h2><div class="ai-summary"><b>Aktuell:</b> Planer · Planer</div><div class="modal-actions"><button id="sessionClose">Schließen</button></div>';
    K.diagnosticsCenter.ensureSessionControls();
  });
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

  checkpoint('close diagnostics');
  await page.locator('#kcDiagClose').tap({timeout:3000});
  await page.waitForSelector('#kcDiagOverlay',{state:'hidden',timeout:1000});

  checkpoint('test top close');
  await page.evaluate(()=>{
    const back=document.getElementById('modalBackdrop'),modal=document.getElementById('modal');
    back.classList.remove('hidden');document.body.classList.add('modal-open');
    modal.innerHTML='<h2>👤 Anmeldung / Monitor</h2><button id="sessionClose">Schließen</button>';
    window.KCDP.diagnosticsCenter.ensureSessionControls();
  });
  await page.locator('#kcSessionTopClose').tap({timeout:3000});
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Top close X did not close modal');

  checkpoint('test bottom close');
  await page.evaluate(()=>{
    const back=document.getElementById('modalBackdrop'),modal=document.getElementById('modal');
    back.classList.remove('hidden');document.body.classList.add('modal-open');
    modal.innerHTML='<h2>👤 Anmeldung / Monitor</h2><button id="sessionClose">Schließen</button>';
    window.KCDP.diagnosticsCenter.ensureSessionControls();
  });
  await page.locator('#sessionClose').tap({timeout:3000});
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Bottom close button did not close modal');
  assert(!errors.length,'Browser page errors: '+errors.join(' | '));

  checkpoint('PASS');
  console.log('KC DP2 real traffic LED / session / diagnostics regression: PASS');
  clearTimeout(watchdog);
  await browser.close();
})().catch(err=>{clearTimeout(watchdog);console.error('KC DP2 real traffic LED / session / diagnostics regression: FAIL');console.error(err.stack||err);process.exit(1);});
