const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'de-DE'});
  const page=await context.newPage();
  page.on('console',msg=>{if(msg.type()==='error')console.error('BROWSER:',msg.text());});
  page.on('pageerror',err=>console.error('PAGEERROR:',err.message));

  // Gleicher isolierter Startweg wie im bereits grünen Workflow-E2E:
  // keine echte Supabase-Anmeldung, sondern lokaler Prüfzugang.
  await page.route('**/src/core/member-access.js*',async route=>{
    const response=await route.fetch();
    let body=await response.text();
    const marker="function configured(){const c=publicConfig();return /^https:\\/\\//.test(c.url)&&String(c.publishableKey||'').trim().length>20;}";
    if(!body.includes(marker))throw new Error('member-access configured()-Marker nicht gefunden');
    body=body.replace(marker,'function configured(){return false;}');
    await route.fulfill({response,body,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });
  await page.route('https://*.supabase.co/**',route=>route.abort());

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.roleUx&&window.KCDP?.memberAccess&&window.KCDP?.mutations&&window.KCDP?.wishPhaseGuard,{timeout:20000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});
  const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');
  if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');
  await page.locator('#uxTestLogin').click();
  await page.waitForSelector('#unlockSecret',{timeout:10000});
  await page.locator('#unlockSecret').fill('KC-DP2-WishPhase-E2E-2026!');
  await page.locator('#unlockBtn').click();
  await page.waitForSelector('#kcChoiceView',{timeout:20000});
  await page.waitForFunction(()=>typeof window.KCDP?.mutations?.saveWish==='function'&&window.KCDP?.mutations?.__wishPhaseWrapped===true,{timeout:10000});

  const before=await page.evaluate(()=>({
    shifts:(KCDP.shifts||[]).length,
    actual:(KCDP.actualShifts||[]).length,
    wishes:(KCDP.wishes||[]).length,
    phase:KCDP.wishPhaseGuard.state().phase,
    tabs:[...document.querySelectorAll('#layerTabs [data-layer]')].map(x=>x.textContent.trim())
  }));
  assert.equal(before.phase,'open','Wunschphase startet offen');
  assert.deepEqual(before.tabs,['Wunsch','Soll','Ist','Vergleich'],'Wunsch/Soll/Ist-Struktur bleibt einheitlich');

  await page.evaluate(async()=>{
    KCDP.auth.setCurrentUser({personId:KCDP.people[0].personId,role:'admin',displayName:'Regression Planer'});
    await KCDP.wishPhaseGuard.setDeadline('2026-11-15');
  });
  assert.match(await page.locator('#kcWishPhaseStatus').innerText(),/Wunschphase offen bis 15\.11\.2026/);

  await page.evaluate(()=>KCDP.wishPhaseGuard.closePhase());
  assert.match(await page.locator('#kcWishPhaseStatus').innerText(),/Wunschphase beendet/);

  const blocked=await page.evaluate(()=>{
    try{
      KCDP.mutations.saveWish({id:'',personId:KCDP.people[0].personId,date:KCDP.days[0].date,start:KCDP.days[0].start,end:KCDP.days[0].start+1,wishType:'available',source:'self_service',status:'confirmed'},{reason:'Regression Wunschphase'});
      return false;
    }catch(e){return /nicht möglich|beendet|abgeschlossen/i.test(e.message);}
  });
  assert.equal(blocked,true,'saveWish ist nach dem Schließen gesperrt');

  const afterClose=await page.evaluate(()=>({shifts:(KCDP.shifts||[]).length,actual:(KCDP.actualShifts||[]).length,wishes:(KCDP.wishes||[]).length}));
  assert.equal(afterClose.shifts,before.shifts,'Soll-Dienste bleiben beim Schließen unverändert');
  assert.equal(afterClose.actual,before.actual,'Ist-Dienste bleiben beim Schließen unverändert');
  assert.equal(afterClose.wishes,before.wishes,'Wünsche werden eingefroren, nicht umgeschrieben');

  await page.evaluate(()=>KCDP.wishPhaseGuard.reopenPhase());
  assert.equal(await page.evaluate(()=>KCDP.wishPhaseGuard.state().phase),'open','Planer kann bewusst wieder öffnen');

  await browser.close();
  console.log('PASS wish phase v0.19.52 e2e');
})().catch(e=>{console.error('FAIL wish phase v0.19.52 e2e');console.error(e.stack||e);process.exit(1)});
