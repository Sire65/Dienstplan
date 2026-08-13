import fs from 'node:fs';
const root=new URL('../site/',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const wish=read('src/ui/wish-sprint.js'),push=read('src/adapters/push.js'),notes=read('src/core/notifications.js'),html=read('index.html'),css=read('src/ui/role-ux.css'),provider=read('src/adapters/supabase-provider.js'),integrations=read('src/core/integrations.js'),roleUx=read('src/ui/role-ux.js');
const releaseRoot=new URL('../',root),outside=p=>fs.readFileSync(new URL(p,releaseRoot),'utf8');
const migration=outside('supabase/push_migration.sql'),edge=outside('supabase/functions/kc-dp-push/index.ts'),setup=outside('PUSH_SETUP.md'),manifest=JSON.parse(read('update-manifest.json'));
const checks=[
 ['personalisierte Excel-Datei',wish.includes('personalizedTemplate')&&wish.includes('personId')],
 ['Name und ID im Tabellenkopf',wish.includes("ws.D4")&&wish.includes("ws.H4")],
 ['Filter Tag/Woche/Gesamt',wish.includes("scope==='day'")&&wish.includes("scope==='week'")&&wish.includes("scope==='all'")],
 ['Vor- und Zurücknavigation',wish.includes("move(-1)")&&wish.includes("move(1)")],
 ['mehrere Zeitfenster pro Tag',wish.includes('ws-slots')&&css.includes('.ws-slot')],
 ['Einzelauswahl und Tagesauswahl',wish.includes('data-copywish')&&wish.includes('data-day')],
 ['Zusammenfassung vor Übernahme',wish.includes('Zeitfenster von')&&wish.includes('Eigene vorhandene Angaben bleiben erhalten')],
 ['Dubletten werden übersprungen',wish.includes('skipped++')],
 ['Push registriert serverseitig',push.includes("edge('subscribe'")],
 ['Push löscht serverseitig',push.includes("edge('unsubscribe'")],
 ['Push sendet über Edge Function',push.includes("edge('send'")],
 ['Planänderung löst Push aus',notes.includes('shift_changed')&&notes.includes('K.pushAdapter.send')],
 ['neues UI wird geladen',html.includes('src/ui/wish-sprint.js?v=0.19.22')],
 ['kein VAPID Private Key im Browser',!wish.includes('VAPID_PRIVATE')&&!push.includes('VAPID_PRIVATE')],
 ['Version im Update-Manifest',manifest.version==='0.19.22'],
 ['neue UI im Update-Manifest',manifest.files.some(f=>f.path==='src/ui/wish-sprint.js')],
 ['alle Manifestdateien vorhanden',manifest.files.every(f=>fs.existsSync(new URL(f.path,root)))],
 ['Manifest enthält SHA-256',manifest.files.every(f=>/^[a-f0-9]{64}$/.test(f.sha256))],
 ['Push-Tabelle mit RLS',migration.includes('enable row level security')],
 ['Push-Zugriff nur eigene Geräte',migration.includes('user_id=(select auth.uid())')],
 ['Telefonnummer nicht in Push-Tabelle',!migration.includes('phone')],
 ['Push-Zuordnung enthält Personen-ID',migration.includes('person_id')],
 ['Senderecht rollenbeschränkt',edge.includes("['planner','duty_manager','admin']")],
 ['Edge Function verlangt Anmeldung',edge.includes('Authorization')],
 ['inaktive Geräte ausgeschlossen',edge.includes(".eq('active',true)")],
 ['fehlende VAPID-Secrets werden erkannt',edge.includes('VAPID noch nicht serverseitig konfiguriert')],
 ['VAPID-Anleitung vorhanden',setup.includes('KC_DP_VAPID_PRIVATE_KEY')],
 ['Private Key nur als Secret dokumentiert',setup.includes('Edge Functions → Secrets')],
 ['Supabase Fehlermeldungen deutsch',provider.includes('E-Mail-Adresse oder Passwort ist falsch.')],
 ['Gleiches neues Passwort deutsch',provider.includes('Das neue Passwort muss sich vom bisherigen Passwort unterscheiden.')],
 ['Push-Nutzlast enthält Planversion',notes.includes('data:{version:snapshot.version')],
 ['alte Supabase-Projektkennung wird repariert',integrations.includes('ptblnpiroqftcvlsrhac')&&integrations.includes("const goodRef='iddudrxuihdodnvejxcp'")],
 ['Supabase-Änderungen werden erneut validiert',integrations.includes('K.integrationConfig=normalize(merged)')],
 ['Push-Center ist sichtbar',roleUx.includes('Push-Benachrichtigungen')&&roleUx.includes('uxPushToggle')],
 ['IDX-Status trennt echte Speicherfehler',read('src/ui/app.js').includes("const storageFault=startupStage==='indexeddb-open'||startupStage==='secure-read'")],
 ['IDX öffnet erweitertes Prüfcenter',read('src/ui/app.js').includes('IndexedDB- und Performance-Center')],
 ['Live-Suche gegen Supabase-Autofill geschützt',html.includes('name="kcdp_live_search_v01922"')&&read('src/ui/app.js').includes('clearConfigAutofill')]
];let passed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(ok)passed++}console.log(`ERGEBNIS ${passed}/${checks.length}`);if(passed!==checks.length)process.exitCode=1;
