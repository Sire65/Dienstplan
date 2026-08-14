const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:800},locale:'de-DE'});
  const page=await context.newPage();

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
  await page.waitForFunction(()=>window.KCDP?.auth&&window.KCDP?.startChoice&&window.KCDP?.roleUx&&window.KCDP?.memberAccess,{timeout:20000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});
  const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');
  if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');
  await page.locator('#uxTestLogin').click();
  await page.waitForSelector('#unlockSecret',{timeout:10000});
  await page.locator('#unlockSecret').fill('KC-DP2-Roles-E2E-2026!');
  await page.locator('#unlockBtn').click();
  await page.waitForSelector('#kcChoiceView',{timeout:20000});

  const result=await page.evaluate(()=>{
    const K=window.KCDP;
    const member=(K.people||[]).find(p=>p.personType==='member')||K.people?.[0];
    const other=(K.people||[]).find(p=>p.personId!==member?.personId)||K.people?.[1];
    const helper=(K.people||[]).find(p=>p.personType==='helper')||{personId:'KC-HELPER-E2E',name:'Aushilfe Test',personType:'helper'};
    const checks=[];
    const ok=(name,value)=>checks.push({name,value:!!value});
    const set=(role,person=member)=>{K.currentUser={personId:person?.personId||'KC-E2E',displayName:person?.name||role,role};};
    const editVisible=()=>{K.startChoice.show();return !!document.getElementById('kcChoiceEdit');};

    for(const role of ['employee','planner','duty_manager','time_auditor','read_only','admin'])ok(`Rolle ${role} vorhanden`,!!K.auth.roles?.[role]);

    set('employee');
    ok('Mitarbeiter sieht veröffentlichten Plan',K.auth.has('roster.plan.view_published'));
    ok('Mitarbeiter darf Plan nicht bearbeiten',!K.auth.has('roster.plan.edit'));
    ok('Mitarbeiter darf eigenen Wunsch bearbeiten',K.auth.canEditWish(member.personId));
    ok('Mitarbeiter darf fremden Wunsch nicht bearbeiten',!K.auth.canEditWish(other?.personId||'OTHER'));
    ok('Mitarbeiter sieht keinen Bearbeiten-Einstieg',!editVisible());
    let employeeBlocked=false;try{K.auth.require('roster.plan.edit');}catch(_){employeeBlocked=true;}ok('Mitarbeiter wird servernah am Rechte-Core blockiert',employeeBlocked);

    set('employee',helper);
    ok('Aushilfe mit Mitarbeiterrolle hat keine Planbearbeitung',!K.auth.has('roster.plan.edit'));
    ok('Aushilfe bekommt keinen Bearbeiten-Einstieg',!editVisible());

    set('planner');
    ok('Planer darf Plan bearbeiten',K.auth.has('roster.plan.edit'));
    ok('Planer darf veröffentlichen',K.auth.has('roster.plan.publish'));
    ok('Planer bekommt Bearbeiten-Einstieg',editVisible());

    set('duty_manager');
    ok('Dienstverantwortlicher darf Plan bearbeiten',K.auth.has('roster.plan.edit'));
    ok('Dienstverantwortlicher darf nicht veröffentlichen',!K.auth.has('roster.plan.publish'));
    ok('Dienstverantwortlicher bekommt Bearbeiten-Einstieg',editVisible());

    set('time_auditor');
    ok('Zeitprüfer darf Ist importieren',K.auth.has('roster.actual.import'));
    ok('Zeitprüfer darf Ist korrigieren',K.auth.has('roster.actual.correct'));
    ok('Zeitprüfer darf Sollplan nicht bearbeiten',!K.auth.has('roster.plan.edit'));
    ok('Zeitprüfer bekommt keinen Bearbeiten-Einstieg',!editVisible());

    set('read_only');
    ok('Nur-Lesen sieht veröffentlichten Plan',K.auth.has('roster.plan.view_published'));
    ok('Nur-Lesen darf keinen Wunsch ändern',!K.auth.canEditWish(member.personId));
    ok('Nur-Lesen darf Plan nicht bearbeiten',!K.auth.has('roster.plan.edit'));
    ok('Nur-Lesen bekommt keinen Bearbeiten-Einstieg',!editVisible());

    set('admin');
    ok('Admin besitzt Vollrecht',K.auth.has('roster.plan.edit')&&K.auth.has('roster.plan.publish')&&K.auth.has('roster.actual.correct'));
    ok('Admin bekommt Bearbeiten-Einstieg',editVisible());

    return checks;
  });

  const failed=result.filter(x=>!x.value);
  for(const row of result)console.log(`${row.value?'PASS':'FAIL'} ${row.name}`);
  assert.strictEqual(failed.length,0,`Rollenprüfung fehlgeschlagen: ${failed.map(x=>x.name).join(', ')}`);
  console.log(`KC DP2 Rollen- und Berechtigungsmatrix erfolgreich: ${result.length}/${result.length}`);
  await browser.close();
})().catch(async err=>{console.error(err);process.exitCode=1;});
