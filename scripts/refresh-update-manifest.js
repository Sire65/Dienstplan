'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..');
const current=JSON.parse(fs.readFileSync(path.join(ROOT,'release/current.json'),'utf8'));
const SITE=path.join(ROOT,current.releasePath),manifestPath=path.join(SITE,'update-manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const build=Number(current.build||0);
const previousGeneratedAt=manifest.generatedAt||null;
const stable=v=>JSON.stringify({...v,generatedAt:null});
const previousStable=stable(manifest);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

/* release/current.json ist die einzige Quelle fuer den Hotfix-Build.
 * Vor der Manifest-Berechnung werden Build-ID und Cache-Buster in index.html
 * synchronisiert. Dadurch reicht fuer spaetere Hotfixes das Hochzaehlen von
 * current.build; Browser und Update-Erkennung sehen dann garantiert neue Dateien.
 */
const indexPath=path.join(SITE,'index.html');
if(fs.existsSync(indexPath)){
  let html=fs.readFileSync(indexPath,'utf8');
  if(/window\.KC_DP_BUILD\s*=\s*\d+/.test(html))html=html.replace(/window\.KC_DP_BUILD\s*=\s*\d+/g,`window.KC_DP_BUILD=${build}`);
  else html=html.replace(/<head>/i,`<head>\n  <script>window.KC_DP_BUILD=${build};<\/script>`);
  html=html.replace(/src\/ui\/session-mobile-hotfix\.js\?[^\"']*/g,`src/ui/session-mobile-hotfix.js?build=${build}`);
  html=html.replace(/src\/core\/update-build-guard\.js\?[^\"']*/g,`src/core/update-build-guard.js?build=${build}`);
  fs.writeFileSync(indexPath,html);
}

const extras=[
  ['pilot-mobile/index.html',false,true],
  ['pilot-mobile/app-v4.js',false,true],
  ['pilot-mobile/app-v4.css',false,true],
  ['pilot-mobile/test.html',false,true],
  ['pilot-mobile/manifest-android.webmanifest',false,false],
  ['pilot-mobile/manifest-ios.webmanifest',false,false],
  ['pilot-mobile/sw.js',false,true],
  ['src/adapters/installations.js',true,true],
  ['src/adapters/supabase-provider.js',true,true],
  ['src/ui/installation-center.js',true,true],
  ['src/ui/installation-center.css',true,true],
  ['src/adapters/admin-push-settings.js',true,true],
  ['src/ui/admin-push-settings.js',true,true],
  ['src/ui/admin-push-settings.css',true,true],
  ['src/core/supabase-connection-monitor.js',true,true],
  ['src/ui/diagnostics-history-view.js',true,true],
  ['src/ui/excel-migration-center.js',true,true],
  ['src/core/diagnostics-controller-v5.js',true,true],
  ['src/core/diagnostics-watchdog.js',true,true],
  ['src/core/diagnostics-button-router.js',true,true],
  ['src/ui/session-mobile-hotfix.js',true,true],
  ['src/ui/session-diagnostics-guard.js',true,true],
  ['src/ui/kc-ux-polish.js',true,true],
  ['src/ui/kc-ux-polish.css',true,true],
  ['src/ui/update-ui.js',true,true],
  ['src/core/login-trace.js',true,true],
  ['src/core/update-build-guard.js',true,true],
  ['src/core/planner-application-guard.js',true,true],
  ['src/ui/start-choice.js',true,true],
  ['src/ui/start-choice.css',true,true]
];
const forceRefreshPaths=new Set([
  'index.html',
  'src/ui/app.js',
  'src/ui/update-ui.js',
  'src/core/login-trace.js',
  'src/core/update-build-guard.js',
  'src/adapters/supabase-provider.js',
  'src/core/planner-application-guard.js',
  'src/ui/start-choice.js',
  'src/ui/start-choice.css',
  'src/ui/installation-center.js',
  'src/ui/installation-center.css',
  'src/ui/diagnostics-center.js',
  'src/ui/diagnostics-center.css',
  'src/core/supabase-connection-monitor.js',
  'src/ui/diagnostics-history-view.js',
  'src/ui/excel-migration-center.js',
  'src/core/diagnostics-controller-v5.js',
  'src/core/diagnostics-watchdog.js',
  'src/core/diagnostics-button-router.js',
  'src/ui/session-mobile-hotfix.js',
  'src/ui/session-diagnostics-guard.js',
  'src/ui/kc-ux-polish.js',
  'src/ui/kc-ux-polish.css'
]);
for(const [p,runtime,forceRefresh] of extras){if(!manifest.files.some(x=>(x.installPath||x.path)===p))manifest.files.push({path:p,installPath:p,runtime,forceRefresh});}
let total=0;
for(const f of manifest.files){const install=f.installPath||f.path,full=path.join(SITE,install);if(!fs.existsSync(full))throw new Error('Manifest-Datei fehlt: '+install);const b=fs.readFileSync(full);f.bytes=b.length;f.sha256=sha(b);if(forceRefreshPaths.has(install))f.forceRefresh=true;if(f.runtime!==false)total+=b.length;if(f.forceRefresh===undefined)delete f.forceRefresh;}
manifest.version=current.version;
manifest.build=build;
manifest.cacheName=`kc-dp-release-${current.version}-b${build}`;
manifest.totalRuntimeBytes=total;
manifest.generatedAt=stable(manifest)===previousStable?previousGeneratedAt:new Date().toISOString();
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`update-manifest refreshed: V${manifest.version} Build ${build}, ${manifest.files.length} files, ${total} runtime bytes${manifest.generatedAt===previousGeneratedAt?' (unchanged)':''}`);
