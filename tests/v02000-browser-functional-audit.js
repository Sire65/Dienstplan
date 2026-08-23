const { chromium }=require('playwright');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..','release','v0.19.54','site');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const marker='<script src="src/adapters/supabase-provider.js?v=0.19.37"></script>';
if(!index.includes(marker))throw new Error('Supabase marker missing');
fs.writeFileSync(path.join(ROOT,'app.html'),index.replace(marker,marker+'<script src="src/core/bootstrap-session.js?v=0.20.0-p24"></script>'));
const BASE=process.env.KCDP_BASE_URL||'http://127.0.0.1:4173/';
const failures=[];const check=(v,m)=>{if(!v){failures.push(m);console.error('✕',m);return false}console.log('✓',m);return true};
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/151 Mobile Safari/537.36'});
 await context.addInitScript(()=>{
  const native=window.fetch.bind(window),membership={org_id:'KC_WERNE',user_id:'user-smoke',role:'planner',active:true,person_id:'KC-P-002',display_name:'Hans-Joachim Koch',email:'smoke@example.com',phone:''};
  window.fetch=async(input,init={})=>{const url=typeof input==='string'?input:input?.url||String(input||'');if(!/https:\/\/[^/]+\.supabase\.co\//.test(url))return native(input,init);if(url.includes('/auth/v1/token?grant_type=password'))return new Response(JSON.stringify({access_token:'smoke-access',refresh_token:'smoke-refresh',expires_in:3600,token_type:'bearer',user:{id:'user-smoke',email:'smoke@example.com'}}),{status:200,headers:{'Content-Type':'application/json'}});if(url.includes('/rest/v1/kc_dp_memberships'))return new Response(JSON.stringify([membership]),{status:200,headers:{'Content-Type':'application/json'}});if(url.includes('/auth/v1/settings'))return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});return new Response('[]',{status:200,headers:{'Content-Type':'application/json'}})};
 });
 const page=await context.newPage();page.setDefaultTimeout(6000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE+'login-bootstrap.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#email').fill('smoke@example.com');await page.locator('#password').fill('smoke-password');
 check(await page.locator('#email').inputValue()==='smoke@example.com','native E-Mail input works');check(await page.locator('#password').inputValue()==='smoke-password','native password input works');
 await page.locator('#submit').click();await page.waitForURL(/app\.html\?bootstrap=1/,{timeout:15000});
 await page.waitForFunction(()=>window.KCDP?.memberAccess?.state?.status==='authenticated',{timeout:10000});
 check(!await page.locator('#uxLoginForm').count(),'old login form is not rendered after bootstrap');
 try{await page.waitForFunction(()=>window.KCDP?.startupStabilityGuard?.state?.ready===true,{timeout:10000});}catch(_){}
 const t0=Date.now();let launcher=false;try{await page.waitForSelector('#kcChoiceView',{state:'visible',timeout:6000});launcher=true}catch(_){}
 console.log('launcher-ready-ms',Date.now()-t0);
 const snapshot=await page.evaluate(()=>({body:document.body.className,currentUser:window.KCDP?.currentUser,memberStatus:window.KCDP?.memberAccess?.state?.status,startChoice:!!window.KCDP?.startChoice,sessionProvider:window.KCDP?.session?.state?.provider,bootstrap:window.KCDP?.__bootstrapSessionResult||null,ready:window.KCDP?.startupStabilityGuard?.state?.ready,deviceKey:window.KCDP?.deviceKeyManager?.state||null,storageUnlocked:!!window.KCDP?.storage?.unlocked}));
 console.log('START SNAPSHOT',JSON.stringify(snapshot));
 check(launcher,'four-button start choice is stably visible after startup');
 check(snapshot.sessionProvider==='supabase','bootstrap adopts canonical Supabase session');
 if(launcher){
  for(const id of ['#kcChoiceView','#kcChoiceEdit','#kcChoiceMine','#kcChoiceWish'])check(await page.locator(id).isVisible(),`${id} visible`);
  const clickAt=Date.now();await page.locator('#kcChoiceView').click();console.log('view-click-ms',Date.now()-clickAt);
  await page.waitForFunction(()=>document.body.classList.contains('ux-legacy'),{timeout:6000});check(true,'view choice reaches legacy planner mode');
  await page.waitForTimeout(500);
  check(await page.locator('#mainView').count()===1,'legacy day planner DOM is reachable');
  check(await page.locator('[data-kc-phone-nav="-1"]').count()===1&&await page.locator('[data-kc-phone-nav="1"]').count()===1,'mobile previous/next day controls are rendered');
  check(await page.locator('[data-kc-phone-mode="list"]').count()===1&&await page.locator('[data-kc-phone-mode="bars"]').count()===1,'mobile list/bars controls are rendered');
  const before=await page.locator('#dateLabel').innerText();await page.locator('[data-kc-phone-nav="1"]').click();await page.waitForTimeout(150);const after=await page.locator('#dateLabel').innerText();check(after!==before,'mobile next-day control changes planning day');
  await page.locator('[data-kc-phone-mode="bars"]').click();check(!(await page.evaluate(()=>document.body.classList.contains('kc-phone-list-mode'))),'mobile bars mode switches successfully');
  check(await page.locator('#quickPlanBtn').count()===1&&await page.locator('#publishBtn').count()===1,'quick-plan and publication controls exist');
  check(await page.locator('#idbStatusLed').count()===1&&await page.locator('#supabaseStatusLed').count()===1,'IDX/SUP LEDs exist');
  await page.locator('#uxLegacyReturn').click();await page.waitForSelector('#kcChoiceWish',{state:'visible',timeout:6000});check(true,'return reaches start choice');
  await page.locator('#kcChoiceWish').click();await page.waitForTimeout(250);check(/Wunsch|Zeiten|Verfügbarkeit/i.test(await page.locator('#kcdpUxRoot').innerText()),'wish-plan route is reachable');
 }
 check(errors.length===0,`no uncaught browser errors (${errors.join(' | ')})`);
 console.log('AUDIT FAILURES',JSON.stringify(failures));await context.close();await browser.close();if(failures.length)process.exit(1);console.log('V0.20 browser functional audit PASS');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});