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
  await page.waitForFunction(()=>window.KCDP?.plannerRecommendations&&window.KCDP?.quickPlanRecommendationsUi&&window.KCDP?.dayAvailabilityUi,{timeout:20000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');await page.locator('#uxTestLogin').click();await page.waitForSelector('#unlockSecret',{timeout:10000});await page.locator('#unlockSecret').fill('KC-DP2-Quick-Plan-Recommendations-E2E-2026!');await page.locator('#unlockBtn').click();await page.waitForSelector('#kcChoiceView',{timeout:20000});await page.locator('#kcChoiceEdit').click();await page.waitForSelector('[data-inspector-add]',{timeout:20000});

  const ids=await page.evaluate(()=>{
    const K=window.KCDP,d=K.days[K.state.dateIndex],active=K.people.filter(p=>p.active&&p.personType!=='helper');if(active.length<3)throw new Error('Zu wenige aktive Personen');const [preferred,manual,blocked]=active,zone=d.type==='market'?'front':'neutral';
    preferred.skills='Flex Vorne Hinten';manual.skills='Flex Vorne Hinten';blocked.skills='Flex Vorne Hinten';
    const openRules={allowedZones:[],allowedAreas:[],enforceAllowedAreas:false,forbiddenDates:[],earliestStart:null,latestEnd:null,maxDailyHours:24,maxEventHours:999,minRestHours:0};
    K.staffing.setRules?.(preferred.personId,openRules);K.staffing.setRules?.(manual.personId,openRules);K.staffing.setRules?.(blocked.personId,{...openRules,allowedZones:[zone==='front'?'back':'front']});
    K.wishes=(K.wishes||[]).filter(w=>!String(w.id||'').startsWith('W-QPR-'));K.wishes.push({id:'W-QPR-PREF',personId:preferred.personId,date:d.date,start:d.start,end:Math.min(d.end,d.start+2),wishType:'preferred',status:'confirmed'});K.wishes.push({id:'W-QPR-MAN',personId:manual.personId,date:d.date,start:d.start,end:d.end,wishType:'unavailable',status:'confirmed'});
    K.state.inspectorHour=d.start;K.quickPlanRecommendationsUi.refresh();return {preferred:preferred.personId,manual:manual.personId,blocked:blocked.personId,date:d.date};
  });

  await page.locator('[data-inspector-add]').click();await page.waitForSelector('#quickPlanDrawer.open');await page.waitForSelector('#quickPlanRecommendationSummary',{timeout:10000});await page.waitForFunction(()=>document.querySelectorAll('#quickPlanList [data-recommendation-group]').length>0,null,{timeout:10000});
  const info=await page.evaluate(()=>({groups:[...document.querySelectorAll('#quickPlanList [data-quick-person]')].map(x=>({id:x.dataset.quickPerson,group:x.dataset.recommendationGroup,score:Number(x.dataset.recommendationScore||NaN),text:x.innerText})),summary:document.querySelector('#quickPlanRecommendationSummary')?.innerText||'',date:document.querySelector('#quickPlanDrawer')?.dataset.recommendationDate||''}));
  assert.strictEqual(info.date,ids.date,'Empfehlungen müssen zum aktuell angezeigten Tag gehören');assert.ok(/Planungsempfehlung/.test(info.summary),'Empfehlungszusammenfassung fehlt');assert.strictEqual(info.groups.find(x=>x.id===ids.preferred)?.group,'recommended','Bevorzugte geeignete Person muss automatisch empfohlen sein');assert.strictEqual(info.groups.find(x=>x.id===ids.manual)?.group,'manual','Ganztägig nicht verfügbar muss im Alle-Modus als manuell/Abweichung markiert sein');assert.strictEqual(info.groups.find(x=>x.id===ids.blocked)?.group,'blocked','Harte Zonenregel muss fachlich gesperrt markieren');assert.ok(/Empfehlung/.test(info.groups.find(x=>x.id===ids.preferred)?.text||''),'Empfehlungsrang muss sichtbar sein');assert.ok(/Nur manuell/.test(info.groups.find(x=>x.id===ids.manual)?.text||''),'Manuelle Abweichung muss sichtbar erklärt sein');assert.ok(/Fachlich gesperrt/.test(info.groups.find(x=>x.id===ids.blocked)?.text||''),'Harte Sperre muss sichtbar erklärt sein');const groupOrder=info.groups.map(x=>x.group),firstBlocked=groupOrder.indexOf('blocked'),lastRecommended=groupOrder.lastIndexOf('recommended');assert.ok(firstBlocked<0||lastRecommended<firstBlocked,'Empfohlene müssen vor gesperrten Personen sortiert sein');
  await page.locator('#quickPlanClose').click();await page.locator('[data-inspector-available]').click();await page.waitForSelector('#quickPlanDrawer.open');await page.waitForTimeout(150);
  const filtered=await page.evaluate(()=>({mode:document.querySelector('#quickPlanDrawer')?.dataset.dayAvailabilityMode,visible:[...document.querySelectorAll('#quickPlanList [data-quick-person]:not([hidden])')].map(x=>x.dataset.quickPerson),summary:document.querySelector('#quickPlanRecommendationSummary')?.innerText||''}));assert.strictEqual(filtered.mode,'available','✓-Button muss Verfügbarkeitsmodus beibehalten');assert.ok(!filtered.visible.includes(ids.manual),'Ganztägig nicht verfügbare Person darf im ✓-Filter nicht erscheinen');assert.ok(/Planungsempfehlung/.test(filtered.summary),'Empfehlungslogik muss auch im ✓-Filter aktiv bleiben');
  console.log('KC DP2 V0.19.42 Quick-Plan + KI gemeinsame Empfehlungslogik PASS');await browser.close();browser=null;
})().catch(async err=>{console.error(err);try{await browser?.close();}catch(_){}process.exitCode=1;});
