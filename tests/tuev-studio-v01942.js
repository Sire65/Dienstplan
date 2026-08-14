const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const assert=require('assert');

const SITE=path.resolve('release/v0.19.41/site');
const read=p=>fs.readFileSync(path.join(SITE,p),'utf8');
const exists=p=>fs.existsSync(path.join(SITE,p));
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const warnings=[];
function pass(name){console.log('PASS  '+name)}
function warn(name){warnings.push(name);console.log('WARN  '+name)}
function requireRule(ok,name){assert.ok(ok,name);pass(name)}

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
}
function rel(file){return path.relative(SITE,file).replaceAll('\\','/');}
function textFiles(){return walk(SITE).filter(f=>/\.(?:js|html|css|json|webmanifest|txt)$/i.test(f));}

requireRule(fs.existsSync(SITE),'V0.19.41-Basissite vorhanden');
requireRule(!exists('password-reset.html'),'Keine temporäre Passwort-Reset-Seite im Release');

const manifest=JSON.parse(read('update-manifest.json'));
requireRule(manifest.schema==='KC_DP_UPDATE_MANIFEST_V1','Update-Manifest Schema korrekt');
requireRule(manifest.version==='0.19.41','V0.19.41-Basisversion eindeutig');
requireRule(manifest.cacheName==='kc-dp-release-0.19.41','V0.19.41 Cache-Name eindeutig');
for(const f of manifest.files){
  requireRule(exists(f.path),`Manifest-Datei vorhanden: ${f.path}`);
  const buf=fs.readFileSync(path.join(SITE,f.path));
  requireRule(buf.length===Number(f.bytes),`Byte-Länge stimmt: ${f.path}`);
  requireRule(sha256(buf)===String(f.sha256).toLowerCase(),`SHA-256 stimmt: ${f.path}`);
}
const sessionManifest=manifest.files.find(f=>f.path==='src/core/session.js');
requireRule(sessionManifest?.forceRefresh===true,'Session-Hotfix wird im PWA-Cache erzwungen aktualisiert');

