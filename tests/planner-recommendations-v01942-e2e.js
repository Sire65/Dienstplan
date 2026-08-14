const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const launchOptions={headless:true};if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  const browser=await chromium.launch(launchOptions),page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.route('https://*.supabase.co/**',route=>route.abort());
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.plannerEngine?.version==='0.19.42',{timeout:20000});
  await page.addScriptTag({url:'http://127.0.0.1:4173/src/core/planner-recommendations.js?v=0.19.42'});
  await page.waitForFunction(()=>window.KCDP?.plannerRecommendations?.version==='0.19.42');

  const out=await page.evaluate(()=>{
    const K=window.KCDP,saved={people:K.people,wishes:K.wishes,personRules:K.personRules,shifts:K.shifts,absences:K.absences,days:K.days};
    try{
      const date='2026-12-04',day={date,type:'market',start:12,end:18,weather:{factor:1},program:[]};K.days=[day];K.shifts=[];K.absences=[];
      K.people=[
        {personId:'PREF',name:'Bevorzugt',skills:'Vorne · Flex',personType:'member',active:true,maxHours:8,availability:[]},
        {personId:'FREE',name:'Frei',skills:'Vorne',personType:'member',active:true,maxHours:8,availability:[]},
        {personId:'NO',name:'Nicht verfügbar',skills:'Vorne',personType:'member',active:true,maxHours:8,availability:[]},
        {personId:'QUAL',name:'Keine Frontqualifikation',skills:'Hinten · Küche',personType:'member',active:true,maxHours:8,availability:[]},
        {personId:'BLOCK',name:'Sperrtag',skills:'Vorne',personType:'member',active:true,maxHours:8,availability:[]}
      ];
      K.wishes=[
        {id:'W1',personId:'PREF',date,start:12,end:16,wishType:'preferred',status:'confirmed'},
        {id:'W2',personId:'NO',date,start:12,end:16,wishType:'unavailable',status:'confirmed'}
      ];
      K.personRules={PREF:{maxDailyHours:8},FREE:{maxDailyHours:8},NO:{maxDailyHours:8},QUAL:{maxDailyHours:8},BLOCK:{maxDailyHours:8,forbiddenDates:[date]}};
      const beforeWishFn=K.wishCoverage;
      const r=K.plannerRecommendations.recommendSlot({day,start:12,end:14,zone:'front',area:'Verkauf'});
      const afterWishFn=K.wishCoverage;
      return {
        version:K.plannerRecommendations.version,
        recommended:r.recommended.map(x=>({id:x.personId,score:x.score,auto:x.autoEligible,manual:x.manualAllowed})),
        manual:r.manualOverride.map(x=>({id:x.personId,codes:x.blocked.map(b=>b.code),manual:x.manualAllowed})),
        blocked:r.blocked.map(x=>({id:x.personId,codes:x.blocked.map(b=>b.code),manual:x.manualAllowed})),
        all:r.all.map(x=>x.personId),
        noGlobalMutation:beforeWishFn===afterWishFn,
        explainManual:K.plannerRecommendations.explain(r.manualOverride[0]||{})
      };
    }finally{K.people=saved.people;K.wishes=saved.wishes;K.personRules=saved.personRules;K.shifts=saved.shifts;K.absences=saved.absences;K.days=saved.days;}
  });

  assert.strictEqual(out.version,'0.19.42');
  assert.deepStrictEqual(out.recommended.map(x=>x.id),['PREF','FREE'],'Auto-Empfehlung nutzt nicht dieselbe nachvollziehbare Priorisierung');
  assert(out.recommended[0].score>out.recommended[1].score,'Bevorzugter Wunsch wird im Ranking nicht höher gewichtet');
  assert.deepStrictEqual(out.manual.map(x=>x.id),['NO'],'Bestätigter Nicht-verfügbar-Wunsch soll separat als bewusste manuelle Abweichung erscheinen');
  assert(out.manual[0].codes.includes('wish_unavailable'));
  assert.strictEqual(out.manual[0].manual,true);
  assert(out.blocked.find(x=>x.id==='QUAL')?.codes.includes('qualification'),'Fehlende Qualifikation muss fachlich gesperrt sein');
  assert(out.blocked.find(x=>x.id==='BLOCK')?.codes.includes('forbidden_date'),'Sperrtag muss fachlich gesperrt sein');
  assert.strictEqual(out.noGlobalMutation,true,'Empfehlungsberechnung hat globale Wunschlogik verändert');
  assert(/Nur manuell/i.test(out.explainManual));
  console.log('KC DP2 V0.19.42 shared planner recommendations: PASS');
  await browser.close();
})().catch(err=>{console.error(err);process.exitCode=1;});
