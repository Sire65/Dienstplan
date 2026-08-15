const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const launchOptions={headless:true};
  if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:1280,height:800},locale:'de-DE'});
  const page=await context.newPage();
  await page.route('https://*.supabase.co/**',route=>route.abort());
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.staffing?.rulesFor&&window.KCDP?.breaks?.applySuggested,{timeout:20000});
  await page.addScriptTag({url:'http://127.0.0.1:4173/src/core/planner-engine.js?v=0.19.42'});
  await page.waitForFunction(()=>window.KCDP?.plannerEngine?.version==='0.19.42');

  const result=await page.evaluate(()=>{
    const K=window.KCDP;
    const saved={
      people:K.people,shifts:K.shifts,wishes:K.wishes,absences:K.absences,personRules:K.personRules,days:K.days,
      requirementFor:K.requirementFor,breakConfig:JSON.parse(JSON.stringify(K.breakConfig)),state:{...K.state}
    };
    const person=(id,name,skills,type='member',availability=[])=>({personId:id,name,displayName:name,skills,personType:type,active:true,maxHours:8,availability,preferences:{}});
    const hours=(rows,id)=>rows.filter(s=>s.personId===id).reduce((n,s)=>n+(s.end-s.start),0);
    try{
      const date='2026-12-04';
      const day={date,type:'market',start:10,end:14,weather:{factor:1},program:[]};
      K.days=[day];K.state.step=30;
      K.people=[
        person('F1','Front Eins','Vorne'),
        person('F2','Front Zwei','Vorne · Flex'),
        person('F3','Front Drei','Getränke'),
        person('B1','Hinten Eins','Hinten · Küche'),
        person('U1','Nicht verfügbar','Vorne · Flex'),
        person('NQ','Falsche Qualifikation','Hinten'),
        person('FORB','Gesperrt','Vorne'),
        person('HELP','Aushilfe','Vorne','helper',[{date,start:12,end:14}]),
        person('EVENT','Eventlimit','Vorne'),
        person('REST','Ruhezeit','Vorne'),
        person('EARLY','Startgrenze','Vorne')
      ];
      K.shifts=[
        {id:'OLD-EVENT',personId:'EVENT',date:'2026-12-03',start:12,end:13.5,zone:'front',area:'Verkauf',layer:'planned',status:'draft',breakMinutes:0},
        {id:'OLD-REST',personId:'REST',date:'2026-12-03',start:18,end:23,zone:'front',area:'Verkauf',layer:'planned',status:'draft',breakMinutes:0}
      ];
      K.wishes=[
        {id:'W-U1',personId:'U1',date,start:10,end:14,wishType:'unavailable',status:'confirmed'},
        {id:'W-F1',personId:'F1',date,start:10,end:12,wishType:'preferred',status:'confirmed'},
        {id:'W-F2',personId:'F2',date,start:10,end:14,wishType:'available',status:'confirmed'}
      ];
      K.absences=[];
      K.personRules={
        F1:{maxDailyHours:2},F2:{maxDailyHours:8},F3:{maxDailyHours:8},B1:{maxDailyHours:8},
        FORB:{forbiddenDates:[date]},EVENT:{maxDailyHours:8,maxEventHours:2},REST:{maxDailyHours:8,minRestHours:12},EARLY:{maxDailyHours:8,earliestStart:12}
      };
      K.requirementFor=(d,t)=>t>=12&&t<13?{total:3,front:2,back:1,baseTotal:2,weatherExtra:1,programExtra:0}:{total:2,front:1,back:1,baseTotal:2,weatherExtra:0,programExtra:0};
      K.breakConfig={...K.breakConfig,enabled:true,thresholds:[{overHours:6,requiredMinutes:30},{overHours:9,requiredMinutes:45}],minSegmentMinutes:15,maxContinuousHours:6,coverageImpact:true,hoursAccounting:'included',autoSuggest:true,enforcement:'warning'};

      const gateUnavailable=K.plannerEngine.eligibility(K.person('U1'),{day,start:10,end:10.5,zone:'front',area:'Verkauf',proposal:[]});
      const gateQualification=K.plannerEngine.eligibility(K.person('NQ'),{day,start:10,end:10.5,zone:'front',area:'Verkauf',proposal:[]});
      const gateForbidden=K.plannerEngine.eligibility(K.person('FORB'),{day,start:10,end:10.5,zone:'front',area:'Verkauf',proposal:[]});
      const gateHelper=K.plannerEngine.eligibility(K.person('HELP'),{day,start:10,end:10.5,zone:'front',area:'Verkauf',proposal:[]});
      const gateEvent=K.plannerEngine.eligibility(K.person('EVENT'),{day,start:10,end:11,zone:'front',area:'Verkauf',proposal:[]});
      const gateRest=K.plannerEngine.eligibility(K.person('REST'),{day,start:10,end:11,zone:'front',area:'Verkauf',proposal:[]});
      const gateEarly=K.plannerEngine.eligibility(K.person('EARLY'),{day,start:10,end:11,zone:'front',area:'Verkauf',proposal:[]});

      const first=K.plannerEngine.buildProposal(day);
      const signature=x=>x.shifts.map(s=>({id:s.id,personId:s.personId,start:s.start,end:s.end,zone:s.zone,area:s.area,breakMinutes:s.breakMinutes||0,breakSegments:s.breakSegments||[]}));
      const firstSig=signature(first),second=K.plannerEngine.buildProposal(day),secondSig=signature(second);
      const coverageAt12=K.plannerEngine.coverageFor(day,12,first.shifts);
      const usedIds=[...new Set(first.shifts.map(s=>s.personId))];
      const score=K.plannerEngine.explainProposal(day,first.shifts);

      const breakDate='2026-12-05',breakDay={date:breakDate,type:'prep',start:8,end:16,weather:{factor:1},program:[]};
      K.days=[breakDay];K.people=[person('MAIN','Hauptperson','Flex'),person('BACKUP','Pausenreserve','Flex')];K.shifts=[];K.absences=[];
      K.wishes=[{id:'W-MAIN',personId:'MAIN',date:breakDate,start:8,end:16,wishType:'preferred',status:'confirmed'}];
      K.personRules={MAIN:{maxDailyHours:8},BACKUP:{maxDailyHours:8}};
      K.requirementFor=()=>({total:1,front:null,back:null,baseTotal:1,weatherExtra:0,programExtra:0});
      const breakPlan=K.plannerEngine.buildProposal(breakDay),breakValidation=K.plannerEngine.validateProposal(breakDay,breakPlan.shifts);
      const withBreak=breakPlan.shifts.filter(s=>(s.breakSegments||[]).length>0);
      const backupHours=hours(breakPlan.shifts,'BACKUP');

      return {
        version:K.plannerEngine.version,
        gates:{
          unavailable:gateUnavailable.blocked.map(x=>x.code),qualification:gateQualification.blocked.map(x=>x.code),forbidden:gateForbidden.blocked.map(x=>x.code),helper:gateHelper.blocked.map(x=>x.code),event:gateEvent.blocked.map(x=>x.code),rest:gateRest.blocked.map(x=>x.code),early:gateEarly.blocked.map(x=>x.code)
        },
        main:{ok:first.validation.ok,gaps:first.validation.gaps.length,hard:first.validation.hardViolations.length,deterministic:JSON.stringify(firstSig)===JSON.stringify(secondSig),coverageAt12,usedIds,f1Hours:hours(first.shifts,'F1'),score},
        breaks:{ok:breakValidation.ok,gaps:breakValidation.gaps.length,hard:breakValidation.hardViolations.length,withBreak:withBreak.length,backupHours,shifts:breakPlan.shifts.map(s=>({personId:s.personId,start:s.start,end:s.end,breakMinutes:s.breakMinutes||0,breakSegments:s.breakSegments||[]}))}
      };
    }finally{
      K.people=saved.people;K.shifts=saved.shifts;K.wishes=saved.wishes;K.absences=saved.absences;K.personRules=saved.personRules;K.days=saved.days;K.requirementFor=saved.requirementFor;K.breakConfig=saved.breakConfig;Object.assign(K.state,saved.state);
    }
  });

  assert.strictEqual(result.version,'0.19.42');
  assert(result.gates.unavailable.includes('wish_unavailable'),'Nicht-verfügbar-Wunsch ist keine harte Sperre');
  assert(result.gates.qualification.includes('qualification'),'V/H-Qualifikation wird nicht hart geprüft');
  assert(result.gates.forbidden.includes('forbidden_date'),'Sperrtag wird nicht hart geprüft');
  assert(result.gates.helper.includes('helper_unavailable'),'Aushilfe außerhalb Zeitmatrix wird nicht gesperrt');
  assert(result.gates.event.includes('max_event'),'Veranstaltungsstundenlimit wird nicht hart geprüft');
  assert(result.gates.rest.includes('min_rest'),'Mindestruhezeit wird nicht hart geprüft');
  assert(result.gates.early.includes('earliest_start'),'Frühester Beginn wird nicht hart geprüft');

  assert.strictEqual(result.main.ok,true,`Hauptvorschlag ungültig: gaps=${result.main.gaps}, hard=${result.main.hard}`);
  assert.strictEqual(result.main.deterministic,true,'Gleiche Eingaben erzeugen nicht denselben Vorschlag');
  assert(result.main.coverageAt12.front>=2&&result.main.coverageAt12.back>=1,'Erhöhter Kontextbedarf 12:00 wird nicht gedeckt');
  assert(!result.main.usedIds.includes('U1'),'Nicht verfügbare Person wurde eingeplant');
  assert(!result.main.usedIds.includes('NQ'),'Person ohne Frontqualifikation wurde falsch eingeplant');
  assert(!result.main.usedIds.includes('FORB'),'Person am Sperrtag wurde eingeplant');
  assert(result.main.f1Hours<=2.000001,'Maximale Tagesstunden wurden überschritten');
  assert.strictEqual(result.main.score.unavailable,0,'Vorschlag enthält Nicht-verfügbar-Verletzung');
  assert.strictEqual(result.main.score.valid,true,'Erklärscore markiert gültigen Vorschlag nicht als gültig');

  assert.strictEqual(result.breaks.ok,true,`Pausenplan ungültig: gaps=${result.breaks.gaps}, hard=${result.breaks.hard}`);
  assert(result.breaks.withBreak>=1,'Langer Dienst erhielt keine konkrete Pause');
  assert(result.breaks.backupHours>0,'Pausenbedingte Deckungslücke wurde nicht durch Reserve repariert');
  assert.strictEqual(result.breaks.gaps,0,'Pausen reduzieren die Besetzung ohne Reparatur');

  console.log('KC DP2 V0.19.42 Planner Engine: hard rules, deterministic scoring, context demand and break repair PASS');
  await browser.close();
})().catch(err=>{console.error(err);process.exitCode=1;});
