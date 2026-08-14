const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const browser = await chromium.launch({headless:true});
  const context = await browser.newContext({
    viewport:{width:390,height:844},
    isMobile:true,
    hasTouch:true,
    deviceScaleFactor:2,
    locale:'de-DE'
  });
  const page = await context.newPage();
  page.on('console',msg=>{ if(msg.type()==='error') console.error('BROWSER:',msg.text()); });
  page.on('pageerror',err=>console.error('PAGEERROR:',err.message));

  const base='http://127.0.0.1:4173/';
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.roleUx && window.KCDP?.memberAccess && window.KCDP?.startChoice,{timeout:20000});

  // Echter lokaler Loginpfad: ensureLogin -> lokaler Prüfzugang -> Geräteschlüssel -> Daten laden -> render -> afterDataLoaded -> Startauswahl.
  await page.waitForSelector('#uxLocalTest',{timeout:20000});
  const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');
  if(await details.count()) await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');
  await page.locator('#uxTestLogin').click();
  await page.waitForSelector('#unlockSecret',{timeout:10000});
  await page.locator('#unlockSecret').fill('KC-DP2-Mobile-Smoke-2026!');
  await page.locator('#unlockBtn').click();
  await page.waitForSelector('#kcChoiceView',{timeout:20000});

  const visible=async sel=>await page.locator(sel).isVisible();
  assert(await visible('#kcChoiceView'),'Dienstplan ansehen fehlt');
  assert(await visible('#kcChoiceEdit'),'Dienstplan bearbeiten fehlt für Admin');
  assert(await visible('#kcChoiceMine'),'Meine Dienste fehlt');
  assert(await visible('#kcChoiceWish'),'Wunschplan fehlt');

  // Der echte Start muss bereits einen gerenderten Tagesplan besitzen.
  const boot=await page.evaluate(()=>({
    view:window.KCDP?.state?.view,
    mobileMode:window.KCDP?.state?.mobileMode,
    main:!!document.getElementById('mainView'),
    planner:!!document.querySelector('#mainView .planner-wrap'),
    phone:window.KCDP?.deviceUX?.isPhone?.(),
    phoneUx:window.KCDP?.phoneDayUx?.version||null
  }));
  assert(boot.main,'mainView fehlt nach echtem Programmstart');
  assert(boot.planner,'Tagesplan wurde nach echtem Programmstart nicht gerendert');
  assert.strictEqual(boot.phone,true,'390px wurde nicht als Smartphone erkannt');

  // Nur-Lese-Modus + Smartphone-Tagesansicht
  await page.locator('#kcChoiceView').click();
  await page.waitForSelector('body.kc-readonly-mode');
  assert((await page.locator('#kcPlanModeBadge').innerText()).includes('Nur ansehen'),'Nur-Lese-Badge fehlt');
  await page.waitForSelector('.kc-phone-day-shell',{state:'attached',timeout:10000});
  await page.waitForFunction(()=>document.body.classList.contains('kc-phone-day-active'));
  assert(await visible('.kc-phone-day-shell'),'Smartphone-Tagesansicht ist nicht sichtbar');
  assert(await visible('[data-kc-phone-mode="list"]'),'Listenmodus fehlt');
  assert(await visible('[data-kc-phone-mode="bars"]'),'Balkenmodus fehlt');
  assert(!(await page.locator('#quickPlanBtn').isVisible()),'Schnellplanung ist im Nur-Lese-Modus sichtbar');
  assert(!(await page.locator('#publishBtn').isVisible()),'Veröffentlichen ist im Nur-Lese-Modus sichtbar');

  const titleBefore=(await page.locator('.kc-phone-day-title b').innerText()).trim();
  await page.locator('[data-kc-phone-nav="1"]').click();
  await page.waitForFunction(old=>document.querySelector('.kc-phone-day-title b')?.textContent.trim()!==old,titleBefore);
  const titleAfter=(await page.locator('.kc-phone-day-title b').innerText()).trim();
  assert.notStrictEqual(titleAfter,titleBefore,'Tageswechsel hat den Tag nicht geändert');

  await page.locator('[data-kc-phone-mode="bars"]').click();
  await page.waitForFunction(()=>!document.body.classList.contains('kc-phone-list-mode'));
  assert(await page.locator('.planner-wrap').isVisible(),'Balkenansicht zeigt den Planer nicht');

  // Zurück zur Startauswahl
  await page.locator('#uxLegacyReturn').click();
  await page.waitForSelector('#kcChoiceMine');

  // Meine Dienste
  await page.locator('#kcChoiceMine').click();
  await page.waitForFunction(()=>document.body.classList.contains('ux-role'));
  await page.waitForFunction(()=>document.querySelector('#kcdpUxRoot')?.textContent.includes('Mein Dienstplan'));
  assert((await page.locator('#kcdpUxRoot').innerText()).includes('Mein Dienstplan'),'Meine Dienste öffnet nicht den persönlichen Dienstplan');
  assert(await visible('#kcStartChoiceReturn'),'Zurück-zur-Auswahl fehlt in Meine Dienste');

  // Wunschplan
  await page.locator('#kcStartChoiceReturn').click();
  await page.waitForSelector('#kcChoiceWish');
  await page.locator('#kcChoiceWish').click();
  await page.waitForFunction(()=>document.querySelector('#kcdpUxRoot')?.textContent.includes('Meine Zeiten'));
  const wishText=await page.locator('#kcdpUxRoot').innerText();
  assert(wishText.includes('Meine Zeiten'),'Wunschplan öffnet nicht Meine Zeiten');
  assert(await visible('#kcStartChoiceReturn'),'Zurück-zur-Auswahl fehlt im Wunschplan');

  // Bearbeiten muss wieder editierbar sein und auf dem Smartphone denselben stabilen Handylayer erhalten.
  await page.locator('#kcStartChoiceReturn').click();
  await page.waitForSelector('#kcChoiceEdit');
  await page.locator('#kcChoiceEdit').click();
  await page.waitForFunction(()=>document.body.classList.contains('ux-legacy'));
  assert(!(await page.locator('body').evaluate(b=>b.classList.contains('kc-readonly-mode'))),'Bearbeiten bleibt fälschlich schreibgeschützt');
  assert((await page.locator('#kcPlanModeBadge').innerText()).includes('Bearbeiten'),'Bearbeiten-Badge fehlt');
  await page.waitForSelector('.kc-phone-day-shell',{state:'attached',timeout:10000});
  assert(await visible('.kc-phone-day-shell'),'Handyansicht fehlt im Bearbeitungsmodus');

  console.log('KC DP2 mobile smoke: PASS');
  await browser.close();
})().catch(async err=>{
  console.error('KC DP2 mobile smoke: FAIL');
  console.error(err.stack||err);
  process.exit(1);
});
