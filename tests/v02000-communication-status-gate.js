const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.join(process.cwd(),'release/v0.19.54/site');
const bridge=fs.readFileSync(path.join(root,'src/adapters/communication-bridge.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'src/ui/communication-status-ui.js'),'utf8');

assert(bridge.includes("mode:'test'"),'Bridge muss im TEST-Modus bleiben');
assert(bridge.includes('testOnly:true'),'Bridge muss TEST-only erzwingen');
assert(bridge.includes("src/ui/communication-status-ui.js?v=0.20.0-p9"),'P9 Status-UI muss lokal nachgeladen werden');
assert(!bridge.includes('manualHealth();'),'Bridge darf beim Laden keinen automatischen Health-Test ausführen');
assert(ui.includes('KC Communication · TEST'),'Einstellungsentry muss TEST klar anzeigen');
assert(ui.includes('Verbindung manuell testen'),'Manueller Verbindungstest fehlt');
assert(ui.includes('K.communicationBridge.manualHealth()'),'Manueller Test muss die bestehende Bridge verwenden');
assert(ui.includes("test.onclick=async()=>"),'Health-Test darf nur über Benutzeraktion ausgelöst werden');
assert(ui.includes("K.communicationBridge?.state"),'Status-UI muss Bridge-State lesen');
assert(ui.includes('LIVE-Versand ist in KC DP2 nicht freigeschaltet'),'LIVE-Sperre muss sichtbar sein');
assert(!ui.includes('setLive')&&!ui.includes('enableLive')&&!ui.includes('mode=\'live\''),'P9 darf keinen LIVE-Schalter enthalten');
assert(ui.includes("new Set(['planner','duty_manager','admin'])"),'Statuscenter muss auf berechtigte Rollen begrenzt sein');

console.log('KC DP2 V0.20 P9 Communication Status Gate PASS');
