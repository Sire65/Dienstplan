const { chromium } = require('playwright');
const assert = require('assert');

(async()=>{
  const launchOptions={headless:true};
  if(process.env.KC_PLAYWRIGHT_CHANNEL)launchOptions.channel=process.env.KC_PLAYWRIGHT_CHANNEL;
  const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'de-DE'});
  const page=await context.newPage();
  const browserErrors=[];
  page.on('console',msg=>{if(msg.type()==='error')browserErrors.push(msg.text());});
  page.on('pageerror',err=>browserErrors.push(err.message));

  await page.route('**/src/core/member-access.js*',async route=>{
    const response=await route.fetch();
    let body=await response.text();
    const marker="function configured(){const c=publicConfig();return /^https:\\/\\//.test(c.url)&&String(c.publishableKey||'').trim().length>20;}";
    if(!body.includes(marker))throw new Error('member-access configured()-Marker nicht gefunden');
    body=body.replace(marker,'function configured(){return false;}');
    await route.fulfill({response,body,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
  });

  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.KCDP?.roleUx&&window.KCDP?.memberAccess&&window.KCDP?.storage,{timeout:20000});
  await page.evaluate(()=>{
    const K=window.KCDP,original=K.storage.getMany.bind(K.storage);
    window.__kcCountFastPath={used:false,countMs:null};
    K.storage.getMany=async function(keys,options={}){
      const started=performance.now();
      if(!this.db)await this.init();
      const count=await new Promise((resolve,reject)=>{const tx=this.db.transaction('encrypted_envelopes','readonly'),q=tx.objectStore('encrypted_envelopes').count();q.onsuccess=()=>resolve(Number(q.result||0));q.onerror=()=>reject(q.error);});
      window.__kcCountFastPath={used:true,countMs:performance.now()-started,count};
      if(count===0){const list=[...keys],values=new Array(list.length);for(let i=0;i<list.length;i++){values[i]=undefined;options.onProgress?.(i+1,list.length,{key:list[i],phase:'read',legacy:false});}return values;}
      return original(keys,options);
    };
  });
  await page.waitForSelector('#uxLocalTest',{state:'attached',timeout:20000});

  await page.evaluate(()=>{
    const details=document.querySelector('#uxLocalTest')?.closest('details');if(details)details.open=true;
    const role=document.getElementById('uxTestRole'),button=document.getElementById('uxTestLogin');
    if(!role||!button)throw new Error('Lokaler Prüfzugang ist nicht vollständig gerendert');
    role.value='admin';role.dispatchEvent(new Event('change',{bubbles:true}));button.click();
  });

  await page.waitForFunction(()=>!!document.getElementById('unlockSecret'),{timeout:10000});
  await page.evaluate(()=>{
    const secret=document.getElementById('unlockSecret'),button=document.getElementById('unlockBtn');
    if(!secret||!button)throw new Error('Unlock-Dialog ist nicht vollständig gerendert');
    secret.value='KC-DP2-Recovery-Mobile-Smoke-2026!';secret.dispatchEvent(new Event('input',{bubbles:true}));secret.dispatchEvent(new Event('change',{bubbles:true}));button.click();
  });

  const startWait=Date.now();
  try{await page.waitForSelector('body.ux-role',{timeout:25000});}catch(err){
    const diag=await page.evaluate(()=>({bodyClass:document.body.className,text:document.body.innerText.slice(0,2500),currentUser:window.KCDP?.currentUser||null,storageUnlocked:!!window.KCDP?.storage?.unlocked,storageStats:window.KCDP?.storage?.stats?.()||null,countFastPath:window.__kcCountFastPath||null,startup:window.KCDP?.startupStabilityGuard?.state||null}));
    console.error('RECOVERY_START_DIAG',JSON.stringify(diag,null,2));console.error('BROWSER_ERRORS',JSON.stringify(browserErrors,null,2));throw err;
  }

  await page.waitForSelector('.ux-topbar',{timeout:10000});
  await page.waitForSelector('#kcRecoveryDbBlock',{state:'attached',timeout:10000});
  const result=await page.evaluate(()=>({text:document.body.innerText,role:window.KCDP?.currentUser?.role||null,personId:window.KCDP?.currentUser?.personId||null,storageUnlocked:!!window.KCDP?.storage?.unlocked,storageStats:window.KCDP?.storage?.stats?.()||null,countFastPath:window.__kcCountFastPath||null,recoveryLeds:window.KCDP?.recoveryStatusLeds?.status?.()||null,startupReady:!!window.KCDP?.startupStabilityGuard?.state?.ready,startChoiceAutoLoad:window.KCDP?.deviceUX?.startChoiceAutoLoad}));
  result.elapsedAfterUnlockMs=Date.now()-startWait;
  assert.strictEqual(result.role,'admin');assert(result.personId);assert.strictEqual(result.storageUnlocked,true);assert(!/Anmeldung läuft/i.test(result.text));assert(result.recoveryLeds);assert.strictEqual(result.startupReady,true);assert.strictEqual(result.startChoiceAutoLoad,false);
  console.log('KC DP2 V0.20 recovery mobile login count fast path: PASS');console.log(JSON.stringify(result,null,2));if(browserErrors.length)console.log('BROWSER_ERRORS',JSON.stringify(browserErrors,null,2));
  await browser.close();
})().catch(err=>{console.error('KC DP2 V0.20 recovery mobile login count fast path: FAIL');console.error(err.stack||err);process.exit(1);});
