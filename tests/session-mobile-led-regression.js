const { chromium } = require('playwright');
const assert = require('assert');

const checkpoint=(name)=>console.log(`[mobile-regression] ${new Date().toISOString()} ${name}`);
const watchdog=setTimeout(()=>{
  console.error('KC DP2 real traffic LED / session / diagnostics regression: FAIL');
  console.error('Hard timeout after 60s');
  process.exit(124);
},60000);

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
  checkpoint('wait recovery bridge');
  await page.waitForFunction(()=>window.KCDP?.runtimeRecoveryBridge,{timeout:10000});

  checkpoint('check real LEDs');
  await page.waitForSelector('#idbStatusLed',{state:'attached',timeout:3000});
  await page.waitForSelector('#idbTrafficLed',{state:'attached',timeout:3000});
  await page.waitForSelector('#supabaseStatusLed',{state:'attached',timeout:3000});
  await page.waitForSelector('#supabaseTrafficLed',{state:'attached',timeout:3000});
  assert.strictEqual(await page.locator('#idbTrafficLed').count(),1,'IDX traffic LED missing or duplicated');
  assert.strictEqual(await page.locator('#supabaseTrafficLed').count(),1,'SUP traffic LED missing or duplicated');
  assert.strictEqual(await page.locator('#kcMobileDbStatus').count(),0,'obsolete duplicate mobile IDX/SUP block is visible');

  checkpoint('build session modal');
  await page.evaluate(()=>{
    const back=document.getElementById('modalBackdrop');
    const modal=document.getElementById('modal');
    back.classList.remove('hidden');document.body.classList.add('modal-open');
    modal.innerHTML='<h2>👤 Anmeldung / Monitor</h2><div class="ai-summary"><b>Aktuell:</b> Planer · Planer</div><div class="modal-actions"><button id="sessionClose">Schließen</button></div><button id="kcDiagnosticsAdminEntry">🛠 Zentrale Fehlerdiagnose</button>';
    window.KCDP.runtimeRecoveryBridge.apply();
  });
  await page.waitForSelector('#kcSessionTopClose',{state:'visible',timeout:3000});
  const size=await page.locator('#kcSessionTopClose').boundingBox();
  assert(size && size.width>=44 && size.height>=44,'Close button touch target too small');

  checkpoint('tap diagnostics');
  await page.locator('#kcDiagnosticsAdminEntry').tap({timeout:5000});
  checkpoint('wait diagnostics overlay');
  await page.waitForFunction(()=>!!document.getElementById('kcDiagOverlay')||!!document.getElementById('kcDiagRecoveryOverlay'),{timeout:5000});
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Session modal still blocks diagnostics');
  checkpoint('close diagnostics');
  if(await page.locator('#kcDiagClose').count())await page.locator('#kcDiagClose').tap({timeout:3000});
  if(await page.locator('#kcDiagRecoveryClose').count())await page.locator('#kcDiagRecoveryClose').tap({timeout:3000});

  checkpoint('test top close');
  await page.evaluate(()=>{
    const back=document.getElementById('modalBackdrop'),modal=document.getElementById('modal');
    back.classList.remove('hidden');document.body.classList.add('modal-open');modal.innerHTML='<h2>👤 Anmeldung / Monitor</h2><button id="sessionClose">Schließen</button>';window.KCDP.runtimeRecoveryBridge.apply();
  });
  await page.locator('#kcSessionTopClose').tap({timeout:5000});
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Top close X did not close modal');

  checkpoint('test bottom close');
  await page.evaluate(()=>{
    const back=document.getElementById('modalBackdrop'),modal=document.getElementById('modal');
    back.classList.remove('hidden');document.body.classList.add('modal-open');modal.innerHTML='<h2>👤 Anmeldung / Monitor</h2><button id="sessionClose">Schließen</button>';window.KCDP.runtimeRecoveryBridge.apply();
  });
  await page.locator('#sessionClose').tap({timeout:5000});
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Bottom close button did not close modal');
  assert(!errors.length,'Browser page errors: '+errors.join(' | '));

  checkpoint('PASS');
  console.log('KC DP2 real traffic LED / session / diagnostics regression: PASS');
  clearTimeout(watchdog);
  await browser.close();
})().catch(err=>{clearTimeout(watchdog);console.error('KC DP2 real traffic LED / session / diagnostics regression: FAIL');console.error(err.stack||err);process.exit(1);});
