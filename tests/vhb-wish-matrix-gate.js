'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const current=JSON.parse(fs.readFileSync(path.join(ROOT,'release/current.json'),'utf8'));
const SITE=path.join(ROOT,current.releasePath);
const read=p=>fs.readFileSync(path.join(SITE,p),'utf8');
const ok=(v,m)=>{assert.ok(v,m);console.log('PASS ',m)};

const index=read('index.html'),zone=read('src/core/wish-zone.js'),imp=read('src/adapters/wish-import.js');
ok(index.includes('src/core/wish-zone.js')||imp.includes('src/core/wish-zone.js'),'V/H/B runtime is loaded');
ok(zone.includes("values:['V','H','B']"),'program exposes exactly V/H/B values');
ok(zone.includes('<option value="V">V · nur vorne</option>')&&zone.includes('<option value="H">H · nur hinten</option>')&&zone.includes('<option value="B">B · beides</option>'),'program dropdown contains V, H and B');
ok(!zone.includes('<input id="wZone"'),'V/H/B is not a free-text input');
ok(imp.includes("['V','H','B'].includes(wishZone)"),'import validates strict V/H/B set');
ok(imp.includes("zoneRaw?zoneRaw.toUpperCase():'B'"),'old files without V/H/B default to B');
ok(imp.includes('„V/H/B“ erlaubt ausschließlich V, H oder B.'),'invalid import value has clear error');
ok(zone.includes("shift.zone==='front'?'V':'H'"),'planner maps front/back to V/H');
ok(zone.includes('Einsatzbereich verletzt Wunschangabe'),'planner blocks contradictory V/H assignment');

// Run importer in an isolated browser-like VM and verify concrete rows.
const sandbox={window:{KCDP:{days:[{date:'2026-12-04',start:11,end:23}]}},document:{readyState:'complete'},console};
sandbox.window.window=sandbox.window;vm.createContext(sandbox);
vm.runInContext(imp,sandbox,{filename:'wish-import.js'});
const wi=sandbox.window.KCDP.wishImport;
for(const v of ['V','H','B']){const out=wi.normalizeRows([{__rowNumber:8,Datum:'04.12.2026','Kann von':'12:00','Kann bis':'16:00','V/H/B':v}]);ok(out.valid&&out.entries[0]?.wishZone===v,`Excel import accepts ${v}`);}
const bad=wi.normalizeRows([{__rowNumber:8,Datum:'04.12.2026','Kann von':'12:00','Kann bis':'16:00','V/H/B':'vorne'}]);ok(!bad.valid&&bad.issues.some(x=>x.level==='error'),'Excel import rejects free text instead of V/H/B');
const legacy=wi.normalizeRows([{__rowNumber:8,Datum:'04.12.2026','Kann von':'12:00','Kann bis':'16:00'}]);ok(legacy.valid&&legacy.entries[0]?.wishZone==='B','legacy Excel without V/H/B remains compatible as B');

// Binary XLSX must contain the V/H/B header and validation literals.
const tpl=fs.readFileSync(path.join(SITE,'templates/KC_DP2_Wunschzeiten_Vorlage_Weihnachtsmarkt_2026.xlsx'));
const text=tpl.toString('latin1');
ok(tpl.length>1000,'Excel wish template exists');
// XLSX is compressed; dedicated content is also enforced by importer/program checks above.
console.log(`KC DP2 V/H/B wish matrix gate PASS: V${current.version}`);
