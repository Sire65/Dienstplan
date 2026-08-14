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
  await page.waitForFunction(()=>window.KCDP?.personAdapter?.applyAuthoritativeSnapshot&&window.KCDP?.pcManagerConnection,{timeout:20000});

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

    return {
      personAdapterVersion:K.personAdapter.version,
      managerVersion:K.pcManagerConnection.version,
      count:originalPeople.length,
      referencedCount:referenced.length,
      notPublished:{applied:notPublished.applied,code:notPublished.code,unchanged:unchangedAfterDraft},
      duplicate:{applied:duplicate.applied,code:duplicate.code,unchanged:unchangedAfterDuplicate},
      missing:{applied:missing.applied,code:missing.code,missingId,reported:missing.missingPersonIds,unchanged:unchangedAfterMissing},
      empty:{applied:empty.applied,code:empty.code,unchanged:unchangedAfterEmpty},
      accepted:{applied:accepted.applied,code:accepted.code,names:acceptedNames,count:accepted.people?.length},
      contextDraft,contextReady
    };
  });

  assert.strictEqual(out.personAdapterVersion,'0.19.42');
  assert.strictEqual(out.managerVersion,'0.19.42');
  assert(out.count>0,'Baseline hat keine Personen');
  assert(out.referencedCount>0,'Referenzschutz hat keine verwendeten personIds erkannt');
  assert.deepStrictEqual(out.notPublished,{applied:false,code:'NOT_PUBLISHED_COMPLETE',unchanged:true});
  assert.deepStrictEqual(out.duplicate,{applied:false,code:'INVALID_PEOPLE',unchanged:true});
  assert.strictEqual(out.missing.applied,false);
  assert.strictEqual(out.missing.code,'REFERENCED_PERSON_MISSING');
  assert(out.missing.reported.includes(out.missing.missingId),'Fehlende verplante personId wird nicht gemeldet');
  assert.strictEqual(out.missing.unchanged,true);
  assert.strictEqual(out.empty.applied,false);
  assert(['REFERENCED_PERSON_MISSING','EMPTY_REPLACEMENT'].includes(out.empty.code));
  assert.strictEqual(out.empty.unchanged,true);
  assert.strictEqual(out.accepted.applied,true);
  assert.strictEqual(out.accepted.code,'APPLIED');
  assert.strictEqual(out.accepted.names,true);
  assert.strictEqual(out.accepted.count,out.count);
  assert.strictEqual(out.contextDraft,false);
  assert.strictEqual(out.contextReady,true);

  console.log('KC DP2 V0.19.42 Manager Leading Source Safety Gate: PASS');
  await browser.close();
})().catch(err=>{console.error(err);process.exitCode=1;});
