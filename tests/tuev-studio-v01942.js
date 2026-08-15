const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const assert=require('assert');

const SITE=path.resolve('release/v0.19.42/site');
const RULES=path.resolve('docs/KC-DP2-ENGINEERING-RULES.md');
const CURRENT=path.resolve('release/current.json');
const read=p=>fs.readFileSync(path.join(SITE,p),'utf8');
const exists=p=>fs.existsSync(path.join(SITE,p));
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
function pass(name){console.log('PASS  '+name)}
function requireRule(ok,name){assert.ok(ok,name);pass(name)}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function rel(file){return path.relative(SITE,file).replaceAll('\\','/');}
function textFiles(){return walk(SITE).filter(f=>/\.(?:js|html|css|json|webmanifest|txt)$/i.test(f));}

requireRule(fs.existsSync(SITE),'Kanonischer V0.19.42-Releasebaum vorhanden');
requireRule(!exists('password-reset.html'),'Keine temporäre Passwort-Reset-Seite im Release');
requireRule(fs.existsSync(RULES),'Verbindliche KC-DP2 Engineering-/TÜV-Regelakte vorhanden');
requireRule(fs.existsSync(CURRENT),'release/current.json vorhanden');
const current=JSON.parse(fs.readFileSync(CURRENT,'utf8'));
requireRule(/^0\.19\.\d+$/.test(String(current.version||'')),'current.json enthält gültige KC-DP2-Version');
requireRule(typeof current.releasePath==='string'&&fs.existsSync(path.resolve(current.releasePath)),'current.json zeigt auf vorhandenen kanonischen Releasebaum');
const rules=fs.readFileSync(RULES,'utf8');
for(const marker of ['Release- und Branch-Regeln','Supabase- und Security-Regeln','Datenquellen- und Stammdatenregeln','Planungsregeln','Tagesauswahl „Alle“ / „Verfügbar“','Rollen- und Bedienregeln','Offline-, PWA- und Update-Regeln','Push-Regeln','Pflicht-Regression vor Freigabe','GRÜN:','GELB:','ROT:']) requireRule(rules.includes(marker),`Regelakte enthält: ${marker}`);

const manifest=JSON.parse(read('update-manifest.json'));
requireRule(manifest.schema==='KC_DP_UPDATE_MANIFEST_V1','Update-Manifest Schema korrekt');
requireRule(manifest.version==='0.19.42','Releaseversion V0.19.42 eindeutig');
requireRule(manifest.cacheName==='kc-dp-release-0.19.42','V0.19.42 Cache-Name eindeutig');
let runtimeTotal=0;
for(const f of manifest.files){
  const install=f.installPath||f.path;
  requireRule(exists(install),`Manifest-Datei vorhanden: ${install}`);
  const buf=fs.readFileSync(path.join(SITE,install));
  const actualBytes=buf.length,actualSha=sha256(buf);
  console.log(`MANIFEST_ACTUAL ${install} bytes=${actualBytes} sha256=${actualSha}`);
  requireRule(actualBytes===Number(f.bytes),`Byte-Länge stimmt: ${install} (manifest=${f.bytes}, ist=${actualBytes})`);
  requireRule(actualSha===String(f.sha256).toLowerCase(),`SHA-256 stimmt: ${install} (manifest=${f.sha256}, ist=${actualSha})`);
  if(f.runtime!==false)runtimeTotal+=actualBytes;
}
requireRule(runtimeTotal===Number(manifest.totalRuntimeBytes),'Manifest-Gesamtsumme der Runtime-Dateien stimmt');
requireRule(read('RELEASE.txt').includes('KC-DP2 0.19.42'),'Release-Datei weist V0.19.42 aus');

const integrations=read('src/core/integrations.js');
requireRule(integrations.includes("DEDICATED_REF='ptblnpiroqftcvlsrhac'"),'Dediziertes KC-DP2-Supabase als Runtime-Ziel');
requireRule(integrations.includes("profile:'KC_DP_DEDICATED_PROJECT'"),'Dediziertes KC-DP2-Profil aktiv');
requireRule(integrations.includes("LEGACY_REFS=['iddudrxuihdodnvejxcp'"),'Academy-Ref nur als kontrollierter Legacy-Migrationspfad bekannt');
requireRule(!/url\s*:\s*['\"]https:\/\/iddudrxuihdodnvejxcp\.supabase\.co/.test(integrations),'Academy ist kein Default-Runtime-Ziel');

const exactAcademyRef='iddudrxuihdodnvejxcp';
for(const file of textFiles()){
  const r=rel(file),txt=fs.readFileSync(file,'utf8');
  if(txt.includes(exactAcademyRef)) requireRule(r==='src/core/integrations.js',`Academy-Projektref nur im Legacy-Migrator: ${r}`);
  requireRule(!/sb_secret_[A-Za-z0-9_-]{12,}/.test(txt),`Kein eingebetteter Supabase Secret-Key im Browserpaket: ${r}`);
  requireRule(!txt.includes('SUPABASE_SERVICE_ROLE_KEY'),`Kein Service-Role-Environment-Key im Browserpaket: ${r}`);
  const jwts=txt.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[];
  for(const token of jwts){
    try{const payload=JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'));requireRule(payload.role!=='service_role',`Kein service_role-JWT im Browserpaket: ${r}`);}catch(_){/* kein decodierbarer JWT */}
  }
}

const supabaseProvider=read('src/adapters/supabase-provider.js');
requireRule(supabaseProvider.includes('sessionSnapshot'),'Supabase-Provider stellt Session-Snapshot bereit');
requireRule(supabaseProvider.includes('ensureSession'),'Supabase-Provider erzwingt gültige Auth-Sitzung');
const session=read('src/core/session.js');
requireRule(session.length>0,'Session-Runtime ist im versiegelten Alt-Release vorhanden');

const push=read('src/adapters/push.js');
requireRule(push.includes('reconcileExisting'),'Push-Subscription-Reconcile vorhanden');
requireRule(push.includes("K.storage.get('supabaseSession')"),'Push stellt verschlüsselte Supabase-Sitzung wieder her');
requireRule(push.includes('ensureSession'),'Push erneuert/prüft Supabase-Sitzung vor geschützten Aufrufen');
requireRule(push.includes('sendSelfTest'),'Geschützte Push-Self-Test-Funktion bleibt verfügbar');
requireRule(!push.includes('kc-dp-self-push-test'),'Kein schwebender Push-Test-Overlay in der Releaseoberfläche');

console.log(`TÜV Studio V0.19.42 sealed legacy release: PASS; current production is V${current.version}`);
