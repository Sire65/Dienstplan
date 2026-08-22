'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.join(__dirname,'..','release','v0.19.54','site');
const app=fs.readFileSync(path.join(root,'src','ui','app.js'),'utf8');
const role=fs.readFileSync(path.join(root,'src','ui','role-ux.js'),'utf8');
const quickUi=fs.readFileSync(path.join(root,'src','ui','quick-plan-recommendations.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
function ok(v,m){assert.ok(v,m);console.log('PASS',m)}

// Schnell-Einplanen
ok(index.includes('id="quickPlanBtn"'),'Schnell-Einplanen Button ist im Recovery-UI vorhanden');
ok(app.includes("K.auth?.has('roster.plan.edit')"),'Schnell-Einplanen verlangt Planungsberechtigung');
ok(app.includes('function openQuickPlan()'),'Quick-Plan Drawer ist implementiert');
ok(app.includes('data-quick-arm')&&app.includes('data-quick-now'),'Quick-Plan bietet Ziehen und Von/Bis-Editor');
ok(app.includes('issues=K.validateShift(candidate)'),'Gezogener Quick-Plan Dienst wird vor Speicherung validiert');
ok(app.includes("K.mutations.saveShift(candidate,{existingId:null,reason:'Schnellplanung im Zeitraster'})"),'Quick-Plan speichert ausschließlich über Mutationsschicht');
ok(quickUi.includes('K.plannerRecommendations?.recommendSlot'),'Quick-Plan nutzt zentrale Planungsempfehlungen');
ok(quickUi.includes("group=row.autoEligible?'recommended':row.manualAllowed?'manual':'blocked'"),'Quick-Plan trennt empfohlen/manuell/gesperrt');

// Kollegen suchen / Wunschzeiten übernehmen
ok(role.includes('function colleagueSearch()'),'Kollegensuche ist vorhanden');
ok(role.includes('p.personId!==K.currentUser.personId'),'Eigene Person wird aus Kollegensuche ausgeschlossen');
ok(role.includes('function colleagueDetail(personId)'),'Kollegen-Detail mit Wunschzeiten ist vorhanden');
ok(role.includes('function copyColleague(personId,ids)'),'Ausgewählte Kollegenzeiten können als Vorlage übernommen werden');
ok(role.includes('if(!wishesEditable())return employeeTimes()'),'Übernahme ist außerhalb geöffneter Wunschphase gesperrt');
ok(role.includes("source:'colleague_copy'"),'Übernommene Zeiten werden als Kollegen-Vorlage gekennzeichnet');
ok(role.includes('K.mutations.saveWish({...w,id:\'\',personId:K.currentUser.personId'),'Kollegenzeiten werden als eigene Wünsche über Mutationsschicht gespeichert');
ok(role.includes('await K.persistAll?.()'),'Kollegenübernahme wird anschließend persistent gespeichert');

// Drag & Drop / Resize
ok(app.includes("if(K.state.layer==='compare')"),'Drag&Drop ist im Vergleichsmodus schreibgeschützt');
ok(app.includes("K.auth?.has('roster.plan.edit')"),'Drag&Drop verlangt Planungsberechtigung');
ok(app.includes("cand.personId=row.dataset.person"),'Dienst kann zwischen Mitarbeiterzeilen verschoben werden');
ok(app.includes("target?.classList.add('drop-target',blocked?'drop-invalid':'drop-valid')"),'Ziel wird vor dem Ablegen grün/rot bewertet');
ok(app.includes('const issues=K.validateShift(cand),error=issues.find'),'Finales Drag&Drop wird erneut validiert');
ok(app.includes("if(error){")&&app.includes('Der Balken bleibt deshalb'),'Ungültiges Ziel wird abgewiesen und Original bleibt bestehen');
ok(app.includes("K.mutations.saveShift(cand,{existingId:s.id,reason:'Drag/Resize'})"),'Gültiges Drag&Drop speichert über Mutationsschicht');
ok(app.includes('undoAction=()=>{Object.assign(s,before);render();persist()}'),'Drag&Drop besitzt Undo-Rückweg');

console.log('V0.20.0 P6 Planungsinteraktionen Gate GRÜN');
