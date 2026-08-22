const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const launchOptions={headless:true};
  if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'de-DE'});
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
  await page.evaluate(()=>{
    window.__kcOriginalPersistSessionIfNeeded=window.KCDP.memberAccess.persistSessionIfNeeded;
    window.KCDP.memberAccess.persistSessionIfNeeded=async()=>false;
  });
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});
  await page.evaluate(()=>{
    const details=document.querySelector('#uxLocalTest')?.closest('details'); if(details)details.open=true;
    const role=document.getElementById('uxTestRole'),button=document.getElementById('uxTestLogin');
    if(!role||!button)throw new Error('Lokaler Prüfzugang ist nicht vollständig gerendert');
    role.value='admin'; role.dispatchEvent(new Event('change',{bubbles:true})); button.click();
  });
  await page.waitForFunction(()=>!!document.getElementById('unlockSecret'),{timeout:10000});
  await page.evaluate(()=>{
    const secret=document.getElementById('unlockSecret'),button=document.getElementById('unlockBtn');
    if(!secret||!button)throw new Error('Unlock-Dialog ist nicht vollständig gerendert');
    secret.value='KC-DP2-Recovery-Mobile-Smoke-2026!'; secret.dispatchEvent(new Event('input',{bubbles:true})); button.click();
  });

  try{
    await page.waitForSelector('body.ux-role',{timeout:25000});
  }catch(err){
    const diag=await page.evaluate(()=>({
      bodyClass:document.body.className,
      text:document.body.innerText.slice(0,2500),
      currentUser:window.KCDP?.currentUser||null,
      memberAccess:window.KCDP?.memberAccess?.state||null,
      storageUnlocked:!!window.KCDP?.storage?.unlocked,
      supabase:window.KCDP?.supabaseConnection?.state||null,
      startup:window.KCDP?.startupStabilityGuard?.state||null,
      hasUnlock:!!document.getElementById('unlockSecret'),
      hasMain:!!document.getElementById('mainView'),
      hasTopbar:!!document.querySelector('.ux-topbar')
    }));
    console.error('RECOVERY_START_DIAG',JSON.stringify(diag,null,2));
    console.error('BROWSER_ERRORS',JSON.stringify(browserErrors,null,2));
    throw err;
  }

  await page.waitForSelector('.ux-topbar',{timeout:10000});
  await page.waitForSelector('#kcRecoveryDbBlock',{state:'attached',timeout:10000});
  const result=await page.evaluate(()=>({
    text:document.body.innerText,
    role:window.KCDP?.currentUser?.role||null,
    personId:window.KCDP?.currentUser?.personId||null,
    storageUnlocked:!!window.KCDP?.storage?.unlocked,
    recoveryLeds:window.KCDP?.recoveryStatusLeds?.status?.()||null,
    startupReady:!!window.KCDP?.startupStabilityGuard?.state?.ready,
    startChoiceAutoLoad:window.KCDP?.deviceUX?.startChoiceAutoLoad
  }));
  assert.strictEqual(result.role,'admin');
  assert(result.personId);
  assert.strictEqual(result.storageUnlocked,true);
  assert(!/Anmeldung läuft/i.test(result.text));
  assert(result.recoveryLeds);
  assert.strictEqual(result.startupReady,true);
  assert.strictEqual(result.startChoiceAutoLoad,false);
  console.log('KC DP2 V0.20 recovery mobile login A/B smoke: PASS');
  console.log(JSON.stringify(result,null,2));
  await browser.close();
})().catch(err=>{console.error('KC DP2 V0.20 recovery mobile login A/B smoke: FAIL');console.error(err.stack||err);process.exit(1);});
