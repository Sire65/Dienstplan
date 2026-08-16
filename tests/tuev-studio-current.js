'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const current=JSON.parse(fs.readFileSync(path.join(ROOT,'release/current.json'),'utf8'));
const SITE=path.join(ROOT,current.releasePath);
const RULES=path.join(ROOT,'docs/KC-DP2-ENGINEERING-RULES.md');
const read=p=>fs.readFileSync(path.join(SITE,p),'utf8');
const exists=p=>fs.existsSync(path.join(SITE,p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const ok=(v,m)=>{assert.ok(v,m);console.log('PASS ',m)};
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
function rel(f){return path.relative(SITE,f).replaceAll('\\','/');}

ok(/^0\.19\.\d+$/.test(String(current.version||'')),'current release has valid KC DP2 version');
ok(current.releasePath===`release/v${current.version}/site`,'current.json points to canonical versioned release tree');
ok(fs.existsSync(SITE),'canonical current release tree exists');
ok(fs.existsSync(RULES),'Engineering/TÜV/Studio rules exist');
ok(!exists('password-reset.html'),'no temporary password reset page in release');
const rules=fs.readFileSync(RULES,'utf8');
for(const m of ['Release- und Branch-Regeln','Supabase- und Security-Regeln','Datenquellen- und Stammdatenregeln','Planungsregeln','Tagesauswahl „Alle“ / „Verfügbar“','Rollen- und Bedienregeln','Offline-, PWA- und Update-Regeln','Push-Regeln','Diagnose-, TableCore- und Fehlerprotokoll-Regeln','Pflicht-Regression vor Freigabe','GRÜN:','GELB:','ROT:'])ok(rules.includes(m),'rulebook contains '+m);
ok(rules.includes(`V${current.version}`)||rules.includes('versionsübergreifend verbindlich'),'rulebook covers current production generation');

for(const p of ['src/adapters/push.js','src/adapters/diagnostics.js']){const b=fs.readFileSync(path.join(SITE,p));console.log(`HOTFIX_INTEGRITY ${p} bytes=${b.length} sha256=${sha(b)}`)}

const manifest=JSON.parse(read('update-manifest.json'));
ok(manifest.schema==='KC_DP_UPDATE_MANIFEST_V1','manifest schema correct');
ok(manifest.version===current.version,'manifest version equals current release');
ok(manifest.cacheName===`kc-dp-release-${current.version}`,'cache name equals current release');
let total=0;const seen=new Set();
for(const f of manifest.files){const install=f.installPath||f.path;ok(!seen.has(install),'manifest has no duplicate install path: '+install);seen.add(install);ok(exists(install),'manifest file exists: '+install);const b=fs.readFileSync(path.join(SITE,install));ok(b.length===Number(f.bytes),'byte length matches: '+install);ok(sha(b)===String(f.sha256).toLowerCase(),'SHA-256 matches: '+install);if(f.runtime!==false)total+=b.length;}
ok(total===Number(manifest.totalRuntimeBytes),'runtime byte total matches manifest');
for(const p of ['index.html','service-worker.js','src/core/model.js','src/core/update-manager.js','src/adapters/push.js','src/ui/push-center.js','src/adapters/diagnostics.js','src/ui/diagnostics-center.js','src/core/table-core-adapter.js','src/ui/kc-ux-polish.js','src/ui/kc-ux-polish.css'])ok(exists(p),'required runtime module exists: '+p);
const index=read('index.html');ok(index.includes(`KC DP2 V${current.version}`),'visible release title is current');ok(index.includes(`EXPECTED='${current.version}'`),'release mismatch guard expects current version');ok(!index.includes('KC DP V0.17.10 – kompakte Plansteuerung bereit.'),'obsolete visible status text removed');
const model=read('src/core/model.js');ok(model.includes(`K.VERSION='${current.version}'`),'global runtime K.VERSION equals current release');
const update=read('src/core/update-manager.js');ok(update.includes(`CURRENT_RELEASE='${current.version}'`),'update manager current release equals canonical version');
const push=read('src/adapters/push.js');ok(push.includes(`version:'${current.version}'`),'push adapter release identity equals current release');ok(push.includes(`service-worker.js?v=${current.version}`),'push service-worker registration is cache-busted with current release');
const ux=read('src/ui/kc-ux-polish.js');ok(ux.includes(`version:'${current.version}'`),'KC UX runtime identifies current release');ok(ux.includes(`KC DP2 V${current.version}`),'KC UX visible version equals current release');
const integrations=read('src/core/integrations.js');ok(integrations.includes("DEDICATED_REF='ptblnpiroqftcvlsrhac'"),'dedicated KC-DP2 Supabase is runtime target');ok(!/url\s*:\s*['\"]https:\/\/iddudrxuihdodnvejxcp\.supabase\.co/.test(integrations),'Academy project is not default runtime target');
for(const f of walk(SITE).filter(f=>/\.(?:js|html|css|json|webmanifest|txt)$/i.test(f))){const r=rel(f),t=fs.readFileSync(f,'utf8');ok(!/sb_secret_[A-Za-z0-9_-]{12,}/.test(t),'no Supabase secret embedded: '+r);ok(!t.includes('SUPABASE_SERVICE_ROLE_KEY'),'no service-role env key embedded: '+r);const jwts=t.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[];for(const token of jwts){try{const p=JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'));ok(p.role!=='service_role','no service_role JWT embedded: '+r);}catch(_){}}}
const sw=read('service-worker.js');for(const m of ['KC_DP_SWITCH_RELEASE','KC_DP_BOOT_OK','previousCache','pendingBoot',"pushReceipt(data.data,'displayed')","pushReceipt(data,'opened')","pushReceipt(data,'dismissed')"])ok(sw.includes(m),'service worker invariant present: '+m);
for(const m of ['reconcileExisting','ensureSession','sendSelfTest'])ok(push.includes(m),'push invariant present: '+m);ok(!push.includes('kc-dp-self-push-test'),'no floating self-test overlay in release');
const diag=read('src/adapters/diagnostics.js');for(const m of ['kc_dp_report_error','REDACTED','fingerprint'])ok(diag.includes(m),'diagnostics invariant present: '+m);
const tc=read('src/core/table-core-adapter.js');ok(/masterApi:'1\.1'/.test(tc),'TableCore adapter targets master API 1.1');ok(tc.includes('selection()'),'TableCore multi-selection API present');
console.log(`TÜV/STUDIO CURRENT RELEASE PASS: KC DP2 V${current.version}, ${manifest.files.length} manifest files, ${total} runtime bytes`);
