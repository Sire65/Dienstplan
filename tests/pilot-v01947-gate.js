'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const candidate=fs.existsSync(path.join(ROOT,'release/v0.19.47/site'))?'release/v0.19.47/site':'release/v0.19.46/site';
const SITE=path.join(ROOT,candidate),read=p=>fs.readFileSync(path.join(SITE,p),'utf8'),ok=(v,m)=>{assert.ok(v,m);console.log('PASS ',m)};
for(const p of ['pilot/index.html','pilot/manifest.webmanifest','pilot-sw.js','src/core/pilot-onboarding.js','src/ui/pilot-app.js','src/ui/pilot.css'])ok(fs.existsSync(path.join(SITE,p)),'pilot runtime exists: '+p);
const html=read('pilot/index.html'),manifest=JSON.parse(read('pilot/manifest.webmanifest')),sw=read('pilot-sw.js'),app=read('src/ui/pilot-app.js'),core=read('src/core/pilot-onboarding.js');
ok(manifest.start_url==='./index.html'&&manifest.scope==='./','pilot PWA stays inside /pilot/ scope');
ok(html.includes('keine Köcheclub-Mitgliederdaten')&&html.includes('Installation & Push'),'pilot purpose and isolation are visible');
ok(app.includes("kc-dp-pilot")&&app.includes("TOKEN_KEY='kc_dp_pilot_token_v01947'"),'pilot uses token-protected edge endpoint');
ok(app.includes("register('../pilot-sw.js?v=0.19.47',{scope:'./'"),'pilot uses isolated service worker');
ok(!app.includes('kc_dp_memberships')&&!app.includes('person-provider')&&!app.includes('planner'),'pilot client has no member/planner data access');
ok(core.includes("if(/iPhone|iPad|iPod/i.test(s))return'ios'")&&core.includes("if(/Android/i.test(s))return'android'"),'iOS and Android device guidance exists');
ok(core.includes('Der Entwickler bedankt sich')&&core.includes('uninstallHelp'),'completion thank-you and uninstall help exist');
ok(app.includes("call('test_received')"),'test success requires notification-open acknowledgement');
ok(sw.includes("data.type==='test'")||sw.includes("data?.type||'msg'"),'pilot service worker handles typed push');
ok(sw.includes("./pilot/index.html")&&sw.includes('KC_DP_NOTIFICATION_OPEN'),'closed-app push returns to pilot app');
for(const t of [html,sw,app,core]){ok(!/sb_secret_[A-Za-z0-9_-]{8,}/.test(t),'no Supabase secret in pilot runtime');ok(!t.includes('SUPABASE_SERVICE_ROLE_KEY'),'no service-role key name in pilot runtime');}
console.log('KC DP2 V0.19.47 PILOT GATE PASS');