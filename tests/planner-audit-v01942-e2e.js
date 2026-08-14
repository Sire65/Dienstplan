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
  await page.waitForFunction(()=>window.KCDP?.plannerEngine&&window.KCDP?.plannerAudit&&window.KCDP?.plannerAuditUi,{timeout:20000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');await page.locator('#uxTestLogin').click();await page.waitForSelector('#unlockSecret',{timeout:10000});await page.locator('#unlockSecret').fill('KC-DP2-Planner-Audit-E2E-2026!');await page.locator('#unlockBtn').click();await page.waitForSelector('#kcChoiceView',{timeout:20000});await page.locator('#kcChoiceEdit').click();await page.waitForSelector('#aiPlanBtn',{timeout:20000});

  const service=await page.evaluate(()=>{const K=window.KCDP,d=K.days[K.state.dateIndex],r=K.plannerEngine.buildProposal(d),a=K.plannerAudit.audit(d,r.shifts);const compressed=K.plannerAudit.compressGaps([{time:12,zone:'front',missing:1},{time:12.25,zone:'front',missing:1},{time:12.5,zone:'back',missing:1}]);return {validation:r.validation.ok,auditReady:a.ready,hard:a.hardViolations.length,gaps:a.gaps.length,total:a.totalShifts,compressed};});
  assert.strictEqual(service.auditReady,service.validation,'Audit und Planner-Validierung müssen denselben Freigabestatus liefern');assert.ok(service.total>=0,'Audit muss Dienstanzahl liefern');assert.strictEqual(service.compressed.length,2,'Zusammenhängende Lücken gleicher Zone müssen komprimiert werden');assert.strictEqual(service.compressed[0].start,12);assert.strictEqual(service.compressed[0].end,12.5);

  await page.locator('#aiPlanBtn').click();await page.waitForSelector('#plannerAuditPanel',{timeout:10000});const initial=await page.evaluate(()=>({status:document.querySelector('#plannerAuditPanel')?.dataset.auditStatus,text:document.querySelector('#plannerAuditPanel')?.innerText||'',disabled:document.querySelector('#aiApply')?.disabled,last:window.KCDP.plannerAuditUi.last}));assert.ok(['ready','blocked'].includes(initial.status),'Auditpanel braucht eindeutigen Freigabestatus');assert.ok(/Automatische Schlussprüfung/.test(initial.text),'Auditpanel muss als Schlussprüfung gekennzeichnet sein');assert.ok(/Harte Fehler/.test(initial.text)&&/Lücken/.test(initial.text),'Audit-KPIs fehlen');assert.strictEqual(initial.disabled,initial.status==='blocked','Übernahmebutton muss exakt bei blockiertem Audit gesperrt sein');

  const forced=await page.evaluate(()=>{const K=window.KCDP,d=K.days[K.state.dateIndex],zone=d.type==='market'?'front':'neutral';K.plannerEngine.lastResult={day:d.date,shifts:[{id:'AUDIT-BAD',personId:'KC-NICHT-VORHANDEN',date:d.date,start:d.start,end:Math.min(d.end,d.start+1),zone,area:zone==='front'?'Verkauf':'Vor-/Nachbereitung',layer:'planned',status:'proposal',breakMinutes:0,breakSegments:[]}],validation:{ok:false},engineVersion:'0.19.42'};const a=K.plannerAuditUi.refresh();return {status:a?.status,hard:a?.hardViolations?.length,disabled:document.querySelector('#aiApply')?.disabled,text:document.querySelector('#plannerAuditPanel')?.innerText||''};});assert.strictEqual(forced.status,'blocked','Ungültiger Vorschlag muss blockiert werden');assert.ok(forced.hard>0,'Ungültiger Vorschlag braucht harte Fehler');assert.strictEqual(forced.disabled,true,'Übernahme muss bei harter Verletzung deaktiviert sein');assert.ok(/BLOCKIERT/.test(forced.text),'Blockierung muss sichtbar erklärt sein');

  console.log('KC DP2 V0.19.42 KI-Plan Schlussprüfung/Audit: Freigabe + Blockierung PASS');await browser.close();browser=null;
})().catch(async err=>{console.error(err);try{await browser?.close();}catch(_){}process.exitCode=1;});
