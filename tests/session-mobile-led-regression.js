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
  await page.waitForFunction(()=>window.KCDP?.sessionMobileHotfix,{timeout:20000});

  // Mobile status area must be restorable by the production hotfix.
  await page.evaluate(()=>{
    let root=document.getElementById('kcdpUxRoot');
    root.innerHTML='<header class="ux-topbar"><button class="ux-userchip">Benutzer</button></header>';
    window.KCDP.sessionMobileHotfix.apply();
  });
  await page.waitForSelector('#kcMobileDbStatus',{state:'attached',timeout:5000});
  assert(await page.locator('#kcMobileIdxLed').count(),'IDX LED missing');
  assert(await page.locator('#kcMobileSupLed').count(),'SUP LED missing');

  // Reproduce the exact Anmeldung / Monitor modal seen on Android.
  await page.evaluate(()=>{
    const back=document.getElementById('modalBackdrop');
    const modal=document.getElementById('modal');
    back.classList.remove('hidden');
    document.body.classList.add('modal-open');
    modal.innerHTML='<h2>👤 Anmeldung / Monitor</h2><div class="ai-summary"><b>Aktuell:</b> Test · Administrator</div><div class="modal-actions"><button id="sessionClose">Schließen</button></div><button id="kcDiagnosticsAdminEntry">🛠 Zentrale Fehlerdiagnose</button>';
    window.KCDP.sessionMobileHotfix.apply();
  });
  await page.waitForSelector('#kcSessionTopClose',{state:'visible',timeout:5000});
  const size=await page.locator('#kcSessionTopClose').boundingBox();
  assert(size && size.width>=44 && size.height>=44,'Close button touch target too small');

  // Diagnostics must react immediately instead of leaving the modal frozen.
  await page.locator('#kcDiagnosticsAdminEntry').tap();
  await page.waitForSelector('#kcDiagImmediateOverlay',{state:'visible',timeout:5000});
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Session modal still blocks after diagnostics tap');
  await page.locator('#kcDiagImmediateClose').tap();
  await page.waitForSelector('#kcDiagImmediateOverlay',{state:'detached',timeout:5000});

  // Reopen and verify both close paths.
  await page.evaluate(()=>{
    const back=document.getElementById('modalBackdrop');
    const modal=document.getElementById('modal');
    back.classList.remove('hidden');document.body.classList.add('modal-open');
    modal.innerHTML='<h2>👤 Anmeldung / Monitor</h2><button id="sessionClose">Schließen</button>';
    window.KCDP.sessionMobileHotfix.apply();
  });
  await page.locator('#kcSessionTopClose').tap();
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Top close X did not close modal');

  await page.evaluate(()=>{
    const back=document.getElementById('modalBackdrop');
    const modal=document.getElementById('modal');
    back.classList.remove('hidden');document.body.classList.add('modal-open');
    modal.innerHTML='<h2>👤 Anmeldung / Monitor</h2><button id="sessionClose">Schließen</button>';
    window.KCDP.sessionMobileHotfix.apply();
  });
  await page.locator('#sessionClose').tap();
  assert(!(await page.locator('#modalBackdrop').isVisible()),'Bottom close button did not close modal');
  assert(!errors.length,'Browser page errors: '+errors.join(' | '));

  console.log('KC DP2 session/mobile/LED regression: PASS');
  await browser.close();
})().catch(err=>{console.error('KC DP2 session/mobile/LED regression: FAIL');console.error(err.stack||err);process.exit(1);});
