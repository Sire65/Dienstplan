const fs=require('fs'),crypto=require('crypto'),path=require('path');
const root='release/v0.19.44/site',m=JSON.parse(fs.readFileSync(path.join(root,'update-manifest.json'),'utf8'));
if(m.version!=='0.19.44'||m.cacheName!=='kc-dp-release-0.19.44')throw Error('V0.19.44 Manifest-Version falsch');
const req=['src/ui/push-center.js','src/ui/push-center.css','src/adapters/diagnostics.js','src/ui/diagnostics-center.js','src/ui/diagnostics-center.css','src/core/table-core-adapter.js'];
for(const r of req)if(!m.files.some(x=>x.path===r))throw Error('Manifest fehlt: '+r);
let total=0;for(const f of m.files.filter(x=>x.runtime!==false)){const p=path.join(root,f.path),b=fs.readFileSync(p),h=crypto.createHash('sha256').update(b).digest('hex');if(b.length!==f.bytes)throw Error(`${f.path}: bytes mismatch`);if(h!==f.sha256)throw Error(`${f.path}: sha mismatch`);total+=b.length;}
if(total!==m.totalRuntimeBytes)throw Error('totalRuntimeBytes mismatch');
if(!fs.readFileSync(path.join(root,'src/core/update-manager.js'),'utf8').includes("CURRENT_RELEASE='0.19.44'"))throw Error('Update Manager nicht V0.19.44');
if(!fs.readFileSync(path.join(root,'src/adapters/push.js'),'utf8').includes("version:'0.19.44'"))throw Error('Push Adapter nicht V0.19.44');
console.log('V0.19.44 canonical release gate GREEN',m.files.length,'runtime files',total,'bytes');
