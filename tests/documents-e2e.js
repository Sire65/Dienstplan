const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const launchOptions={headless:true};
  if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:1366,height:900},locale:'de-DE'});
  const page=await context.newPage();
  page.on('console',msg=>{if(msg.type()==='error')console.error('BROWSER:',msg.text());});
  page.on('pageerror',err=>console.error('PAGEERROR:',err.message));

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
  await page.waitForFunction(()=>window.KCDP?.documents&&window.KCDP?.pdfAdapter&&window.KCDP?.emailAdapter&&window.KCDP?.mutations&&window.KCDP?.publishPlan,{timeout:20000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});
  const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');
  if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');
  await page.locator('#uxTestLogin').click();
  await page.waitForSelector('#unlockSecret',{timeout:10000});
  await page.locator('#unlockSecret').fill('KC-DP2-Documents-E2E-2026!');
  await page.locator('#unlockBtn').click();
  await page.waitForSelector('#kcChoiceView',{timeout:20000});

  const result=await page.evaluate(async()=>{
    const K=window.KCDP,clone=v=>JSON.parse(JSON.stringify(v));
    const before={
      currentUser:clone(K.currentUser),shifts:clone(K.shifts),wishes:clone(K.wishes),standby:clone(K.standby),planVersions:clone(K.planVersions),
      acknowledgements:clone(K.acknowledgements),actualShifts:clone(K.actualShifts),actualWorkflow:clone(K.actualWorkflow),workflow:clone(K.workflow),
      breakConfig:clone(K.breakConfig),documentLog:clone(K.documentLog||[]),state:clone(K.state)
    };
    if(K.sync)K.sync.enqueue=()=>({queued:true,test:true});
    if(K.notifications){K.notifications.onPlanPublished=()=>{};K.notifications.onAudit=()=>{};}

    const person=K.people.find(p=>p.active&&p.personType!=='helper');
    const day=K.days.find(d=>d.type==='market')||K.days[0];
    if(!person||!day)throw new Error('Testperson oder Testtag fehlt');
    let start=null;
    for(let t=day.start;t+1<=day.end;t+=.5){
      const overlap=K.shifts.some(s=>s.personId===person.personId&&s.date===day.date&&s.layer==='planned'&&!['deleted','cancelled','absent','failed'].includes(s.status)&&Math.max(s.start,t)<Math.min(s.end,t+1));
      if(!overlap){start=t;break;}
    }
    if(start==null)throw new Error('Kein freies Testzeitfenster gefunden');
    const end=start+1;
    K.auth.setCurrentUser({personId:person.personId,role:'admin',displayName:'Dokumenttest Admin'});
    K.breakConfig.enabled=false;
    K.mutations.saveWish({id:'',personId:person.personId,date:day.date,start,end,wishType:'preferred',source:'self_service',comment:'PRIVAT-NICHT-DRUCKEN',confidence:1,status:'confirmed'},{reason:'Dokumenttest Wunsch'});
    const shift=K.mutations.saveShift({id:'',personId:person.personId,date:day.date,start,end,zone:'front',area:'Verkauf',layer:'planned',breakMinutes:0,breakSegments:[],status:'draft'},{reason:'Dokumenttest Soll'}).record;
    const publication=K.publishPlan({publishedBy:'Dokumenttest Admin',reason:'Automatisierter Dokumenttest; Testbesetzung bewusst freigegeben.'});
    const actual=K.actual.saveActual({id:'',personId:person.personId,date:day.date,start:start+.25,end:end+.25,breakMinutes:0,status:'recorded'},{reason:'Dokumenttest Ist',source:'manual_correction'}).record;

    const types=['empty_plan','wish_plan','planned_plan','actual_plan','compare_plan','matrix','personal'];
    const docs={};
    for(const type of types){
      const doc=K.documents.build({type,start:day.date,end:day.date,personId:type==='personal'?person.personId:undefined,publishedOnly:true});
      if(!doc.html.includes('Köcheclub Werne'))throw new Error(`${type}: Clubname fehlt`);
      if(!doc.html.includes('assets/kc-logo.svg'))throw new Error(`${type}: Logo fehlt`);
      if(!doc.html.includes('Internes Clubdokument'))throw new Error(`${type}: Fußzeile fehlt`);
      if(!doc.html.includes('Seite 1 von'))throw new Error(`${type}: Seitenzählung fehlt`);
      if(!doc.html.includes('Dienstplan vom'))throw new Error(`${type}: Zeitraum fehlt`);
      if(type==='wish_plan'&&doc.html.includes('PRIVAT-NICHT-DRUCKEN'))throw new Error('Private Wunschbemerkung wurde ausgegeben');
      if(type==='planned_plan'&&!doc.html.includes(`V${publication.version}`))throw new Error('Sollplan enthält veröffentlichte Versionsnummer nicht');
      const bytes=await K.pdfAdapter.bytes(doc);
      const header=String.fromCharCode(...bytes.slice(0,8));
      if(!header.startsWith('%PDF-1.4'))throw new Error(`${type}: kein echtes PDF`);
      if(bytes.length<1500)throw new Error(`${type}: PDF unerwartet klein`);
      const attachment=await K.pdfAdapter.attachment(doc);
      if(attachment.mimeType!=='application/pdf'||!attachment.fileName.endsWith('.pdf')||attachment.size!==bytes.length||attachment.bytesBase64.length<1000)throw new Error(`${type}: PDF-Anhang ungültig`);
      K.documents.register(doc,{action:'generated'});
      docs[type]={title:doc.title,fileName:attachment.fileName,bytes:bytes.length,pages:(doc.html.match(/class=\"doc-page\"/g)||[]).length,attachment};
    }

    // E-Mail muss ohne Provider hart stoppen und darf keinen Versand vortäuschen.
    K.emailAdapter.clear();
    let noProviderError='';
    try{await K.emailAdapter.send({to:['nobody@example.invalid'],subject:'Test'});}catch(e){noProviderError=e.message;}
    if(!noProviderError.includes('Kein E-Mail-Provider verbunden'))throw new Error('Fehlender Mail-Provider wird nicht sauber blockiert');

    // Provider-Schnittstelle mit isoliertem Testprovider inklusive echtem PDF-Anhang prüfen.
    // Der produktive TEST-Sicherheitsmodus muss weiterhin blockieren; nur der isolierte Fake-Provider
    // wird danach explizit mit bypassSafety ausgeführt. Es verlässt keine E-Mail den Testprozess.
    let captured=null;
    K.emailAdapter.configure({send:async message=>{captured=clone(message);return{id:'E2E-MAIL-1',accepted:message.to};}});
    const mail={
      to:['test@example.invalid'],subject:`KC DP Sollplan V${publication.version}`,text:'Automatischer Dokumenttest',
      attachments:[docs.planned_plan.attachment]
    };
    let safetyError='';
    try{await K.emailAdapter.send(mail);}catch(e){safetyError=e.message;}
    if(!safetyError.includes('TEST-Modus'))throw new Error('E-Mail-Sicherheitsmodus blockiert Testversand nicht');
    if(captured)throw new Error('Testmodus hat den Fake-Provider unerwartet aufgerufen');

    const sent=await K.emailAdapter.send(mail,{bypassSafety:true});
    if(sent.id!=='E2E-MAIL-1'||!captured||captured.attachments?.[0]?.mimeType!=='application/pdf')throw new Error('Mail-Provider-Schnittstelle übergibt PDF-Anhang nicht korrekt');
    if(K.emailAdapter.state.status!=='ready'||!K.emailAdapter.state.lastSendAt)throw new Error('Mail-Status wird nach Versand nicht korrekt geführt');

    const out={person:person.name,date:day.date,version:publication.version,shiftId:shift.id,actualId:actual.id,noProviderError,safetyError,mailId:sent.id,documents:Object.fromEntries(Object.entries(docs).map(([k,v])=>[k,{fileName:v.fileName,bytes:v.bytes,pages:v.pages}]))};

    K.shifts=before.shifts;K.wishes=before.wishes;K.standby=before.standby;K.planVersions=before.planVersions;K.acknowledgements=before.acknowledgements;
    K.actualShifts=before.actualShifts;K.actualWorkflow=before.actualWorkflow;K.workflow=before.workflow;K.breakConfig=before.breakConfig;K.documentLog=before.documentLog;K.currentUser=before.currentUser;K.state=before.state;K.emailAdapter.clear();
    return out;
  });

  assert(result.documents.planned_plan.bytes>1500);
  assert(result.documents.compare_plan.bytes>1500);
  assert(result.noProviderError.includes('Kein E-Mail-Provider verbunden'));
  assert(result.safetyError.includes('TEST-Modus'));
  console.log('KC DP2 documents/PDF/email E2E: PASS');
  console.log(JSON.stringify(result));
  await browser.close();
})().catch(err=>{
  console.error('KC DP2 documents/PDF/email E2E: FAIL');
  console.error(err.stack||err);
  process.exit(1);
});
