const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.join(__dirname,'..','release','v0.19.45','site');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'update-manifest.json'),'utf8'));
function fail(m){throw new Error(m)}
if(manifest.version!=='0.19.45'||manifest.cacheName!=='kc-dp-release-0.19.45')fail('Manifest-Version/Cache falsch');
const required=['src/ui/kc-ux-polish.css','src/ui/kc-ux-polish.js','src/ui/push-center.js','src/ui/push-center.css','src/adapters/diagnostics.js','src/ui/diagnostics-center.js','src/ui/diagnostics-center.css','src/core/table-core-adapter.js'];
for(const r of required)if(!manifest.files.some(x=>x.path===r))fail('Manifest fehlt: '+r);
let total=0;for(const f of manifest.files.filter(x=>x.runtime!==false)){const p=path.join(root,f.path);if(!fs.existsSync(p))fail('Datei fehlt: '+f.path);const b=fs.readFileSync(p),h=crypto.createHash('sha256').update(b).digest('hex');if(b.length!==f.bytes)fail(`${f.path}: Bytes ${b.length} != ${f.bytes}`);if(h!==f.sha256)fail(`${f.path}: SHA-256 falsch`);total+=b.length;}
if(total!==manifest.totalRuntimeBytes)fail(`Runtime-Summe ${total} != ${manifest.totalRuntimeBytes}`);
const current=JSON.parse(fs.readFileSync(path.join(__dirname,'..','release','current.json'),'utf8'));if(!/^0\.19\.\d+$/.test(String(current.version||'')))fail('current.json enthält keine gültige Produktversion');
const push=fs.readFileSync(path.join(root,'src/ui/push-center.js'),'utf8');if(!/Bitte installieren/.test(push)||!/sendMany/.test(push))fail('Push-Center unvollständig');
const diag=fs.readFileSync(path.join(root,'src/adapters/diagnostics.js'),'utf8');if(!/kc_dp_report_error/.test(diag)||!/REDACTED/.test(diag))fail('Diagnostics unvollständig');
const tc=fs.readFileSync(path.join(root,'src/core/table-core-adapter.js'),'utf8');if(!/masterApi:'1\.1'/.test(tc)||!/selection\(\)/.test(tc))fail('TableCore-Adapter unvollständig');
console.log(`KC DP2 V0.19.45 immutable legacy release gate: PASS; current production candidate V${current.version}`,manifest.files.length,'files',total,'bytes');
