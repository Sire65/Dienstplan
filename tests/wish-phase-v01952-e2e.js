const { chromium } = require('playwright');
const assert = require('assert');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.wishPhaseGuard&&window.KCDP?.mutations?.saveWish,{timeout:15000});
  const before=await page.evaluate(()=>({
    shifts:(KCDP.shifts||[]).length,
    actual:(KCDP.actualShifts||[]).length,
    wishes:(KCDP.wishes||[]).length,
    phase:KCDP.wishPhaseGuard.state().phase,
    tabs:[...document.querySelectorAll('#layerTabs [data-layer]')].map(x=>x.textContent.trim())
  }));
  assert.equal(before.phase,'open','Wunschphase starts open');
  assert.deepEqual(before.tabs,['Wunsch','Soll','Ist','Vergleich'],'Wunsch/Soll/Ist structure stays consistent');
  await page.evaluate(async()=>{KCDP.currentUser={...(KCDP.currentUser||{}),role:'planner',displayName:'Regression Planer'};await KCDP.wishPhaseGuard.setDeadline('2026-11-15');});
  assert.match(await page.locator('#kcWishPhaseStatus').innerText(),/Wunschphase offen bis 15\.11\.2026/);
  await page.evaluate(()=>KCDP.wishPhaseGuard.closePhase());
  assert.match(await page.locator('#kcWishPhaseStatus').innerText(),/Wunschphase beendet/);
  const blocked=await page.evaluate(()=>{try{KCDP.mutations.saveWish({id:'',personId:KCDP.people[0].personId,date:KCDP.days[0].date,start:KCDP.days[0].start,end:KCDP.days[0].start+1,wishType:'available',status:'confirmed'},{reason:'regression'});return false;}catch(e){return /nicht möglich|beendet|abgeschlossen/i.test(e.message);}});
  assert.equal(blocked,true,'saveWish is blocked after close');
  const afterClose=await page.evaluate(()=>({shifts:(KCDP.shifts||[]).length,actual:(KCDP.actualShifts||[]).length,wishes:(KCDP.wishes||[]).length}));
  assert.equal(afterClose.shifts,before.shifts,'Soll shifts untouched by wish phase close');
  assert.equal(afterClose.actual,before.actual,'Ist shifts untouched by wish phase close');
  assert.equal(afterClose.wishes,before.wishes,'Wishes remain frozen, not rewritten');
  await page.evaluate(()=>KCDP.wishPhaseGuard.reopenPhase());
  assert.equal(await page.evaluate(()=>KCDP.wishPhaseGuard.state().phase),'open','planner can deliberately reopen');
  await browser.close();
  console.log('PASS wish phase v0.19.52 e2e');
})().catch(e=>{console.error(e);process.exit(1)});
