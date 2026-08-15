const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','release','v0.19.44','site');
const js=fs.readFileSync(path.join(root,'src','ui','push-center.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src','ui','push-center.css'),'utf8');
const source=fs.readFileSync(path.join(root,'src','ui','source-health-ui.js'),'utf8');
function must(re,msg){if(!re.test(js))throw new Error(msg)}
function mustSource(re,msg){if(!re.test(source))throw new Error(msg)}
must(/ADMIN_ROLES=new Set\(\['planner','duty_manager','admin'\]\)/,'Privilegierte Rollen fehlen');
must(/update:\{label:'Neues Update'/,'Update-Vorlage fehlt');
must(/install:\{label:'Bitte installieren'/,'Installations-Vorlage fehlt');
must(/info:\{label:'Information'/,'Info-Vorlage fehlt');
must(/warning:\{label:'Achtung'/,'Warnungs-Vorlage fehlt');
must(/plan:\{label:'Dienstplan geändert'/,'Dienstplan-Vorlage fehlt');
must(/option value="all">Alle aktiven Personen/,'Alle-Empfänger fehlt');
must(/option value="selected">Personen auswählen/,'Einzelauswahl fehlt');
must(/confirm\(`Push wirklich senden\?/,'Bestätigung vor Versand fehlt');
must(/K\.pushAdapter\.sendMany\(payload,recipients\)/,'Geschützter sendMany-Pfad fehlt');
must(/deliveryStatus\(\)/,'Statusauswertung fehlt');
must(/displayed_at/,'Anzeige-Receipt-Auswertung fehlt');
must(/opened_at/,'Öffnungs-Receipt-Auswertung fehlt');
must(/new URLSearchParams\(location\.search\)/,'URL-Parameter-Auswertung fehlt');
must(/get\('install'\)==='1'/,'Install-Deep-Link fehlt');
must(/beforeinstallprompt/,'PWA Installationsdialog fehlt');
must(/appinstalled/,'Installationsabschluss fehlt');
mustSource(/push-center\.js/,'Push-Center Loader fehlt');
mustSource(/push-center\.css/,'Push-Center CSS Loader fehlt');
if(!/kc-push-center/.test(css)||!/kc-install-overlay/.test(css))throw new Error('Push-Center CSS unvollständig');
console.log('KC DP2 V0.19.44 Push Center Gate: PASS');
