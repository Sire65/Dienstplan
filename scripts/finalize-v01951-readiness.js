'use strict';
const fs=require('fs'),path=require('path'),child=require('child_process');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(ROOT,p),s);
function replaceRequired(text,from,to,label){if(text.includes(to))return text;if(!text.includes(from))throw new Error('Finalisierung: Marker fehlt: '+label);return text.replace(from,to);}

// 1) Startzustand: SUP ist bis zum echten Start-Healthcheck gelb statt fälschlich rot.
let index=read('release/v0.19.51/site/index.html');
index=index.replace(
  '<span class="db-label">SUP</span><span class="led led-status error" id="supabaseStatusLed"></span>',
  '<span class="db-label">SUP</span><span class="led led-status maintenance" id="supabaseStatusLed" title="Supabase-Verbindung wird hergestellt"></span>'
);
write('release/v0.19.51/site/index.html',index);

// 2) Diagnose-Center lädt die gehärteten Companion-Module cache-sicher.
let diag=read('release/v0.19.51/site/src/ui/diagnostics-center.js');
diag=diag.replace('src/core/supabase-connection-monitor.js?v=0.19.51-monitor1','src/core/supabase-connection-monitor.js?v=0.19.51-monitor3');
diag=diag.replace('src/ui/diagnostics-history-view.js?v=0.19.51-history1','src/ui/diagnostics-history-view.js?v=0.19.51-history4');
if(!diag.includes('kcDpExcelMigrationCenter')){
  const marker=" loadCompanion('kcDpDiagnosticsHistoryView','src/ui/diagnostics-history-view.js?v=0.19.51-history4');";
  if(!diag.includes(marker))throw new Error('Finalisierung: Diagnose-Companion-Marker fehlt');
  diag=diag.replace(marker,marker+"\n loadCompanion('kcDpExcelMigrationCenter','src/ui/excel-migration-center.js?v=0.19.51-migration1');");
}
write('release/v0.19.51/site/src/ui/diagnostics-center.js',diag);

// 3) PWA-Engine anheben, damit installierte Geräte Force-Refresh ausführen.
let sw=read('release/v0.19.51/site/service-worker.js');
sw=replaceRequired(sw,"const ENGINE='kc-dp-update-engine-v1.3';","const ENGINE='kc-dp-update-engine-v1.4';",'PWA engine');
write('release/v0.19.51/site/service-worker.js',sw);

// 4) Manifest-Generator um Excel-Migration ergänzen und alle Readiness-Module erzwingen.
let refresh=read('scripts/refresh-update-manifest.js');
if(!refresh.includes("['src/ui/excel-migration-center.js',true,true]")){
  refresh=replaceRequired(refresh,
    "  ['src/ui/diagnostics-history-view.js',true,true]\n];",
    "  ['src/ui/diagnostics-history-view.js',true,true],\n  ['src/ui/excel-migration-center.js',true,true]\n];",
    'manifest extras');
}
refresh=refresh.replace(
  "const forceRefreshPaths=new Set(['index.html','src/ui/diagnostics-center.js','src/ui/diagnostics-center.css','src/core/supabase-connection-monitor.js','src/ui/diagnostics-history-view.js']);",
  "const forceRefreshPaths=new Set(['index.html','src/ui/diagnostics-center.js','src/ui/diagnostics-center.css','src/core/supabase-connection-monitor.js','src/ui/diagnostics-history-view.js','src/ui/excel-migration-center.js']);"
);
write('scripts/refresh-update-manifest.js',refresh);

// 5) Vertragsprüfungen auf die neue PWA-Engine anheben.
for(const rel of ['release/v0.19.51/tests/diagnostics-manager-center-contract.mjs','tests/tuev-studio-current.js']){
  const full=path.join(ROOT,rel);if(!fs.existsSync(full))continue;let t=fs.readFileSync(full,'utf8');t=t.replaceAll('kc-dp-update-engine-v1.3','kc-dp-update-engine-v1.4');fs.writeFileSync(full,t);
}

// 6) Neue Gates in Tiefenkonsolidierung und Vollabnahme aufnehmen.
function addWorkflowSteps(rel,marker,block){let y=read(rel);const first=block.trim().split('\n')[0].trim();if(!y.includes(first)){if(!y.includes(marker))throw new Error('Workflow-Marker fehlt: '+rel);y=y.replace(marker,marker+block);write(rel,y);}}
addWorkflowSteps('.github/workflows/deep-consolidation-v01945.yml',
  "      - name: Diagnostics and TableCore contract\n        run: node tests/diagnostics-v01944-gate.js\n",
  "      - name: Diagnostics open/history separation\n        run: node tests/diagnostics-history-v01951-gate.js\n      - name: Supabase startup heartbeat and reconnect policy\n        run: node tests/supabase-connection-monitor-v01951-gate.js\n      - name: Old Excel migration identity and duplicate protection\n        run: node tests/excel-migration-v01951-gate.js\n");
addWorkflowSteps('.github/workflows/full-acceptance.yml',
  "      - name: Rollen und Berechtigungen Praxisabnahme\n        run: node tests/roles-e2e.js\n",
  "      - name: Supabase startup heartbeat and reconnect regression\n        run: node tests/supabase-connection-monitor-v01951-gate.js\n      - name: Diagnostics history regression\n        run: node tests/diagnostics-history-v01951-gate.js\n      - name: Old Excel migration regression\n        run: node tests/excel-migration-v01951-gate.js\n");

// 7) Hashes/Dateigrößen/Runtime-Summe ausschließlich aus den echten Dateien erzeugen.
child.execFileSync(process.execPath,[path.join(ROOT,'scripts/refresh-update-manifest.js')],{stdio:'inherit'});
let manifest=JSON.parse(read('release/v0.19.51/site/update-manifest.json'));
const notes=[
  'Supabase-Verbindung: automatischer Start-Healthcheck, laufender Heartbeat und Reconnect; Rot erst nach drei bestätigten Fehlern',
  'Fehlerdiagnose: offene Meldungen, Historie und Tests strikt getrennt',
  'Alt-Excel-Migration: mehrere Wunschlisten gesammelt prüfen, Mitglied über Name/ID zuordnen und Dubletten verhindern'
];
manifest.releaseNotes=Array.isArray(manifest.releaseNotes)?manifest.releaseNotes:[];
for(const n of notes.reverse())if(!manifest.releaseNotes.includes(n))manifest.releaseNotes.unshift(n);
write('release/v0.19.51/site/update-manifest.json',JSON.stringify(manifest,null,2)+'\n');

console.log('KC DP2 V0.19.51 readiness finalization complete.');
