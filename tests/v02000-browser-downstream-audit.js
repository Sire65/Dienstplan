const { chromium }=require('playwright');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..','release','v0.19.54','site');
const indexPath=path.join(ROOT,'index.html'),polishPath=path.join(ROOT,'src/ui/kc-ux-polish.js');
const index=fs.readFileSync(indexPath,'utf8');
const marker='<script src="src/adapters/supabase-provider.js?v=0.19.37"></script>';
if(!index.includes(marker))throw new Error('Supabase marker missing');
fs.writeFileSync(path.join(ROOT,'app.html'),index.replace(marker,marker+'<script src="src/core/bootstrap-session.js?v=0.20.0-p21"></script>'));
let polish=fs.readFileSync(polishPath,'utf8');
const old="x.innerHTML=bad?'<span>⚠</span><span>Speicher prüfen</span>':warn?'<span>●</span><span>Lokal gespeichert</span>':'<span>✓</span><span>Daten gespeichert</span>';";
const replacement="const html=bad?'<span>⚠</span><span>Speicher prüfen</span>':warn?'<span>●</span><span>Lokal gespeichert</span>':'<span>✓</span><span>Daten gespeichert</span>';if(x.innerHTML!==html)x.innerHTML=html;";
if(!polish.includes(old))throw new Error('UX polish loop marker missing');
fs.writeFileSync(polishPath,polish.replace(old,replacement));
const BASE=process.env.KCDP_BASE_URL||'http://127.0.0.1:4173/';
const failures=[];const check=(v,m)=>{if(!v){failures.push(m);console.error('✕',m)}else console.log('✓',m)};
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/151 Mobile Safari/537.36'});
 await context.addInitScript(()=>{
  const native=window.fetch.bind(window),membership={org_id:'KC_WERNE',user_id:'user-smoke',role:'planner',active:true,person_id:'KC-P-002',display_name:'Hans-Joachim Koch',email:'smoke@example.com',phone:''};
  window.fetch=async(input,init={})=>{const url=typeof input==='string'?input:input?.url||String(input||'');if(!/https:\/\/[^/]+\.supabase\.co\//.test(url))return native(input,init);if(url.includes('/auth/v1/token?grant_type=password'))return new Response(JSON.stringify({access_token:'smoke-access',refresh_token:'smoke-refresh',expires_in:3600,token_type:'bearer',user:{id:'user-smoke',email:'smoke@example.com'}}),{status:200,headers:{'Content-Type':'application/json'}});if(url.includes('/rest/v1/kc_dp_memberships'))return new Response(JSON.stringify([membership]),{status:200,headers:{'Content-Type':'application/json'}});if(url.includes('/auth/v1/settings'))return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});return new Response('[]',{status:200,headers:{'Content-Type':'application/json'}})};
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE+'login-bootstrap.html',{waitUntil:'domcontentloaded',timeout:30000});await page.locator('#email').fill('smoke@example.com');await page.locator('#password').fill('smoke-password');await page.locator('#submit').click();await page.waitForURL(/app\.html\?bootstrap=1/,{timeout:15000});await page.waitForFunction(()=>window.KCDP?.memberAccess?.state?.status==='authenticated',{timeout:10000});
 await page.waitForTimeout(1000);
 let hasLauncher=await page.locator('#kcChoiceView').count()>0;if(!hasLauncher){await page.evaluate(()=>window.KCDP?.startChoice?.show?.());await page.waitForTimeout(150);hasLauncher=await page.locator('#kcChoiceView').count()>0;}
 check(hasLauncher,'start choice is reachable after loop neutralization');
 if(hasLauncher){
  for(const id of ['#kcChoiceView','#kcChoiceEdit','#kcChoiceMine','#kcChoiceWish'])check(await page.locator(id).isVisible(),`${id} visible`);
  const t0=Date.now();await page.locator('#kcChoiceView').click({timeout:5000});console.log('view click ms',Date.now()-t0);
  await page.waitForTimeout(500);check(await page.evaluate(()=>document.body.classList.contains('ux-legacy')),'view enters legacy mode');check(await page.locator('#mainView').count()===1,'legacy mainView exists');
  await page.waitForTimeout(1000);
  check(await page.locator('[data-kc-phone-nav="-1"]').count()===1,'mobile previous-day control exists');check(await page.locator('[data-kc-phone-nav="1"]').count()===1,'mobile next-day control exists');check(await page.locator('[data-kc-phone-mode="list"]').count()===1,'mobile list mode exists');check(await page.locator('[data-kc-phone-mode="bars"]').count()===1,'mobile bars mode exists');
  check(await page.locator('#quickPlanBtn').count()===1,'quick plan control exists');check(await page.locator('#publishBtn').count()===1,'publish control exists');check(await page.locator('#idbStatusLed').count()===1&&await page.locator('#supabaseStatusLed').count()===1,'IDX/SUP LEDs exist');
  const nextBefore=await page.locator('#dateLabel').innerText();await page.locator('[data-kc-phone-nav="1"]').click({timeout:5000});await page.waitForTimeout(150);const nextAfter=await page.locator('#dateLabel').innerText();check(nextAfter!==nextBefore,'mobile next-day button changes day');
  await page.locator('[data-kc-phone-mode="bars"]').click({timeout:5000});check(!(await page.evaluate(()=>document.body.classList.contains('kc-phone-list-mode'))),'bars mode switches successfully');
  const ret=page.locator('#uxLegacyReturn');if(await ret.count())await ret.click({timeout:5000});await page.waitForTimeout(150);check(await page.locator('#kcChoiceWish').count()===1,'return reaches start choice');
  if(await page.locator('#kcChoiceWish').count()){await page.locator('#kcChoiceWish').click({timeout:5000});await page.waitForTimeout(200);check(/Wunsch|Zeiten|Verfügbarkeit/i.test(await page.locator('#kcdpUxRoot').innerText()),'wish route opens');}
 }
 const runtime=await page.evaluate(()=>({provider:window.KCDP?.session?.state?.provider,remember:window.KCDP?.memberAccess?.state?.remember,managerSync:window.KCDP?.managerAutoSync?.state,deviceKey:window.KCDP?.deviceKeyManager?.state}));console.log('RUNTIME',JSON.stringify(runtime));
 check(runtime.provider==='supabase','session provider is canonical supabase (not bootstrap alias)');
 check(errors.length===0,`no uncaught browser errors (${errors.join(' | ')})`);
 console.log('DOWNSTREAM FAILURES',JSON.stringify(failures));await context.close();await browser.close();if(failures.length)process.exit(1);console.log('V0.20 downstream audit PASS');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
