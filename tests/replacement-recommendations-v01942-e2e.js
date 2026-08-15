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
  await page.waitForFunction(()=>window.KCDP?.replacementRecommendations&&window.KCDP?.plannerRecommendations&&window.KCDP?.staffing?.replacementSearch,{timeout:20000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');await page.locator('#uxTestLogin').click();await page.waitForSelector('#unlockSecret',{timeout:10000});await page.locator('#unlockSecret').fill('KC-DP2-Replacement-Shared-Core-E2E-2026!');await page.locator('#unlockBtn').click();await page.waitForSelector('#kcChoiceView',{timeout:20000});await page.locator('#kcChoiceEdit').click();

  const out=await page.evaluate(()=>{
    const K=window.KCDP,d=K.days[K.state.dateIndex],people=K.people.filter(p=>p.active&&p.personType!=='helper');if(people.length<4)throw new Error('Zu wenige aktive Mitglieder');
    const [standby,normal,unavailable,hardBlocked]=people,ids=new Set(people.slice(0,4).map(p=>p.personId)),start=Number(d.start),end=Math.min(Number(d.end),start+1),zone=d.type==='market'?'front':'neutral',area=zone==='front'?'Verkauf':zone==='back'?'Hinten':'Vor-/Nachbereitung';
    for(const p of [standby,normal,unavailable,hardBlocked])p.skills='Flex Vorne Hinten';
    const open={allowedZones:[],allowedAreas:[],enforceAllowedAreas:false,forbiddenDates:[],earliestStart:null,latestEnd:null,maxDailyHours:24,maxEventHours:999,minRestHours:0};
    K.staffing.setRules?.(standby.personId,open);K.staffing.setRules?.(normal.personId,open);K.staffing.setRules?.(unavailable.personId,open);K.staffing.setRules?.(hardBlocked.personId,{...open,allowedZones:[zone==='front'?'back':'front']});
    K.shifts=(K.shifts||[]).filter(s=>!(s.date===d.date&&ids.has(s.personId)));
    K.absences=(K.absences||[]).filter(a=>!(a.date===d.date&&ids.has(a.personId)));
    K.wishes=(K.wishes||[]).filter(w=>!(w.date===d.date&&ids.has(w.personId))&&!String(w.id||'').startsWith('W-REPL-'));
    K.standby=(K.standby||[]).filter(s=>!(s.date===d.date&&ids.has(s.personId)));
    K.wishes.push({id:'W-REPL-STANDBY',personId:standby.personId,date:d.date,start,end,wishType:'available',status:'confirmed'});
    K.wishes.push({id:'W-REPL-NORMAL',personId:normal.personId,date:d.date,start,end,wishType:'available',status:'confirmed'});
    K.wishes.push({id:'W-REPL-NO',personId:unavailable.personId,date:d.date,start,end,wishType:'unavailable',status:'confirmed'});
    K.standby.push({id:'SB-REPL-E2E',personId:standby.personId,date:d.date,start,end,status:'planned'});
    const proposal=(K.shifts||[]).filter(s=>s.layer==='planned'&&s.date===d.date&&!['cancelled','absent','failed','deleted'].includes(s.status));
    const shared=K.plannerRecommendations.recommendSlot({day:d,start,end,zone,area,proposal});
    const result=K.staffing.replacementSearch({date:d.date,start,end,zone,area,excludePersonId:null,mode:'shift'});
    const legacyStandby=K.staffing.replacementSearch({date:d.date,start,end,zone,area,excludePersonId:null,mode:'standby'});
    return {ids:{standby:standby.personId,normal:normal.personId,unavailable:unavailable.personId,hardBlocked:hardBlocked.personId},shared,result,legacyStandby};
  });

  assert.strictEqual(out.result.source,'shared-planner-recommendations','Schicht-Ersatz muss die gemeinsame Planner-Empfehlung verwenden');assert.strictEqual(out.result.engineVersion,'0.19.42');
  const sharedStandby=out.shared.all.find(x=>x.personId===out.ids.standby),sharedNormal=out.shared.all.find(x=>x.personId===out.ids.normal),replStandby=out.result.candidates.find(x=>x.personId===out.ids.standby),replNormal=out.result.candidates.find(x=>x.personId===out.ids.normal);
  assert.ok(sharedStandby?.autoEligible&&sharedNormal?.autoEligible,'Geeignete Testpersonen müssen im gemeinsamen Core freigegeben sein');assert.ok(replStandby&&replNormal,'Geeignete Personen müssen als Ersatzkandidaten erscheinen');assert.strictEqual(replStandby.basePlannerScore,sharedStandby.score,'Ersatzsuche muss denselben Basisscore wie Planner verwenden');assert.strictEqual(replNormal.basePlannerScore,sharedNormal.score,'Normaler Ersatzkandidat muss Planner-Basisscore übernehmen');assert.strictEqual(replStandby.score,replStandby.basePlannerScore+90,'Bereitschaft darf nur den definierten Ersatzbonus erhalten');assert.strictEqual(replStandby.standbyId,'SB-REPL-E2E');assert.ok(/bereits in Bereitschaft/.test(replStandby.reasons.join(' · ')),'Bereitschaftsbonus muss erklärt werden');assert.strictEqual(out.result.candidates[0].personId,out.ids.standby,'Bereitschaft soll bei sonst geeigneter Person bevorzugt werden');
  const unavailable=out.result.blocked.find(x=>x.personId===out.ids.unavailable),hard=out.result.blocked.find(x=>x.personId===out.ids.hardBlocked);assert.ok(unavailable,'Nicht verfügbare Person muss geblockt bleiben');assert.ok(unavailable.codes.includes('wish_unavailable'));assert.ok(hard,'Harte Einsatzregel muss geblockt bleiben');assert.ok(hard.codes.includes('zone_restricted'));
  assert.strictEqual(out.legacyStandby.mode,'standby','Bereitschaftssuche muss ihren bestehenden Sonderpfad behalten');assert.notStrictEqual(out.legacyStandby.source,'shared-planner-recommendations','Standby-Modus darf nicht versehentlich durch Schicht-Ersatzlogik laufen');

  console.log('KC DP2 V0.19.42 Ersatz-/Lückensuche nutzt gemeinsamen Planner-Core: PASS');await browser.close();browser=null;
})().catch(async err=>{console.error(err);try{await browser?.close();}catch(_){}process.exitCode=1;});
