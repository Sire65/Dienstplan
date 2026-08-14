const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const launchOptions={headless:true};if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  const browser=await chromium.launch(launchOptions),page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.route('https://*.supabase.co/**',route=>route.abort());
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.plannerApplicationGuard?.version==='0.19.42'&&window.KCDP?.mutations?.__kcPlannerGuardV01942===true,{timeout:20000});
  const out=await page.evaluate(()=>{
    const K=window.KCDP,day=K.day(),before=JSON.stringify(K.shifts);
    let code=null,message='';
    try{K.mutations.replaceDayPlan(day.date,[],{reason:'KI-Vorschlagsplan übernommen'});}catch(e){code=e.code||null;message=e.message||String(e);}
    return {guard:K.plannerApplicationGuard.version,installed:K.mutations.__kcPlannerGuardV01942===true,code,message,unchanged:JSON.stringify(K.shifts)===before};
  });
  assert.strictEqual(out.guard,'0.19.42');
  assert.strictEqual(out.installed,true,'Apply-Guard ist nicht an replaceDayPlan installiert');
  assert.strictEqual(out.code,'KC_PLANNER_APPLY_BLOCKED','Ungültiger KI-Vorschlag wurde nicht an der Mutationsgrenze blockiert');
  assert(/nicht übernommen/i.test(out.message));
  assert.strictEqual(out.unchanged,true,'Blockierter Vorschlag hat den Sollplan trotzdem verändert');
  console.log('KC DP2 V0.19.42 Planner application guard: PASS');
  await browser.close();
})().catch(err=>{console.error(err);process.exitCode=1;});