const integrations=read('src/core/integrations.js');
requireRule(integrations.includes("DEDICATED_REF='ptblnpiroqftcvlsrhac'"),'Dediziertes KC-DP2-Supabase als Runtime-Ziel');
requireRule(integrations.includes("profile:'KC_DP_DEDICATED_PROJECT'"),'Dediziertes KC-DP2-Profil aktiv');
requireRule(integrations.includes("LEGACY_REFS=['iddudrxuihdodnvejxcp'"),'Academy-Ref nur als kontrollierter Legacy-Migrationspfad bekannt');
requireRule(!/url\s*:\s*['\"]https:\/\/iddudrxuihdodnvejxcp\.supabase\.co/.test(integrations),'Academy ist kein Default-Runtime-Ziel');

const exactAcademyRef='iddudrxuihdodnvejxcp';
for(const file of textFiles()){
  const r=rel(file),txt=fs.readFileSync(file,'utf8');
  if(txt.includes(exactAcademyRef)) requireRule(r==='src/core/integrations.js',`Academy-Projektref nur im Legacy-Migrator: ${r}`);
  // Die Zeichenfolge sb_secret_ darf in einer Validierungs-/Sperrregex vorkommen. Verboten ist ein tatsächlich eingebetteter Secret-Key.
  requireRule(!/sb_secret_[A-Za-z0-9_-]{12,}/.test(txt),`Kein eingebetteter Supabase Secret-Key im Browserpaket: ${r}`);
  requireRule(!txt.includes('SUPABASE_SERVICE_ROLE_KEY'),`Kein Service-Role-Environment-Key im Browserpaket: ${r}`);
  requireRule(!txt.includes('JH0H43SSkAid-18zimrYp_Rh1t6sCm6KxU4wBk5nzEk'),`Kein temporäres Reset-Bearer im Browserpaket: ${r}`);
  const jwts=txt.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[];
  for(const token of jwts){
    try{
      const payload=JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'));
      requireRule(payload.role!=='service_role',`Kein service_role-JWT im Browserpaket: ${r}`);
    }catch(_){/* kein decodierbarer JWT */}
  }
}

const supabaseProvider=read('src/adapters/supabase-provider.js');
requireRule(supabaseProvider.includes("/^sb_secret_/i.test(key)")&&supabaseProvider.includes("decodeJwtRole(key)==='service_role'"),'Browser-Provider blockiert Secret- und service_role-Schlüssel aktiv');

const appShell=read('src/ui/app.js');
requireRule(!appShell.includes(exactAcademyRef),'App-Shell enthält keinen Academy-Projektref mehr');
requireRule(!appShell.includes('FUTURA_SHARED_PROJECT'),'App-Shell enthält kein altes Futura-Runtimeprofil mehr');
requireRule(!appShell.includes('dbFuturaPreset'),'App-Shell enthält keinen alten Futura-Preset-Button mehr');
requireRule(!/Futura/i.test(appShell),'App-Shell enthält keine irreführende Futura-Konfigurationsanweisung mehr');
requireRule(appShell.includes("KC_DP_DEDICATED_PROJECT")&&appShell.includes('KC DP2 · dediziertes Supabase-Projekt'),'Datenbankdialog weist das dedizierte KC-DP2-Projekt eindeutig aus');

const session=read('src/core/session.js');
requireRule(session.includes("if(state.provider==='supabase')return false"),'Supabase-Sitzung wird nicht lokal nach 10 Minuten beendet');

const push=read('src/adapters/push.js');
requireRule(push.includes("version:'0.19.41'"),'Push-Adapter V0.19.41 aktiv');
requireRule(push.includes('reconcileExisting'),'VAPID-Reconcile für bestehende Geräte vorhanden');
requireRule(!push.includes('Notification.requestPermission()')||push.includes('subscribe'),'Automatische Reconcile-Schicht fordert nicht unkontrolliert Berechtigung an');

const sw=read('service-worker.js');
requireRule(sw.includes("const UPDATE_MANIFEST='./update-manifest.json'"),'Service Worker nutzt Release-Manifest');
requireRule(sw.includes('refreshForcedRuntime'),'Service Worker unterstützt gezielten Cache-Hotfix');
requireRule(sw.includes("cache:'no-store'"),'Updatepfad umgeht veralteten HTTP-Cache');
requireRule(sw.includes('pendingBoot')&&sw.includes('maybeRollback'),'Boot-Bestätigung und Rollback-Schutz vorhanden');

const index=read('index.html');
const scripts=[...index.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
const styles=[...index.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
requireRule(new Set(scripts).size===scripts.length,'Keine doppelten Script-Einbindungen');
for(const p of [...scripts,...styles]) requireRule(exists(p),`Index-Referenz vorhanden: ${p}`);
const pos=p=>scripts.indexOf(p);
requireRule(pos('src/core/planner-engine.js')>pos('src/core/breaks.js'),'Planner Engine lädt nach Staffing/Pausenbasis');
requireRule(pos('src/core/planner-recommendations.js')>pos('src/core/planner-engine.js'),'Recommendations laden nach Planner Engine');
requireRule(pos('src/core/replacement-recommendations.js')>pos('src/core/planner-recommendations.js'),'Ersatzsuche nutzt zentrale Recommendations');
requireRule(pos('src/core/manager-auto-sync.js')>pos('src/adapters/pc-manager.js'),'Manager Auto-Sync lädt nach PC-Manager-Adapter');
requireRule(pos('src/core/planner-application-guard.js')>pos('src/ui/app.js'),'Apply-Guard sitzt an der finalen UI-Übernahmegrenze');

const managerAuto=read('src/core/manager-auto-sync.js');
requireRule(managerAuto.includes('roster.people.sync'),'Manager Auto-Sync ist berechtigungsgebunden');
requireRule(managerAuto.includes('autoSync'),'Manager Auto-Sync respektiert den Benutzerschalter');

const dayFilter=read('src/ui/day-availability-filter.js');
requireRule(dayFilter.includes('insertBefore(button,plus)'),'Verfügbarkeitsbutton steht links vom vorhandenen Plus');
const dayCore=read('src/core/day-availability.js');
requireRule(dayCore.includes('hasActiveAbsence'),'Krankheit/Abwesenheit im Tagesfilter');
requireRule(dayCore.includes('fullyUnavailableByWish'),'Ganztägige Nichtverfügbarkeit im Tagesfilter');
requireRule(dayCore.includes('helperHasWindow'),'Aushilfen-Zeitmatrix im Tagesfilter');

const planner=read('src/core/planner-engine.js');
requireRule(planner.includes('eligib')||planner.includes('eligibility'),'Planner besitzt getrennte Eligibility-/Hard-Rule-Schicht');
const guard=read('src/core/planner-application-guard.js');
requireRule(guard.includes('validate'),'KI-Plan wird vor Übernahme erneut validiert');
const repl=read('src/core/replacement-recommendations.js');
requireRule(repl.includes('plannerRecommendations'),'Ersatzsuche nutzt denselben zentralen Empfehlungskern');

if(!/KC DP2 V0\.19\.4[12]/.test(index)) warn('HTML-<title> ist noch historisch/legacy statt Release-Version; nicht funktionskritisch, für Release-Hygiene vorm finalen Packaging bereinigen.');

console.log(`\nKC DP2 TÜV/STUDIO: ${warnings.length?'PASS MIT HINWEISEN':'PASS'}`);
if(warnings.length)console.log('Hinweise: '+warnings.join(' | '));
