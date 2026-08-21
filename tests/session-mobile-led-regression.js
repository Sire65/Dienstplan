const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const launchOptions={headless:true};
  if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'de-DE'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.runtimeRecoveryBridge,{timeout:20000});

  await page.waitForSelector('#idbStatusLed',{state:'attached',timeout:5000});
  await page.waitForSelector('#idbTrafficLed',{state:'attached',timeout:5000});
  await page.waitForSelector('#supabaseStatusLed',{state:'attached',timeout:5000});
  await page.waitForSelector('#supabaseTrafficLed',{state:'attached',timeout:5000});
  assert.strictEqual(await page.locator('#idbTrafficLed').count(),1,'IDX traffic LED missing or duplicated');
  assert.strictEqual(await page.locator('#supabaseTrafficLed').count(),1,'SUP traffic LED missing or duplicated');
  assert.strictEqual(await page.locator('#kcMobileDbStatus').count(),0,'obsolete duplicate mobile IDX/SUP block is visible');

  await page.evaluate(()=>{
    const back=document.getElementById('modalBackdrop');
    const modal=document.getElementById('modal');
    back.classList.remove('hidden');document.body.classList.add('modal-open');
    modal.innerHTML='<h2>👤 Anmeldung / Monitor</h2><div class="ai-summary"><b>Aktuell:</b> Planer · Planer</div><div class="modal-actions"><button id="sessionClose">Schließen</button></div><button id="kcDiagnosticsAdminEntry">🛠 Zentrale Fehlerdiagnose</button>';
    window.KCDP.runtimeRecoveryBridge.apply();
  });
  await page.waitForSelector('#kcSessionTopClose',{state:'visible',timeout:5000});
  const size=await page.locator('#kcSessionTopClose').boundingBox();
  assert(size && size.width>=44 && size.height>=44,'Close button touch target too small');

  await page.locator('#kcDiagnosticsAdminEntry').tap();
  await page.waitForFunction(()=>!!document.getElementById('kcDiagOverlay')||!!document.getElementById('kcDiagRecoveryOverlay'),{timeout:5000});
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Session modal still blocks diagnostics');
  if(await page.locator('#kcDiagClose').count())await page.locator('#kcDiagClose').tap();
  if(await page.locator('#kcDiagRecoveryClose').count())await page.locator('#kcDiagRecoveryClose').tap();

  await page.evaluate(()=>{
    const back=document.getElementById('modalBackdrop'),modal=document.getElementById('modal');
    back.classList.remove('hidden');document.body.classList.add('modal-open');modal.innerHTML='<h2>👤 Anmeldung / Monitor</h2><button id="sessionClose">Schließen</button>';window.KCDP.runtimeRecoveryBridge.apply();
  });
  await page.locator('#kcSessionTopClose').tap();
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Top close X did not close modal');

  await page.evaluate(()=>{
    const back=document.getElementById('modalBackdrop'),modal=document.getElementById('modal');
    back.classList.remove('hidden');document.body.classList.add('modal-open');modal.innerHTML='<h2>👤 Anmeldung / Monitor</h2><button id="sessionClose">Schließen</button>';window.KCDP.runtimeRecoveryBridge.apply();
  });
  await page.locator('#sessionClose').tap();
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Bottom close button did not close modal');
  assert(!errors.length,'Browser page errors: '+errors.join(' | '));

  console.log('KC DP2 real traffic LED / session / diagnostics regression: PASS');
  await browser.close();
})().catch(err=>{console.error('KC DP2 real traffic LED / session / diagnostics regression: FAIL');console.error(err.stack||err);process.exit(1);});
