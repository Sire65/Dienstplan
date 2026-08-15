const fs=require('fs');
const push=fs.readFileSync('release/v0.19.42/site/src/ui/push-center.js','utf8');
const loader=fs.readFileSync('release/v0.19.42/site/src/ui/source-health-ui.js','utf8');
const css=fs.readFileSync('release/v0.19.42/site/src/ui/push-center.css','utf8');
function ok(cond,msg){if(!cond)throw new Error('PUSH CENTER GATE: '+msg);console.log('PASS',msg)}
ok(push.includes("new Set(['planner','duty_manager','admin'])"),'Admin/Planer/Dienstleitung geschützt');
ok(push.includes("update:{label:'Neues Update'")&&push.includes("install:{label:'Bitte installieren'")&&push.includes("warning:{label:'Achtung'")&&push.includes("plan:{label:'Dienstplan geändert'"),'Vorlagen vorhanden');
ok(push.includes('<option value="all">Alle aktiven Personen</option>')&&push.includes('<option value="selected">Personen auswählen</option>'),'Alle oder Einzelpersonen wählbar');
ok(push.includes('data-push-person')&&push.includes('K.pushAdapter.sendMany'),'Mehrfachauswahl wird über geschützten Push-Adapter gesendet');
ok(push.includes('confirm(`Push wirklich senden?'),'Explizite Versandbestätigung vor Massen-Push');
ok(push.includes("q.get('route')==='install'")&&push.includes('beforeinstallprompt')&&push.includes('appinstalled'),'Installations-Push und PWA-Installationspfad vorhanden');
ok(!push.includes('kcPushOnlySubscribed'),'Kein wirkungsloser Subscription-Filter sichtbar');
ok(loader.includes('push-center.js?v=0.19.43')&&loader.includes('push-center.css?v=0.19.43'),'Push-Center wird aus bestehendem UI sicher geladen');
ok(css.includes('@media(max-width:760px)'),'Smartphone-Layout vorhanden');
console.log('KC DP2 V0.19.43 Push Center: PASS');
