const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const launchOptions={headless:true};
  if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({
    viewport:{width:390,height:844},
    isMobile:true,
    hasTouch:true,
    deviceScaleFactor:2,
    locale:'de-DE'
  });
  const page=await context.newPage();
  const browserErrors=[];
  page.on('console',msg=>{if(msg.type()==='error')browserErrors.push(msg.text());});
  page.on('pageerror',err=>browserErrors.push(err.message));

  await page.route('**/src/core/member-access.js*',async route=>{
    const response=await route.fetch();
    let body=await response.text();
    const marker="function configured(){const c=publicConfig();return /^https:\\/\\//.test(c.url)&&String(c.publishableKey||'').trim().length>20;}";
    if(!body.includes(marker))throw new Error('member-access configured()-Marker nicht gefunden');
    body=body.replace(marker,'function configured(){return false;}');
    await route.fulfill({response,body,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.roleUx&&window.KCDP?.memberAccess,{timeout:20000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});

  await page.evaluate(()=>{
    const details=document.querySelector('#uxLocalTest')?.closest('details');
    if(details)details.open=true;
    const role=document.getElementById('uxTestRole');
    const button=document.getElementById('uxTestLogin');
    if(!role||!button)throw new Error('Lokaler Prüfzugang ist nicht vollständig gerendert');
    role.value='admin';
    role.dispatchEvent(new Event('change',{bubbles:true}));
    button.click();
  });

  await page.waitForSelector('#unlockSecret',{timeout:10000});
  await page.locator('#unlockSecret').fill('KC-DP2-Recovery-Mobile-Smoke-2026!');
  await page.locator('#unlockBtn').click();

  await page.waitForSelector('body.ux-role',{timeout:25000});
  await page.waitForSelector('.ux-topbar',{timeout:10000});
  await page.waitForSelector('#kcRecoveryDbBlock',{state:'attached',timeout:10000});
  await page.waitForSelector('#kcRoleIdbStatus',{state:'attached',timeout:10000});
  await page.waitForSelector('#kcRoleSupStatus',{state:'attached',timeout:10000});

  const result=await page.evaluate(()=>({
    bodyClass:document.body.className,
    text:document.body.innerText,
    role:window.KCDP?.currentUser?.role||null,
    personId:window.KCDP?.currentUser?.personId||null,
    storageUnlocked:!!window.KCDP?.storage?.unlocked,
    recoveryLeds:window.KCDP?.recoveryStatusLeds?.status?.()||null,
    communicationMode:window.KCDP?.communicationBridge?.state?.mode||window.KCDP?.communicationBridge?.status?.()?.mode||null,
    startChoiceAutoLoad:window.KCDP?.deviceUX?.startChoiceAutoLoad
  }));

  assert.strictEqual(result.role,'admin','Lokaler Admin-Prüfzugang wurde nicht aktiv');
  assert(result.personId,'Person-ID fehlt nach Login');
  assert.strictEqual(result.storageUnlocked,true,'Lokaler verschlüsselter Speicher wurde nicht entsperrt');
  assert(!/Anmeldung läuft/i.test(result.text),'Login hängt weiterhin bei „Anmeldung läuft“');
  assert(result.recoveryLeds,'Recovery-IDX/SUP-Status fehlt');
  assert(['ok','maintenance','error'].includes(result.recoveryLeds.idb),'IDX-Status ungültig');
  assert(['ok','maintenance','error'].includes(result.recoveryLeds.supabase),'SUP-Status ungültig');
  assert.strictEqual(result.startChoiceAutoLoad,false,'Startauswahl wurde entgegen Recovery-Regel automatisch aktiviert');

  const loginCardVisible=await page.locator('.ux-login-card').isVisible().catch(()=>false);
  assert.strictEqual(loginCardVisible,false,'Login-Karte ist nach erfolgreichem Start noch sichtbar');
  assert(await page.locator('.ux-userchip').isVisible(),'Benutzerchip fehlt nach erfolgreichem Start');

  console.log('KC DP2 V0.20 recovery mobile login smoke: PASS');
  console.log(JSON.stringify({role:result.role,storageUnlocked:result.storageUnlocked,recoveryLeds:result.recoveryLeds,startChoiceAutoLoad:result.startChoiceAutoLoad,browserErrors},null,2));
  await browser.close();
})().catch(async err=>{
  console.error('KC DP2 V0.20 recovery mobile login smoke: FAIL');
  console.error(err.stack||err);
  process.exit(1);
});
