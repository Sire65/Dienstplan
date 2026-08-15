const { chromium } = require('playwright');
const assert = require('assert');
let browser;

(async()=>{
  const launchOptions={headless:true};if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:1280,height:800},locale:'de-DE'});
  const page=await context.newPage();
  await page.route('**/src/core/member-access.js*',async route=>{const response=await route.fetch();let body=await response.text();const marker="function configured(){const c=publicConfig();return /^https:\\/\\//.test(c.url)&&String(c.publishableKey||'').trim().length>20;}";if(!body.includes(marker))throw new Error('member-access configured()-Marker nicht gefunden');body=body.replace(marker,'function configured(){return false;}');await route.fulfill({response,body,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});});
  await page.route('https://*.supabase.co/**',route=>route.abort());
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.managerAutoSync&&window.KCDP?.pcManagerConnection&&window.KCDP?.memberAccess&&window.KCDP?.auth,{timeout:20000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');await page.locator('#uxTestLogin').click();await page.waitForSelector('#unlockSecret',{timeout:10000});await page.locator('#unlockSecret').fill('KC-DP2-Manager-Auto-Sync-E2E-2026!');await page.locator('#unlockBtn').click();await page.waitForSelector('#kcChoiceView',{timeout:20000});

  const result=await page.evaluate(async()=>{
    const K=window.KCDP,A=K.managerAutoSync,person=K.people.find(p=>p.active&&p.personType!=='helper')||K.people[0];
    const originalSync=K.pcManagerConnection.syncAll,originalPersist=K.persistAll,originalRole=K.currentUser?.role,originalPc={...(K.integrationConfig?.pcManager||{})};
    let syncCalls=0,persistCalls=0;
    const setAuthenticated=(role='admin')=>{K.auth.setCurrentUser({personId:person.personId,role,displayName:person.name});K.memberAccess.state.status='authenticated';K.memberAccess.state.user={personId:person.personId,role,displayName:person.name};K.supabaseConnection.state.authStatus='authenticated';};
    const setAuto=value=>{K.integrationConfig.pcManager={...(K.integrationConfig.pcManager||{}),autoSync:!!value};};
    setAuthenticated('admin');setAuto(false);
    K.pcManagerConnection.syncAll=async()=>{syncCalls++;return {people:K.people,kcDpApply:{applied:true,contextApplied:true}};};K.persistAll=async()=>{persistCalls++;return true;};
    const disabled=await A.run('disabled-test');

    setAuto(true);setAuthenticated('employee');const noPerm=await A.run('permission-test');

    setAuthenticated('admin');K.pcManagerConnection.syncAll=async()=>{syncCalls++;await new Promise(r=>setTimeout(r,30));return {people:K.people,kcDpApply:{applied:true,contextApplied:true}};};
    const [ok1,ok2]=await Promise.all([A.run('login-one'),A.run('login-two')]);const afterSuccess={syncCalls,persistCalls,state:{...A.state}};

    K.pcManagerConnection.syncAll=async()=>{syncCalls++;K.pcManagerConnection.state.status='blocked';K.pcManagerConnection.state.lastBlock={code:'CONTEXT_NOT_READY',reason:'Manager-Snapshot unvollständig'};return {people:K.people,kcDpApply:{applied:false,contextApplied:false}};};const beforeBlockedPersist=persistCalls,blocked=await A.run('blocked-test');

    K.pcManagerConnection.syncAll=async()=>{syncCalls++;throw new Error('Simulierter Manager-Netzfehler');};const failed=await A.run('error-test');

    const wrappers={signIn:!!K.memberAccess.signInPassword?.__kcManagerAutoSync,otp:!!K.memberAccess.verifyFirstAccessCode?.__kcManagerAutoSync,restore:!!K.memberAccess.restore?.__kcManagerAutoSync};
    K.pcManagerConnection.syncAll=originalSync;K.persistAll=originalPersist;K.integrationConfig.pcManager=originalPc;if(originalRole)setAuthenticated(originalRole);
    return {disabled,noPerm,ok1,ok2,afterSuccess,blocked,beforeBlockedPersist,blockedPersist:persistCalls,failed,wrappers};
  });

  assert.strictEqual(result.disabled.skipped,true,'Auto-Sync aus muss übersprungen werden');assert.strictEqual(result.disabled.code,'disabled');
  assert.strictEqual(result.noPerm.skipped,true,'Rolle ohne Sync-Recht muss übersprungen werden');assert.strictEqual(result.noPerm.code,'not_permitted');
  assert.strictEqual(result.ok1.ok,true);assert.strictEqual(result.ok2.ok,true);assert.strictEqual(result.afterSuccess.syncCalls,1,'Parallele Auto-Sync-Aufrufe müssen dedupliziert werden');assert.strictEqual(result.afterSuccess.persistCalls,1,'Erfolgreiche Übernahme muss genau einmal persistiert werden');assert.strictEqual(result.afterSuccess.state.status,'ready');
  assert.strictEqual(result.blocked.blocked,true,'Unvollständiger Snapshot muss blockiert bleiben');assert.strictEqual(result.blockedPersist,result.beforeBlockedPersist,'Blockierter Snapshot darf nicht persistiert werden');
  assert.strictEqual(result.failed.error,true,'Manager-Netzfehler muss als Auto-Sync-Fehler zurückgegeben werden');assert.ok(/Netzfehler/.test(result.failed.reason));
  assert.deepStrictEqual(result.wrappers,{signIn:true,otp:true,restore:true},'Login/OTP/Restore müssen mit Auto-Sync-Hooks versehen sein');
  console.log('KC DP2 V0.19.42 Manager/Core Auto-Sync: Schalter, Recht, Dedupe, Block, Fehler PASS');
  await browser.close();browser=null;
})().catch(async err=>{console.error(err);try{await browser?.close();}catch(_){}process.exitCode=1;});
