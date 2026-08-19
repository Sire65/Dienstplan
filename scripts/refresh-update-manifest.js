'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..');
const current=JSON.parse(fs.readFileSync(path.join(ROOT,'release/current.json'),'utf8'));
const SITE=path.join(ROOT,current.releasePath),manifestPath=path.join(SITE,'update-manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const extras=[
  ['pilot-mobile/index.html',false,true],
  ['pilot-mobile/app-v4.js',false,true],
  ['pilot-mobile/app-v4.css',false,true],
  ['pilot-mobile/test.html',false,true],
  ['pilot-mobile/manifest-android.webmanifest',false,false],
  ['pilot-mobile/manifest-ios.webmanifest',false,false],
  ['pilot-mobile/sw.js',false,true],
  ['src/adapters/installations.js',true,true],
  ['src/ui/installation-center.js',true,true],
  ['src/ui/installation-center.css',true,true],
  ['src/adapters/admin-push-settings.js',true,true],
  ['src/ui/admin-push-settings.js',true,true],
  ['src/ui/admin-push-settings.css',true,true],
  ['src/core/supabase-connection-monitor.js',true,true],
  ['src/ui/diagnostics-history-view.js',true,true]
];
const forceRefreshPaths=new Set(['index.html','src/ui/diagnostics-center.js','src/ui/diagnostics-center.css','src/core/supabase-connection-monitor.js','src/ui/diagnostics-history-view.js']);
for(const [p,runtime,forceRefresh] of extras){if(!manifest.files.some(x=>(x.installPath||x.path)===p))manifest.files.push({path:p,installPath:p,runtime,forceRefresh});}
let total=0;
for(const f of manifest.files){const install=f.installPath||f.path,full=path.join(SITE,install);if(!fs.existsSync(full))throw new Error('Manifest-Datei fehlt: '+install);const b=fs.readFileSync(full);f.bytes=b.length;f.sha256=sha(b);if(forceRefreshPaths.has(install))f.forceRefresh=true;if(f.runtime!==false)total+=b.length;if(f.forceRefresh===undefined)delete f.forceRefresh;}
manifest.version=current.version;manifest.cacheName=`kc-dp-release-${current.version}`;manifest.totalRuntimeBytes=total;manifest.generatedAt=new Date().toISOString();
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`update-manifest refreshed: ${manifest.files.length} files, ${total} runtime bytes`);
