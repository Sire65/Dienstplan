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
  await page.waitForFunction(()=>window.KCDP?.personAdapter?.applyAuthoritativeSnapshot&&window.KCDP?.pcManagerConnection?.supabaseSnapshot,{timeout:20000});

  const out=await page.evaluate(()=>{
    const K=window.KCDP;
    const originalPeople=K.people.map(p=>({...p}));
    const baseline=JSON.stringify(K.people);
    const rows=originalPeople.map(p=>({personId:p.personId,displayName:p.name,active:p.active,personType:p.personType,skills:p.skills,phone:p.phone,email:p.email,pseudoName:p.pseudoName,maxHours:p.maxHours}));
    const published={publication:{people:{status:'published',complete:true,version:7}}};
    const notPublished=K.personAdapter.applyAuthoritativeSnapshot(rows,{source:'test',snapshot:{publication:{people:{status:'draft',complete:false}}}});
    const unchangedAfterDraft=JSON.stringify(K.people)===baseline;
    const duplicateRows=[...rows,{...rows[0]}];
    const duplicate=K.personAdapter.applyAuthoritativeSnapshot(duplicateRows,{source:'test',snapshot:published});
    const unchangedAfterDuplicate=JSON.stringify(K.people)===baseline;
    const referenced=K.personAdapter.referencedPersonIds();
    const missingId=referenced[0];
    const missingRows=rows.filter(p=>p.personId!==missingId);
    const missing=K.personAdapter.applyAuthoritativeSnapshot(missingRows,{source:'test',snapshot:published});
    const unchangedAfterMissing=JSON.stringify(K.people)===baseline;
    const empty=K.personAdapter.applyAuthoritativeSnapshot([],{source:'test',snapshot:published});
    const unchangedAfterEmpty=JSON.stringify(K.people)===baseline;
    const acceptedRows=rows.map(p=>({...p,displayName:p.displayName+' ✓'}));
    const accepted=K.personAdapter.applyAuthoritativeSnapshot(acceptedRows,{source:'test',snapshot:published});
    const acceptedNames=K.people.every(p=>p.name.endsWith('✓'));
    const contextDraft=K.pcManagerConnection.contextPublicationOk({publication:{context:{status:'draft',complete:true}}});
    const contextReady=K.pcManagerConnection.contextPublicationOk({publication:{context:{status:'published',complete:true}}});
    return {personAdapterVersion:K.personAdapter.version,managerVersion:K.pcManagerConnection.version,count:originalPeople.length,referencedCount:referenced.length,notPublished:{applied:notPublished.applied,code:notPublished.code,unchanged:unchangedAfterDraft},duplicate:{applied:duplicate.applied,code:duplicate.code,unchanged:unchangedAfterDuplicate},missing:{applied:missing.applied,code:missing.code,missingId,reported:missing.missingPersonIds,unchanged:unchangedAfterMissing},empty:{applied:empty.applied,code:empty.code,unchanged:unchangedAfterEmpty},accepted:{applied:accepted.applied,code:accepted.code,names:acceptedNames,count:accepted.people?.length},contextDraft,contextReady};
  });

  const source=await page.evaluate(async()=>{
    const K=window.KCDP,oldFetch=window.fetch,oldSb=K.supabaseConnection,oldCfg=K.integrationConfig.supabase;
    K.integrationConfig.supabase={...oldCfg,url:'https://example.supabase.co',publishableKey:'sb_publishable_test',orgId:'KC_WERNE'};
    K.supabaseConnection={ensureSession:async()=>true,sessionSnapshot:()=>({access_token:'test-access-token'})};
    window.fetch=async url=>{const u=String(url);if(u.includes('kc_core_operational_directory'))return new Response(JSON.stringify([{person_id:'KC-P-001',display_name:'Frank Core',preferred_name:'Frank',active:true}]),{status:200,headers:{'Content-Type':'application/json'}});if(u.includes('kc_manager_state_sections'))return new Response(JSON.stringify([{section_key:'dienstplan_people',payload:{items:[{personId:'KC-P-001',skills:'Vorne · Flex',maxHours:8}]},version:3},{section_key:'dienstplan_context',payload:{weather:{'2026-12-04':{temp:4,factor:1.2}},program:{'2026-12-04':[{title:'Test',start:18,end:19,impact:'+'}]}},version:4},{section_key:'dienstplan_publication',payload:{people:{status:'published',complete:true,version:3},context:{status:'published',complete:true,version:4}},version:5}]),{status:200,headers:{'Content-Type':'application/json'}});return new Response('not found',{status:404});};
    try{const s=await K.pcManagerConnection.supabaseSnapshot();return {contract:s.contract,source:s.meta.source,peopleRows:s.meta.peopleRows,managerSections:s.meta.managerSections,person:s.people[0],peoplePublished:s.publication.people.status,contextComplete:s.publication.context.complete,weatherTemp:s.weather['2026-12-04'].temp,programTitle:s.program['2026-12-04'][0].title};}
    finally{window.fetch=oldFetch;K.supabaseConnection=oldSb;K.integrationConfig.supabase=oldCfg;}
  });

  const staffing=await page.evaluate(async()=>{
    const K=window.KCDP,day=K.days.find(d=>d.date==='2026-12-04'),oldAuth=K.auth,oldWeather={...day.weather},oldProgram=[...(day.program||[])];
    const before=K.requirementFor(day,18);
    const people=K.people.map(p=>({personId:p.personId,displayName:p.name,active:p.active,personType:p.personType,skills:p.skills,phone:p.phone,email:p.email,pseudoName:p.pseudoName,maxHours:p.maxHours}));
    const s={contract:'KC_PC_MANAGER_DP_BRIDGE_V1',people,weather:{'2026-12-04':{temp:2,condition:'trocken',factor:1.5}},program:{'2026-12-04':[{title:'Großes Abendprogramm',start:18,end:19,impact:'+++'}]},publication:{people:{status:'published',complete:true,version:8},context:{status:'published',complete:true,version:9}},meta:{source:'acceptance_manager'}};
    K.auth={...(K.auth||{}),require:()=>true};K.pcManagerConnection.setDirectProvider(async()=>s);
    try{const sync=await K.pcManagerConnection.syncAll(),after=K.requirementFor(day,18);return {applied:sync.kcDpApply.applied,contextApplied:sync.kcDpApply.contextApplied,before,after,weatherFactor:day.weather.factor,programImpact:day.program[0]?.impact};}
    finally{day.weather=oldWeather;day.program=oldProgram;K.pcManagerConnection.setDirectProvider(null);K.auth=oldAuth;}
  });

  assert.strictEqual(out.personAdapterVersion,'0.19.42');assert.strictEqual(out.managerVersion,'0.19.42');assert(out.count>0);assert(out.referencedCount>0);assert.deepStrictEqual(out.notPublished,{applied:false,code:'NOT_PUBLISHED_COMPLETE',unchanged:true});assert.deepStrictEqual(out.duplicate,{applied:false,code:'INVALID_PEOPLE',unchanged:true});assert.strictEqual(out.missing.applied,false);assert.strictEqual(out.missing.code,'REFERENCED_PERSON_MISSING');assert(out.missing.reported.includes(out.missing.missingId));assert.strictEqual(out.missing.unchanged,true);assert.strictEqual(out.empty.applied,false);assert(['REFERENCED_PERSON_MISSING','EMPTY_REPLACEMENT'].includes(out.empty.code));assert.strictEqual(out.empty.unchanged,true);assert.strictEqual(out.accepted.applied,true);assert.strictEqual(out.accepted.code,'APPLIED');assert.strictEqual(out.accepted.names,true);assert.strictEqual(out.accepted.count,out.count);assert.strictEqual(out.contextDraft,false);assert.strictEqual(out.contextReady,true);
  assert.strictEqual(source.contract,'KC_PC_MANAGER_DP_BRIDGE_V1');assert.strictEqual(source.source,'supabase_core_manager');assert.strictEqual(source.peopleRows,1);assert.strictEqual(source.managerSections,3);assert.strictEqual(source.person.personId,'KC-P-001');assert.strictEqual(source.person.displayName,'Frank');assert.strictEqual(source.person.skills,'Vorne · Flex');assert.strictEqual(source.peoplePublished,'published');assert.strictEqual(source.contextComplete,true);assert.strictEqual(source.weatherTemp,4);assert.strictEqual(source.programTitle,'Test');
  assert.strictEqual(staffing.applied,true);assert.strictEqual(staffing.contextApplied,true);assert.strictEqual(staffing.weatherFactor,1.5);assert.strictEqual(staffing.programImpact,'+++');assert(staffing.after.total>staffing.before.total,'Veröffentlichte Wetter-/Programmdaten erhöhen die Soll-Besetzung nicht');assert.strictEqual(staffing.after.weatherExtra,5);assert.strictEqual(staffing.after.programExtra,3);

  console.log('KC DP2 V0.19.42 Manager/Core Leading Source + Staffing Context: PASS');
  await browser.close();
})().catch(err=>{console.error(err);process.exitCode=1;});
