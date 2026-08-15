const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','release','v0.19.45','site');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),css=read('src/ui/kc-ux-polish.css'),js=read('src/ui/kc-ux-polish.js'),loader=read('src/ui/source-health-ui.js'),mobile=read('src/ui/mobile-day.css'),mobileJs=read('src/ui/mobile-day.js');
function must(cond,msg){if(!cond)throw new Error(msg)}
must(/<title>KC DP2 V0\.19\.45<\/title>/.test(html),'HTML-Titel nicht V0.19.45');
must(/KC DP2 V0\.19\.45 – Dienstplanung bereit\./.test(html),'Startmeldung nicht V0.19.45');
must(!/KC DP V0\.17\.10 – kompakte Plansteuerung bereit\./.test(html),'Alte sichtbare Versionsmeldung vorhanden');
must(/--kc-bordeaux:#7a1420/.test(css)&&/--kc-gold:#bd8d33/.test(css),'KC Bordeaux/Gold Design fehlt');
must(/\.matrix-cell\.good|matrix/.test(css),'Planmatrix-Styles nicht berücksichtigt');
must(/kc-tech-simple/.test(js)&&/Daten gespeichert/.test(js),'Vereinfachter Speicherstatus fehlt');
must(/new Set\(\['admin'\]\)/.test(js),'Admin-Technikrolle fehlt');
must(/Mitglied oder Dienst suchen/.test(js),'Verständliche Suche fehlt');
must(/kc-ux-polish\.css\?v=0\.19\.45/.test(loader)&&/kc-ux-polish\.js\?v=0\.19\.45/.test(loader),'UX-Polish Loader fehlt');
must(/--name-w:78px/.test(mobile),'Schmale Handy-Namenspalte fehlt');
must(/Liste/.test(mobileJs)&&/Balken/.test(mobileJs),'Handy Liste/Balken Umschaltung fehlt');
must(/48px/.test(mobile),'Handy Touch-Navigation nicht ausreichend');
console.log('KC DP2 V0.19.45 UX Polish Gate: PASS');
