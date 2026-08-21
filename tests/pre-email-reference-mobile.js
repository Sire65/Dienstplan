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

  await page.route('**/src/core/member-access.js*',async route=>{
    const response=await route.fetch();
    let body=await response.text();
    const marker="function configured(){const c=publicConfig();return /^https:\\/\\//.test(c.url)&&String(c.publishableKey||'').trim().length>20;}";
    if(!body.includes(marker))throw new Error('member-access marker missing');
    body=body.replace(marker,'function configured(){return false;}');
    await route.fulfill({response,body,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:15000});
  const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');
  if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');
  await page.locator('#uxTestLogin').click();
  await page.waitForSelector('#unlockSecret',{timeout:8000});
  await page.locator('#unlockSecret').fill('KC-DP2-Mobile-Smoke-2026!');
  await page.locator('#unlockBtn').click();

  // Referenzkriterium 1: Anmeldung muss die Startauswahl erreichen und darf nicht bei "Anmeldung läuft" hängen.
  await page.waitForSelector('#kcChoiceEdit',{state:'visible',timeout:15000});
  assert(await page.locator('#kcChoiceView').isVisible(),'Startauswahl fehlt nach Anmeldung');

  // Referenzkriterium 2: Programmstart im Bearbeiten-Modus.
  await page.locator('#kcChoiceEdit').click();
  await page.waitForFunction(()=>document.body.classList.contains('ux-legacy'),{timeout:8000});
  await page.waitForSelector('#mainView .planner-wrap',{state:'attached',timeout:10000});
  assert(await page.locator('#idbStatusLed').count(),'IDX-Status-LED fehlt');
  assert(await page.locator('#idbTrafficLed').count(),'IDX-Traffic-LED fehlt');
  assert(await page.locator('#supabaseStatusLed').count(),'SUP-Status-LED fehlt');
  assert(await page.locator('#supabaseTrafficLed').count(),'SUP-Traffic-LED fehlt');

  // Referenzkriterium 3: Diagnose muss aufgehen, reagieren und schließbar sein.
  await page.evaluate(()=>{
    const K=window.KCDP;
    if(!K.diagnostics)K.diagnostics={};
    K.diagnostics.adminList=()=>Promise.resolve([]);
    K.diagnostics.setStatus=()=>Promise.resolve(true);
    window.__hb=0;
    window.__hbt=setInterval(()=>window.__hb++,25);
  });
  await page.locator('#settingsBtn').click();
  await page.waitForSelector('#kcDiagnosticsAdminEntry',{state:'visible',timeout:4000});
  await page.locator('#kcDiagnosticsAdminEntry').click();
  await page.waitForSelector('#kcDiagOverlay',{state:'visible',timeout:4000});
  await page.waitForTimeout(500);
  assert((await page.evaluate(()=>window.__hb))>10,'Main-Thread hängt nach Diagnose-Klick');
  await page.waitForSelector('#kcDiagClose',{state:'visible',timeout:2000});
  await page.locator('#kcDiagClose').click();
  await page.waitForSelector('#kcDiagOverlay',{state:'detached',timeout:2000});
  await page.evaluate(()=>clearInterval(window.__hbt));

  assert(!errors.length,'Browserfehler: '+errors.join(' | '));
  console.log('KC DP2 pre-email reference mobile: PASS');
  await browser.close();
})().catch(e=>{console.error('KC DP2 pre-email reference mobile: FAIL');console.error(e.stack||e);process.exit(1)});
