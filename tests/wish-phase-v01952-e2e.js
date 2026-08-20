const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'de-DE'});
  const page=await context.newPage();
  page.on('pageerror',err=>console.error('PAGEERROR:',err.message));

  await page.route('http://127.0.0.1:4173/wish-phase-harness.html',route=>route.fulfill({
    status:200,contentType:'text/html; charset=utf-8',body:`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Wish Phase Harness</title></head><body>
      <div id="planControls" class="plan-control-row"></div>
      <div id="layerTabs"><button data-layer="wish">Alt Wunsch</button><button data-layer="planned">Alt Soll</button><button data-layer="actual">Alt Ist</button><button data-layer="compare">Alt Vergleich</button></div>
      <main id="kcdpUxRoot"><section class="ux-card primary-card"><div class="ux-card-action"><div class="ux-card-copy"><h3>Meine Wunschzeiten</h3><p>3 von 12 Tagen mit Angaben.</p></div><button class="ux-btn primary" id="uxStartTimes">Ansehen / ändern</button></div></section><button id="wsCopy" data-copywish="W-2">Kollegenzeit übernehmen</button></main>
      <script>
        const serverState={settings:null};
        window.KCDP={
          state:{wishPhase:'open',wishDeadline:null},workflow:{status:'draft'},currentUser:{personId:'KC-P-001',role:'admin',displayName:'Regression Planer'},
          shifts:[{id:'S-1',layer:'planned'}],actualShifts:[{id:'A-1'}],wishes:[{id:'W-1'}],auth:{has:()=>true},persistAll:async()=>true,
          supabaseConnection:{validateConfig:()=>({url:'https://example.supabase.co',publishableKey:'pk_test_123456789012345678901234567890',orgId:'KC_WERNE',projectId:'KC_DP'}),ensureSession:async()=>true,sessionSnapshot:()=>({access_token:'test-token'})},
          mutations:{saveWish(w){KCDP.wishes.push(w);return w},deleteWish(id){KCDP.wishes=KCDP.wishes.filter(x=>x.id!==id);return true},removeWish(id){return this.deleteWish(id)}},
          wishSprint:{copy(){KCDP.wishes.push({id:'COPIED'});return true}}
        };
        window.fetch=async(url,opts)=>{
          if(!String(url).includes('/kc-dp-wish-phase'))throw new Error('unexpected fetch '+url);
          const req=JSON.parse(opts.body||'{}'),now=new Date().toISOString();
          if(req.action==='settings')serverState.settings={org_id:'KC_WERNE',project_id:'KC_DP',deadline_date:req.patch.deadlineDate,close_at:req.patch.closeAt,reminder_days:req.patch.reminderDays,status:'open',push_enabled:true,email_enabled:true};
          if(req.action==='close')serverState.settings={...(serverState.settings||{}),status:'closed',closed_at:now};
          if(req.action==='reopen')serverState.settings={...(serverState.settings||{}),status:'open',closed_at:null};
          const delivery=req.action==='close'?{push:{sent:18,failed:0,ready:true},email:{sent:0,failed:18,ready:false}}:undefined;
          return new Response(JSON.stringify({ok:true,settings:serverState.settings,channels:{pushReady:true,emailReady:false},delivery}),{status:200,headers:{'Content-Type':'application/json'}});
        };
      </script>
      <script src="/src/ui/wish-phase-guard.js"></script>
    </body></html>`
  }));

  await page.goto('http://127.0.0.1:4173/wish-phase-harness.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.wishPhaseGuard&&window.KCDP?.mutations?.__wishPhaseWrapped===true,{timeout:10000});

  const before=await page.evaluate(()=>({shifts:KCDP.shifts.length,actual:KCDP.actualShifts.length,wishes:KCDP.wishes.length,phase:KCDP.wishPhaseGuard.state().phase,tabs:[...document.querySelectorAll('#layerTabs [data-layer]')].map(x=>x.textContent.trim())}));
  assert.equal(before.phase,'open','Wunschphase startet offen');
  assert.deepEqual(before.tabs,['Wunsch','Soll','Ist','Vergleich'],'Wunsch/Soll/Ist sind einheitlich benannt');

  await page.evaluate(()=>KCDP.mutations.saveWish({id:'W-OPEN'}));
  assert.equal(await page.evaluate(()=>KCDP.wishes.length),before.wishes+1,'Wunsch kann in offener Phase gespeichert werden');
  await page.evaluate(()=>{KCDP.wishes=KCDP.wishes.filter(x=>x.id!=='W-OPEN')});

  await page.evaluate(()=>KCDP.wishPhaseGuard.setDeadline('2026-11-15',{closeTime:'23:59',reminderDays:[3,1]}));
  const statusText=await page.locator('#kcWishPhaseStatus').innerText();
  assert.match(statusText,/Wunschphase offen bis 15\.11\.2026/);
  assert.match(statusText,/3 und 1 Tag/,'Erinnerungstage werden transparent angezeigt');
  assert.match(statusText,/Push ✓/,'Push-Kanal wird transparent angezeigt');
  assert.match(statusText,/E-Mail ⚠ nicht eingerichtet/,'fehlender Mail-Kanal wird nicht vorgetäuscht');
  const configured=await page.evaluate(()=>({deadline:KCDP.state.wishDeadline,closeAt:KCDP.state.wishCloseAt,days:KCDP.state.wishReminderDays}));
  assert.equal(configured.deadline,'2026-11-15','Frist kommt aus Serverzustand');
  assert.ok(configured.closeAt,'automatischer Schließzeitpunkt ist gespeichert');
  assert.deepEqual(configured.days,[3,1],'mehrere automatische Vorwarnungen sind gespeichert');

  await page.evaluate(()=>KCDP.wishPhaseGuard.closePhase());
  assert.match(await page.locator('#kcWishPhaseStatus').innerText(),/Wunschphase beendet – Sollplan wird erstellt/);
  await page.waitForFunction(()=>document.querySelector('#uxStartTimes')?.classList.contains('kc-wish-readonly-entry'));
  assert.equal(await page.locator('#uxStartTimes').innerText(),'Nur ansehen','Handy-Einstieg ist eindeutig nur lesbar');
  assert.equal(await page.locator('#wsCopy').isDisabled(),true,'Kollegenübernahme ist gesperrt');

  const blockedSave=await page.evaluate(()=>{try{KCDP.mutations.saveWish({id:'W-BLOCKED'});return false}catch(e){return /nicht möglich|beendet/i.test(e.message)}}),blockedDelete=await page.evaluate(()=>{try{KCDP.mutations.deleteWish('W-1');return false}catch(e){return /nicht möglich|beendet/i.test(e.message)}}),blockedCopy=await page.evaluate(async()=>{try{await KCDP.wishSprint.copy();return false}catch(e){return /nicht möglich|beendet/i.test(e.message)}});
  assert.equal(blockedSave,true,'Speichern ist nach Wunschschluss gesperrt');assert.equal(blockedDelete,true,'Löschen ist nach Wunschschluss gesperrt');assert.equal(blockedCopy,true,'Kollegenübernahme ist nach Wunschschluss gesperrt');

  const afterClose=await page.evaluate(()=>({shifts:KCDP.shifts.length,actual:KCDP.actualShifts.length,wishes:KCDP.wishes.length}));
  assert.equal(afterClose.shifts,before.shifts,'Soll-Daten bleiben unverändert');assert.equal(afterClose.actual,before.actual,'Ist-Daten bleiben unverändert');assert.equal(afterClose.wishes,before.wishes,'Wünsche bleiben eingefroren und unverändert');

  await page.evaluate(()=>KCDP.wishPhaseGuard.reopenPhase());
  assert.equal(await page.evaluate(()=>KCDP.wishPhaseGuard.state().phase),'open','Planer kann bewusst wieder öffnen');
  await page.evaluate(()=>{KCDP.workflow.status='published';KCDP.wishPhaseGuard.renderStatus()});
  assert.match(await page.locator('#kcWishPhaseStatus').innerText(),/Sollplan veröffentlicht – Wunschplan abgeschlossen/);

  await browser.close();console.log('PASS wish phase v0.19.52 server reminder + closure regression');
})().catch(e=>{console.error('FAIL wish phase v0.19.52 focused browser regression');console.error(e.stack||e);process.exit(1)});
