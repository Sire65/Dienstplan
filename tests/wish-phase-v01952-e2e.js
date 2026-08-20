const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'de-DE'});
  const page=await context.newPage();
  page.on('pageerror',err=>console.error('PAGEERROR:',err.message));

  // Fokussierter Browser-Harness für das neue 0.19.52-Modul.
  // Die vollständige KC-DP2-Laufzeit wird parallel durch Workflow E2E,
  // Mobile Smoke, Dokumente, Foto-Pipeline und Deep TÜV regressiert.
  await page.route('http://127.0.0.1:4173/wish-phase-harness.html',route=>route.fulfill({
    status:200,
    contentType:'text/html; charset=utf-8',
    body:`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Wish Phase Harness</title></head><body>
      <div id="planControls" class="plan-control-row"></div>
      <div id="layerTabs">
        <button data-layer="wish">Alt Wunsch</button>
        <button data-layer="planned">Alt Soll</button>
        <button data-layer="actual">Alt Ist</button>
        <button data-layer="compare">Alt Vergleich</button>
      </div>
      <main id="kcdpUxRoot">
        <section class="ux-card primary-card"><div class="ux-card-action"><div class="ux-card-copy"><h3>Meine Wunschzeiten</h3><p>3 von 12 Tagen mit Angaben.</p></div><button class="ux-btn primary" id="uxStartTimes">Ansehen / ändern</button></div></section>
        <button id="wsCopy" data-copywish="W-2">Kollegenzeit übernehmen</button>
      </main>
      <script>
        window.KCDP={
          state:{wishPhase:'open',wishDeadline:null},
          workflow:{status:'draft'},
          currentUser:{personId:'KC-P-001',role:'admin',displayName:'Regression Planer'},
          shifts:[{id:'S-1',layer:'planned'}],actualShifts:[{id:'A-1'}],wishes:[{id:'W-1'}],
          auth:{has:()=>true},
          persistAll:async()=>true,
          mutations:{
            saveWish(w){KCDP.wishes.push(w);return w},
            deleteWish(id){KCDP.wishes=KCDP.wishes.filter(x=>x.id!==id);return true},
            removeWish(id){return this.deleteWish(id)}
          },
          wishSprint:{copy(){KCDP.wishes.push({id:'COPIED'});return true}}
        };
      </script>
      <script src="/src/ui/wish-phase-guard.js"></script>
    </body></html>`
  }));

  await page.goto('http://127.0.0.1:4173/wish-phase-harness.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.wishPhaseGuard&&window.KCDP?.mutations?.__wishPhaseWrapped===true,{timeout:10000});

  const before=await page.evaluate(()=>({
    shifts:KCDP.shifts.length,
    actual:KCDP.actualShifts.length,
    wishes:KCDP.wishes.length,
    phase:KCDP.wishPhaseGuard.state().phase,
    tabs:[...document.querySelectorAll('#layerTabs [data-layer]')].map(x=>x.textContent.trim())
  }));
  assert.equal(before.phase,'open','Wunschphase startet offen');
  assert.deepEqual(before.tabs,['Wunsch','Soll','Ist','Vergleich'],'Wunsch/Soll/Ist sind einheitlich benannt');

  await page.evaluate(()=>KCDP.mutations.saveWish({id:'W-OPEN'}));
  assert.equal(await page.evaluate(()=>KCDP.wishes.length),before.wishes+1,'Wunsch kann in offener Phase gespeichert werden');
  await page.evaluate(()=>{KCDP.wishes=KCDP.wishes.filter(x=>x.id!=='W-OPEN')});

  await page.evaluate(()=>KCDP.wishPhaseGuard.setDeadline('2026-11-15'));
  assert.match(await page.locator('#kcWishPhaseStatus').innerText(),/Wunschphase offen bis 15\.11\.2026/);

  await page.evaluate(()=>KCDP.wishPhaseGuard.closePhase());
  assert.match(await page.locator('#kcWishPhaseStatus').innerText(),/Wunschphase beendet – Sollplan wird erstellt/);
  await page.waitForFunction(()=>document.querySelector('#uxStartTimes')?.classList.contains('kc-wish-readonly-entry'));
  assert.equal(await page.locator('#uxStartTimes').innerText(),'Nur ansehen','Handy-Einstieg ist eindeutig nur lesbar');
  assert.equal(await page.locator('#wsCopy').isDisabled(),true,'Kollegenübernahme ist gesperrt');

  const blockedSave=await page.evaluate(()=>{try{KCDP.mutations.saveWish({id:'W-BLOCKED'});return false}catch(e){return /nicht möglich|beendet/i.test(e.message)}});
  const blockedDelete=await page.evaluate(()=>{try{KCDP.mutations.deleteWish('W-1');return false}catch(e){return /nicht möglich|beendet/i.test(e.message)}});
  const blockedCopy=await page.evaluate(async()=>{try{await KCDP.wishSprint.copy();return false}catch(e){return /nicht möglich|beendet/i.test(e.message)}});
  assert.equal(blockedSave,true,'Speichern ist nach Wunschschluss gesperrt');
  assert.equal(blockedDelete,true,'Löschen ist nach Wunschschluss gesperrt');
  assert.equal(blockedCopy,true,'Kollegenübernahme ist nach Wunschschluss gesperrt');

  const afterClose=await page.evaluate(()=>({shifts:KCDP.shifts.length,actual:KCDP.actualShifts.length,wishes:KCDP.wishes.length}));
  assert.equal(afterClose.shifts,before.shifts,'Soll-Daten bleiben unverändert');
  assert.equal(afterClose.actual,before.actual,'Ist-Daten bleiben unverändert');
  assert.equal(afterClose.wishes,before.wishes,'Wünsche bleiben eingefroren und unverändert');

  await page.evaluate(()=>KCDP.wishPhaseGuard.reopenPhase());
  assert.equal(await page.evaluate(()=>KCDP.wishPhaseGuard.state().phase),'open','Planer kann bewusst wieder öffnen');

  await page.evaluate(()=>{KCDP.workflow.status='published';KCDP.wishPhaseGuard.renderStatus()});
  assert.match(await page.locator('#kcWishPhaseStatus').innerText(),/Sollplan veröffentlicht – Wunschplan abgeschlossen/);

  await browser.close();
  console.log('PASS wish phase v0.19.52 focused browser regression');
})().catch(e=>{console.error('FAIL wish phase v0.19.52 focused browser regression');console.error(e.stack||e);process.exit(1)});
