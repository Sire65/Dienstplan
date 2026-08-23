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
  const native=window.fetch.bind(window),membership={org_id:'KC_WERNE',user_id:'user-reload',role:'planner',active:true,person_id:'KC-P-002',display_name:'Hans-Joachim Koch',email:'reload@example.com',phone:''};
  window.fetch=async(input,init={})=>{const url=typeof input==='string'?input:input?.url||String(input||'');if(!/https:\/\/[^/]+\.supabase\.co\//.test(url))return native(input,init);if(url.includes('/auth/v1/token?grant_type=password'))return new Response(JSON.stringify({access_token:'reload-access',refresh_token:'reload-refresh',expires_in:3600,token_type:'bearer',user:{id:'user-reload',email:'reload@example.com'}}),{status:200,headers:{'Content-Type':'application/json'}});if(url.includes('/auth/v1/token?grant_type=refresh_token'))return new Response(JSON.stringify({access_token:'reload-access-2',refresh_token:'reload-refresh-2',expires_in:3600,token_type:'bearer',user:{id:'user-reload',email:'reload@example.com'}}),{status:200,headers:{'Content-Type':'application/json'}});if(url.includes('/rest/v1/kc_dp_memberships'))return new Response(JSON.stringify([membership]),{status:200,headers:{'Content-Type':'application/json'}});if(url.includes('/auth/v1/settings'))return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});return new Response('[]',{status:200,headers:{'Content-Type':'application/json'}})};
 });
 const page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function waitLauncher(label){await page.waitForFunction(()=>window.KCDP?.memberAccess?.state?.status==='authenticated',{timeout:10000});await page.waitForSelector('#kcChoiceView',{state:'visible',timeout:8000});check(!await page.locator('#uxLoginForm').count(),`${label}: old login form is absent`);check(await page.locator('#kcChoiceEdit').isVisible(),`${label}: four-button start choice is visible`);await page.waitForSelector('#kcRoleIdbStatus',{state:'visible',timeout:5000});await page.waitForSelector('#kcRoleSupStatus',{state:'visible',timeout:5000});check(await page.locator('#kcRoleIdbStatus').isVisible()&&await page.locator('#kcRoleSupStatus').isVisible(),`${label}: IDX/SUP role LEDs are visible`);}
 await page.goto(BASE+'login-bootstrap.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#email').fill('reload@example.com');await page.locator('#password').fill('reload-password');await page.locator('#submit').click();await page.waitForURL(/app\.html\?bootstrap=1/,{timeout:15000});
 await waitLauncher('first start');
 await page.waitForFunction(()=>window.KCDP?.__bootstrapPersisted===true,{timeout:8000});check(true,'first start: encrypted remembered session persisted');
 const first=await page.evaluate(()=>({source:window.KCDP?.__bootstrapSessionSource,persisted:window.KCDP?.__bootstrapPersisted,provider:window.KCDP?.session?.state?.provider,storage:!!window.KCDP?.storage?.unlocked}));console.log('FIRST',JSON.stringify(first));check(first.source==='handoff'&&first.provider==='supabase'&&first.storage,'first start uses handoff with canonical Supabase session and unlocked storage');
 await page.reload({waitUntil:'domcontentloaded',timeout:30000});await waitLauncher('reload 1');
 const r1=await page.evaluate(()=>({source:window.KCDP?.__bootstrapSessionSource,restored:window.KCDP?.__bootstrapRestoredAfterReload,redirect:window.KCDP?.__bootstrapReloadRedirectReason||null,provider:window.KCDP?.session?.state?.provider}));console.log('RELOAD1',JSON.stringify(r1));check(r1.source==='persisted'&&r1.restored===true&&r1.provider==='supabase','reload 1 restores encrypted session without old login');
 await page.waitForTimeout(1200);check(await page.locator('#kcRoleIdbStatus').isVisible()&&await page.locator('#kcRoleSupStatus').isVisible(),'reload 1: LEDs remain visible after 1.2 seconds');
 await page.reload({waitUntil:'domcontentloaded',timeout:30000});await waitLauncher('reload 2');
 const r2=await page.evaluate(()=>({source:window.KCDP?.__bootstrapSessionSource,restored:window.KCDP?.__bootstrapRestoredAfterReload,provider:window.KCDP?.session?.state?.provider}));check(r2.source==='persisted'&&r2.restored===true&&r2.provider==='supabase','reload 2 again restores remembered session');
 await page.locator('#kcChoiceEdit').click();await page.waitForFunction(()=>document.body.classList.contains('ux-legacy'),{timeout:8000});await page.waitForTimeout(600);
 check(await page.locator('#idbStatusLed').isVisible()&&await page.locator('#supabaseStatusLed').isVisible(),'planner: legacy IDX/SUP LEDs are visible');
 check(await page.locator('[data-kc-phone-nav="-1"]').count()===1&&await page.locator('[data-kc-phone-nav="1"]').count()===1,'planner: mobile day navigation remains available after reloads');
 check(errors.length===0,`no uncaught browser errors (${errors.join(' | ')})`);
 console.log('RELOAD AUDIT FAILURES',JSON.stringify(failures));await context.close();await browser.close();if(failures.length)process.exit(1);console.log('V0.20 P24 browser reload stability PASS');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});