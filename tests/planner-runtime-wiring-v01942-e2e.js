const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const launchOptions={headless:true};
  if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  const browser=await chromium.launch(launchOptions);
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.route('https://*.supabase.co/**',route=>route.abort());
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.plannerEngine?.version==='0.19.42',{timeout:20000});
  const out=await page.evaluate(()=>{
    const K=window.KCDP,scripts=[...document.scripts].map(s=>s.getAttribute('src')||'');
    const staffing=scripts.findIndex(x=>x.includes('src/core/staffing.js'));
    const breaks=scripts.findIndex(x=>x.includes('src/core/breaks.js'));
    const planner=scripts.findIndex(x=>x.includes('src/core/planner-engine.js'));
    const day=K.day();
    const proposal=K.aiProposal(day);
    const score=K.scoreAiProposal(day,proposal);
    return {version:K.plannerEngine.version,staffing,breaks,planner,proposal:Array.isArray(proposal),lastVersion:K.plannerEngine.lastResult?.engineVersion||null,scoreFields:{valid:typeof score.valid,gaps:typeof score.gaps,hard:typeof score.hardViolations}};
  });
  assert.strictEqual(out.version,'0.19.42');
  assert(out.staffing>=0&&out.breaks>out.staffing&&out.planner>out.breaks,'Planner-Script ist nicht nach Staffing und Pausenregeln geladen');
  assert.strictEqual(out.proposal,true,'K.aiProposal liefert keinen Vorschlag mehr');
  assert.strictEqual(out.lastVersion,'0.19.42','UI-Kompatibilitätswrapper verwendet nicht den neuen Planner');
  assert.deepStrictEqual(out.scoreFields,{valid:'boolean',gaps:'number',hard:'number'});
  console.log('KC DP2 V0.19.42 Planner runtime wiring: PASS');
  await browser.close();
})().catch(err=>{console.error(err);process.exitCode=1;});
