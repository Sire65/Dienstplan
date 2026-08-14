const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const launchOptions={headless:true};
  if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:1366,height:900},locale:'de-DE'});
  const page=await context.newPage();
  page.on('console',msg=>{if(msg.type()==='error')console.error('BROWSER:',msg.text());});
  page.on('pageerror',err=>console.error('PAGEERROR:',err.message));

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
  await page.waitForFunction(()=>window.KCDP?.roleUx&&window.KCDP?.memberAccess&&window.KCDP?.actual&&window.KCDP?.publishPlan&&window.KCDP?.mutations,{timeout:20000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});
  const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');
  if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');
  await page.locator('#uxTestLogin').click();
  await page.waitForSelector('#unlockSecret',{timeout:10000});
  await page.locator('#unlockSecret').fill('KC-DP2-Workflow-E2E-2026!');
  await page.locator('#unlockBtn').click();
  await page.waitForSelector('#kcChoiceView',{timeout:20000});

  const result=await page.evaluate(()=>{
    const K=window.KCDP;
    const clone=v=>JSON.parse(JSON.stringify(v));
    K.__workflowE2ESnapshot={
      currentUser:clone(K.currentUser),shifts:clone(K.shifts),wishes:clone(K.wishes),standby:clone(K.standby),
      planVersions:clone(K.planVersions),acknowledgements:clone(K.acknowledgements),actualShifts:clone(K.actualShifts),
      actualWorkflow:clone(K.actualWorkflow),workflow:clone(K.workflow),breakConfig:clone(K.breakConfig),state:clone(K.state)
    };
    if(K.sync)K.sync.enqueue=()=>({queued:true,test:true});
    if(K.pushAdapter)K.pushAdapter.publishPreview=async()=>({ok:true,test:true});
    if(K.notifications){K.notifications.onPlanPublished=()=>{};K.notifications.onAudit=()=>{};}

    const active=K.people.filter(p=>p.active&&p.personType!=='helper');
    if(!active.length)throw new Error('Keine aktive Testperson gefunden');
    const person=active[0];
    const day=K.days.find(d=>d.type==='market')||K.days[0];
    if(!day)throw new Error('Kein Planungstag vorhanden');
    let start=null;
    for(let t=day.start;t+1<=day.end;t+=0.5){
      const overlap=K.shifts.some(s=>s.personId===person.personId&&s.date===day.date&&s.layer==='planned'&&!['deleted','cancelled','absent','failed'].includes(s.status)&&Math.max(s.start,t)<Math.min(s.end,t+1));
      if(!overlap){start=t;break;}
    }
    if(start==null)throw new Error('Kein freies Testzeitfenster gefunden');
    const end=start+1,zone=day.type==='market'?'front':'neutral',area=day.type==='market'?'Verkauf':'Vor-/Nachbereitung';

    K.auth.setCurrentUser({personId:person.personId,role:'employee',displayName:person.name});
    const wishOut=K.mutations.saveWish({id:'',personId:person.personId,date:day.date,start,end,wishType:'preferred',source:'self_service',comment:'E2E Workflow',confidence:1,status:'confirmed'},{reason:'E2E Wunsch'});
    if(!K.wishesFor(day.date).some(w=>w.id===wishOut.record.id))throw new Error('Wunsch wurde nicht gespeichert');
    if(!K.wishCoverage(person.personId,day.date,start,end).preferred)throw new Error('Wunschabdeckung erkennt bevorzugten Wunsch nicht');

    K.auth.setCurrentUser({personId:person.personId,role:'admin',displayName:'E2E Admin'});
    const shiftOut=K.mutations.saveShift({id:'',personId:person.personId,date:day.date,start,end,zone,area,layer:'planned',breakMinutes:0,breakSegments:[],status:'draft'},{reason:'E2E Soll-Entwurf'});
    const shiftId=shiftOut.record.id;
    if(!K.shifts.some(s=>s.id===shiftId))throw new Error('Soll-Entwurf wurde nicht gespeichert');

    K.auth.setCurrentUser({personId:person.personId,role:'employee',displayName:person.name});
    if(K.visiblePlannedShifts(day.date).some(s=>s.id===shiftId))throw new Error('Unveröffentlichter Soll-Entwurf ist für Mitglied sichtbar');

    K.auth.setCurrentUser({personId:person.personId,role:'admin',displayName:'E2E Admin'});
    K.breakConfig.enabled=false;
    const previousVersion=K.latestPublishedVersion()?.version||0;
    const publication=K.publishPlan({publishedBy:'E2E Admin',reason:'Automatisierter E2E-Test; Testbesetzung bewusst freigegeben.'});
    if(publication.version!==previousVersion+1)throw new Error('Planversion wurde nicht erhöht');
    if(!publication.shifts.some(s=>s.id===shiftId))throw new Error('Veröffentlichte Version enthält den Testdienst nicht');

    K.auth.setCurrentUser({personId:person.personId,role:'employee',displayName:person.name});
    if(!K.visiblePlannedShifts(day.date).some(s=>s.id===shiftId))throw new Error('Veröffentlichter Soll-Dienst ist für Mitglied nicht sichtbar');
    const ack=K.markPlanSeen(person.personId);
    if(ack.version!==publication.version)throw new Error('Gesehen-Bestätigung verweist auf falsche Planversion');

    K.auth.setCurrentUser({personId:person.personId,role:'admin',displayName:'E2E Admin'});
    const actualOut=K.actual.saveActual({id:'',personId:person.personId,date:day.date,start:start+0.25,end:end+0.5,breakMinutes:0,status:'recorded'},{reason:'E2E Istzeit',source:'manual_correction'});
    if(actualOut.record.linkedShiftId!==shiftId)throw new Error('Istzeit wurde nicht mit dem Test-Solldienst verknüpft');
    if(actualOut.comparison.status!=='deviation')throw new Error(`Falscher Soll/Ist-Status: ${actualOut.comparison.status}`);
    const stats=K.actual.dayStats(day.date);
    if(stats.matched<1||stats.deviations<1)throw new Error('Tagesstatistik enthält die Soll/Ist-Abweichung nicht');
    const coverage=K.actual.coverageAt(day,start+0.5);
    if(!coverage.active.some(a=>a.id===actualOut.record.id))throw new Error('Ist-Besetzung erscheint nicht in der Ist-Matrix');

    K.state.dateIndex=K.days.findIndex(d=>d.date===day.date);
    return {person:person.name,date:day.date,start,end,wishId:wishOut.record.id,shiftId,actualId:actualOut.record.id,version:publication.version,comparison:actualOut.comparison.status,matched:stats.matched,deviations:stats.deviations};
  });

  // Echter UI-Pfad: Startauswahl -> Bearbeiten -> Vergleich. Dieser Klick löst den gekapselten app.js-render() aus.
  await page.evaluate(()=>window.KCDP.startChoice.openEdit());
  await page.waitForSelector('body.ux-legacy',{timeout:10000});
  await page.locator('#layerTabs button[data-layer="compare"]').click();
  await page.waitForFunction(()=>document.querySelector('.matrix-title')?.textContent.includes('SOLL-/IST-MATRIX'),{timeout:10000});
  const matrixTitle=(await page.locator('.matrix-title').innerText()).trim();
  assert(matrixTitle.includes('SOLL-/IST-MATRIX'),'Vergleichsmatrix wurde nicht gerendert');
  assert(await page.locator(`.shift[data-actual="${result.actualId}"]`).count()>0,'Ist-Balken fehlt in der Vergleichsansicht');

  await page.evaluate(()=>{
    const K=window.KCDP,b=K.__workflowE2ESnapshot;if(!b)return;
    K.shifts=b.shifts;K.wishes=b.wishes;K.standby=b.standby;K.planVersions=b.planVersions;K.acknowledgements=b.acknowledgements;
    K.actualShifts=b.actualShifts;K.actualWorkflow=b.actualWorkflow;K.workflow=b.workflow;K.breakConfig=b.breakConfig;K.currentUser=b.currentUser;K.state=b.state;
    delete K.__workflowE2ESnapshot;
  });

  assert.strictEqual(result.comparison,'deviation');
  assert(result.version>=1);
  console.log('KC DP2 workflow E2E: PASS');
  console.log(JSON.stringify({...result,matrixTitle}));
  await browser.close();
})().catch(err=>{
  console.error('KC DP2 workflow E2E: FAIL');
  console.error(err.stack||err);
  process.exit(1);
});
