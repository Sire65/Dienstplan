'use strict';
const fs=require('fs');
const assert=require('assert');
const ROOT='release/v0.19.54/site';
const polish=fs.readFileSync(`${ROOT}/src/ui/kc-ux-polish.js`,'utf8');
const start=fs.readFileSync(`${ROOT}/src/ui/start-choice.js`,'utf8');
const css=fs.readFileSync(`${ROOT}/src/ui/start-choice.css`,'utf8');
const index=fs.readFileSync(`${ROOT}/index.html`,'utf8');

assert(polish.includes("l.id='kcStartChoiceCss'"),'Startauswahl-CSS muss isoliert nachgeladen werden');
assert(polish.includes("s.id='kcStartChoiceJs'"),'Startauswahl-JS muss nur einmal nachgeladen werden');
assert(polish.includes("start-choice.css?v=0.20.0-p14"),'P14 muss die Startauswahl-CSS versioniert laden');
assert(polish.includes("start-choice.js?v=0.20.0-p14"),'P14 muss die Startauswahl-JS versioniert laden');
assert(polish.includes('DOMContentLoaded'),'Startauswahl darf erst im stabilen DOM-Bootstrap nachgeladen werden');
assert(index.indexOf('src/ui/app.js')<index.indexOf('src/ui/kc-ux-polish.js'),'UX-Companion muss nach der Haupt-App geladen werden');

assert(start.includes("bodyMode()==='role'&&K.currentUser?.personId&&!replacementRoute()"),'Auto-Start darf nur in authentifizierter Rollenansicht erfolgen');
assert(start.includes("lastBodyMode==='login'&&next==='role'&&!replacementRoute()"),'Login-zu-Rolle Übergang muss geschützt sein');
assert(start.includes("q.get('route')==='replacement'&&!!q.get('request')"),'Replacement-Deep-Link muss Startauswahl umgehen');
assert(start.includes("K.roleUx.afterDataLoaded=function"),'Startauswahl muss an erfolgreichen Datenlade-Hook gekoppelt bleiben');
assert(start.includes("K.state&&(K.state.readOnlyMode=mode==='view')"),'Ansehen-Modus muss readOnly aktivieren');
assert(start.includes("blockedClickSelector")&&start.includes("blockedPointerSelector")&&start.includes("blockedContextSelector"),'Ansehen-Modus muss Schreibinteraktionen sperren');
assert(start.includes("if(mode==='edit'&&!canEdit())"),'Bearbeiten muss Berechtigung prüfen');
assert(start.includes("if(!K.currentUser?.personId||replacementRoute())return"),'Launcher darf ohne angemeldete Person nicht erscheinen');
assert(!start.includes('location.reload();showLauncher'),'Abmeldung darf die Startauswahl nicht direkt erzwingen');
assert(css.length>1000,'Startauswahl-CSS muss vollständig vorhanden sein');

console.log('KC DP2 V0.20 P14 Start Choice Gate PASS');
