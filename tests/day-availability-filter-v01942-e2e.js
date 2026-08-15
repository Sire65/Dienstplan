const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const launchOptions={headless:true};if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:1280,height:800},locale:'de-DE'});
  const page=await context.newPage();

  await page.route('**/src/core/member-access.js*',async route=>{
    const response=await route.fetch();let body=await response.text();
    const marker="function configured(){const c=publicConfig();return /^https:\\/\\//.test(c.url)&&String(c.publishableKey||'').trim().length>20;}";
    if(!body.includes(marker))throw new Error('member-access configured()-Marker nicht gefunden');
    body=body.replace(marker,'function configured(){return false;}');
    await route.fulfill({response,body,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });
  await page.route('https://*.supabase.co/**',route=>route.abort());
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.auth&&window.KCDP?.dayAvailability&&window.KCDP?.dayAvailabilityUi,{timeout:20000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});
  const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');await page.locator('#uxTestLogin').click();
  await page.waitForSelector('#unlockSecret',{timeout:10000});await page.locator('#unlockSecret').fill('KC-DP2-Day-Availability-E2E-2026!');await page.locator('#unlockBtn').click();
  await page.waitForSelector('#kcChoiceView',{timeout:20000});await page.locator('#kcChoiceEdit').click();
  await page.waitForSelector('[data-inspector-add]',{timeout:20000});await page.waitForSelector('[data-inspector-available]',{timeout:20000});

  const order=await page.evaluate(()=>{const plus=document.querySelector('[data-inspector-add]'),filter=document.querySelector('[data-inspector-available]');return {filterBeforePlus:plus?.previousElementSibling===filter,aria:filter?.getAttribute('aria-label')||''};});
  assert.strictEqual(order.filterBeforePlus,true,'Verfügbarkeitsbutton muss direkt links vom Plus stehen');
  assert.ok(/verfügbare/i.test(order.aria),'Verfügbarkeitsbutton braucht einen zugänglichen Namen');

  const setup=await page.evaluate(()=>{
    const K=window.KCDP,d1=K.days[K.state.dateIndex],d2=K.days[K.state.dateIndex+1];if(!d2)throw new Error('Zweiter Testtag fehlt');
    const active=K.people.filter(p=>p.active&&p.personType!=='helper');if(active.length<4)throw new Error('Zu wenige aktive Mitglieder für Test');
    const [sick,full,partial,free]=active;
    let helper=K.people.find(p=>p.active&&p.personType==='helper'&&![sick.personId,full.personId,partial.personId,free.personId].includes(p.personId));
    if(!helper){helper={personId:'KC-HELPER-DAYFILTER',name:'Aushilfe Tagesfilter',personType:'helper',active:true,skills:'Flex',maxHours:8,availability:[],expanded:true};K.people.push(helper);}
    helper.availability=[];
    K.absences=(K.absences||[]).filter(a=>a.id!=='ABS-DAYFILTER');K.absences.push({id:'ABS-DAYFILTER',personId:sick.personId,date:d1.date,start:d1.start,end:d1.end,status:'replacement_needed',type:'sick',reason:'krank'});
    K.wishes=(K.wishes||[]).filter(w=>!String(w.id||'').startsWith('W-DAYFILTER-'));
    K.wishes.push({id:'W-DAYFILTER-FULL',personId:full.personId,date:d1.date,start:d1.start,end:d1.end,wishType:'unavailable',status:'confirmed'});
    K.wishes.push({id:'W-DAYFILTER-PART',personId:partial.personId,date:d1.date,start:d1.start,end:Math.min(d1.end,d1.start+1),wishType:'unavailable',status:'confirmed'});
    return {d1:d1.date,d2:d2.date,sick:sick.personId,full:full.personId,partial:partial.personId,free:free.personId,helper:helper.personId};
  });

  async function visibleIds(){return page.locator('#quickPlanList [data-quick-person]:visible').evaluateAll(rows=>rows.map(x=>x.dataset.quickPerson));}
  await page.locator('[data-inspector-add]').click();await page.waitForSelector('#quickPlanDrawer.open');
  const allIds=await visibleIds();
  for(const id of [setup.sick,setup.full,setup.partial,setup.free,setup.helper])assert.ok(allIds.includes(id),`Alle-Liste muss ${id} enthalten`);
  await page.locator('#quickPlanClose').click();

  await page.locator('[data-inspector-available]').click();await page.waitForSelector('#quickPlanDrawer.open');await page.waitForTimeout(150);
  const day1Ids=await visibleIds();
  assert.ok(!day1Ids.includes(setup.sick),'Krank/abwesend muss im Tagesfilter fehlen');
  assert.ok(!day1Ids.includes(setup.full),'Ganztägig nicht verfügbar muss im Tagesfilter fehlen');
  assert.ok(!day1Ids.includes(setup.helper),'Aushilfe ohne Zeitfenster muss im Tagesfilter fehlen');
  assert.ok(day1Ids.includes(setup.partial),'Teilweise nicht verfügbar muss für restliche Tageszeit sichtbar bleiben');
  assert.ok(day1Ids.includes(setup.free),'Freie Person muss sichtbar sein');
  const mode1=await page.locator('#quickPlanDrawer').getAttribute('data-day-availability-mode');assert.strictEqual(mode1,'available');
  await page.locator('#quickPlanClose').click();

  await page.evaluate(({d2,free,helper})=>{
    const K=window.KCDP,d=K.days.find(x=>x.date===d2),h=K.person(helper);h.availability=[{date:d2,start:d.start,end:Math.min(d.end,d.start+4)}];
    K.wishes.push({id:'W-DAYFILTER-D2',personId:free,date:d2,start:d.start,end:d.end,wishType:'unavailable',status:'confirmed'});
  },setup);
  await page.locator('#nextDayBtn').click();await page.waitForFunction(date=>window.KCDP.days[window.KCDP.state.dateIndex]?.date===date,setup.d2);
  await page.waitForSelector('[data-inspector-available]');await page.locator('[data-inspector-available]').click();await page.waitForSelector('#quickPlanDrawer.open');await page.waitForTimeout(150);
  const day2Ids=await visibleIds();
  assert.ok(day2Ids.includes(setup.sick),'Krankmeldung vom Vortag darf am Folgetag nicht weiterfiltern');
  assert.ok(day2Ids.includes(setup.full),'Ganztägiger Nicht-verfügbar-Wunsch vom Vortag darf am Folgetag nicht weiterfiltern');
  assert.ok(day2Ids.includes(setup.helper),'Aushilfe mit Zeitfenster am Folgetag muss sichtbar werden');
  assert.ok(!day2Ids.includes(setup.free),'Ganztägig nicht verfügbar am Folgetag muss ausgeblendet werden');
  const summary=await page.locator('#quickPlanAvailabilitySummary').innerText();assert.ok(summary.includes(setup.d2.split('-').reverse().join('.'))||/Nur heute verfügbar/i.test(summary),'Tagesfilter-Zusammenfassung fehlt');

  console.log('KC DP2 V0.19.42 Tagesverfügbarkeitsfilter: Alle vs. verfügbar + Tageswechsel PASS');
  await browser.close();
})().catch(async err=>{console.error(err);process.exitCode=1;});
