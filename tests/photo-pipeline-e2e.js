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
  await page.waitForFunction(()=>window.KCDP?.roleUx&&window.KCDP?.photoRecognition&&window.KCDP?.mutations,{timeout:20000});
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});
  const details=page.locator('#uxLocalTest').locator('xpath=ancestor::details');
  if(await details.count())await details.locator('summary').click();
  await page.locator('#uxTestRole').selectOption('admin');
  await page.locator('#uxTestLogin').click();
  await page.waitForSelector('#unlockSecret',{timeout:10000});
  await page.locator('#unlockSecret').fill('KC-DP2-Photo-E2E-2026!');
  await page.locator('#unlockBtn').click();
  await page.waitForSelector('#kcChoiceView',{timeout:20000});

  // Sicherheitsfallback darf niemals Handschriftwerte erfinden.
  const fallback=await page.evaluate(async()=>{
    const K=window.KCDP,day=K.days.find(d=>d.type==='market')||K.days[0];
    K.photoRecognition.setProvider(null);
    const f=new File(['fallback'],'fallback.png',{type:'image/png'});
    const out=await K.photoRecognition.analyze(f,{date:day.date});
    return {mode:out.mode,row:out.rows[0],notes:out.notes};
  });
  assert.strictEqual(fallback.mode,'guided_review');
  assert.strictEqual(fallback.row.personId,'');
  assert.strictEqual(fallback.row.start,null);
  assert.strictEqual(fallback.row.end,null);
  assert(fallback.notes.join(' ').includes('keine Handschriftwerte erfunden'),'Sicherheitsfallback-Hinweis fehlt');

  // Deterministischen Test-Provider anbinden und eine fehlerfreie erkannte Zeile vorbereiten.
  const expected=await page.evaluate(()=>{
    const K=window.KCDP,day=K.days.find(d=>d.type==='market')||K.days[0];
    const people=K.people.filter(p=>p.active&&p.personType!=='helper');
    let chosen=null;
    for(const p of people){
      for(let t=day.start;t+1<=day.end;t+=0.5){
        const overlap=K.wishes.some(w=>w.personId===p.personId&&w.date===day.date&&w.status!=='deleted'&&Math.max(w.start,t)<Math.min(w.end,t+1));
        if(!overlap){chosen={personId:p.personId,personName:p.name,date:day.date,start:t,end:t+1};break;}
      }
      if(chosen)break;
    }
    if(!chosen)throw new Error('Kein freies Wunschzeitfenster für Planfoto-Test gefunden');
    K.__photoE2EBefore=JSON.parse(JSON.stringify(K.wishes));
    K.state.dateIndex=K.days.findIndex(d=>d.date===chosen.date);
    K.photoRecognition.setProvider(async()=>({
      rows:[{...chosen,wishType:'preferred',comment:'Foto automatisch erkannt',confidence:0.96,accepted:true}],
      notes:['E2E Foto-Provider'],overallConfidence:0.96
    }));
    return chosen;
  });

  // Echter Bedienweg öffnen.
  await page.evaluate(()=>window.KCDP.startChoice.openEdit());
  await page.waitForSelector('body.ux-legacy',{timeout:10000});
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZVN0AAAAASUVORK5CYII=','base64');
  await page.locator('#photoInput').setInputFiles({name:'dienstplan-test.png',mimeType:'image/png',buffer:png});
  await page.waitForSelector('#photoRows tr',{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('#photoStatus')?.textContent.includes('Foto-KI'),{timeout:10000});

  const row=page.locator('#photoRows tr').first();
  assert.strictEqual(await row.locator('.prPerson').inputValue(),expected.personId);
  assert.strictEqual(await row.locator('.prDate').inputValue(),expected.date);
  assert.strictEqual(await row.locator('.prType').inputValue(),'preferred');
  assert((await row.locator('.prCheck').innerText()).includes('OK'),'Erkannte Fotozeile wurde nicht plausibel freigegeben');
  assert.strictEqual(await page.locator('#photoApply').isEnabled(),true,'Fotoübernahme wurde trotz gültiger Zeile nicht freigegeben');
  assert((await page.locator('#photoSuccess').innerText()).includes('1/1'),'Erfolgskontrolle zeigt nicht 1/1 gültig');

  await page.locator('#photoApply').click();
  await page.waitForFunction(()=>document.querySelector('#modalBackdrop')?.classList.contains('hidden'),{timeout:10000});

  const stored=await page.evaluate(exp=>{
    const K=window.KCDP;
    const w=K.wishes.find(x=>x.personId===exp.personId&&x.date===exp.date&&x.start===exp.start&&x.end===exp.end&&x.source==='form_import'&&x.comment==='Foto automatisch erkannt');
    const out=w?{id:w.id,wishType:w.wishType,source:w.source,comment:w.comment,layer:K.state.layer}:null;
    K.wishes=K.__photoE2EBefore||K.wishes;delete K.__photoE2EBefore;K.photoRecognition.setProvider(null);
    return out;
  },expected);
  assert(stored,'Geprüfte Fotozeile wurde nicht in die Wunschdatenbasis übernommen');
  assert.strictEqual(stored.wishType,'preferred');
  assert.strictEqual(stored.source,'form_import');
  assert.strictEqual(stored.layer,'wish');

  console.log('KC DP2 photo pipeline E2E: PASS');
  console.log(JSON.stringify({fallback:fallback.mode,person:expected.personName,date:expected.date,start:expected.start,end:expected.end,wishId:stored.id}));
  await browser.close();
})().catch(err=>{
  console.error('KC DP2 photo pipeline E2E: FAIL');
  console.error(err.stack||err);
  process.exit(1);
});
