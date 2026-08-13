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
 ['neues UI wird geladen',html.includes('src/ui/wish-sprint.js?v=0.19.33')],
 ['kein VAPID Private Key im Browser',!wish.includes('VAPID_PRIVATE')&&!push.includes('VAPID_PRIVATE')],
 ['Version im Update-Manifest',manifest.version==='0.19.33'],
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
 ['IDX-Status trennt echte Speicherfehler',read('src/ui/app.js').includes("const connectionFault=startupStage==='indexeddb-open'")&&!read('src/ui/app.js').includes("startupStage==='secure-read';if(storageFault")],
 ['IDX führt automatischen verschlüsselten Selbsttest aus',read('src/ui/app.js').includes("await K.storage.test();setIdbStatus(true,'Automatischer verschlüsselter IndexedDB-Test erfolgreich'")],
 ['Erfolgreiches Speichern setzt IDX grün',read('src/ui/app.js').includes("setIdbStatus(true,'Änderung verschlüsselt in IndexedDB gespeichert'")],
 ['IDX öffnet erweitertes Prüfcenter',read('src/ui/app.js').includes('IndexedDB- und Performance-Center')],
 ['Live-Suche gegen Supabase-Autofill geschützt',html.includes('name="kcdp_live_search_v01923"')&&read('src/ui/app.js').includes('clearConfigAutofill')],
 ['Z getrennt von Standbesetzung',read('src/core/planning.js').includes('const special=allActive.filter(K.isSpecialShift)')&&read('src/core/planning.js').includes('const active=allActive.filter(s=>!K.isSpecialShift(s))')],
 ['persönlicher Z-Standard vorhanden',read('src/core/staffing.js').includes('preferredZone:null')&&read('src/ui/app.js').includes('Standard-Dienstklasse')&&read('src/ui/app.js').includes('Vorbereitung zuhause')],
 ['Ausgang speichert und meldet sicher ab',read('src/ui/app.js').includes('KC DP2 sicher verlassen')&&read('src/ui/app.js').includes('await persist();await K.memberAccess?.signOut?.()')],
 ['Vor- und Nachbereitung gestrichelt',read('src/ui/app.css').includes('.date-chip.day-prep')&&read('src/ui/role-ux.css').includes('.ux-calendar-day.day-prep')],
 ['Wochenenden farblich getrennt',read('src/ui/app.css').includes('.date-chip.day-saturday')&&read('src/ui/role-ux.css').includes('.ux-calendar-day.day-sunday')],
 ['Supabase-Sitzung wird vor Test erneuert',read('src/adapters/sync.js').includes('await K.supabaseConnection?.ensureSession?.()')&&read('src/adapters/sync.js').includes('await requireTransport()')]
 ,['Outbox wird sofort verschlüsselt gesichert',read('src/adapters/sync.js').includes("K.storage.putMany([['syncOutbox',snapshot]")&&read('src/adapters/sync.js').includes('persistQueue().catch')]
 ,['fehlgeschlagene Syncs bleiben ausstehend',read('src/adapters/sync.js').includes("op.status='pending'")&&read('src/adapters/sync.js').includes('op.nextAttemptAt=KCSecureSync.nextRetry')]
 ,['Speichern wartet auf dauerhafte Outbox',read('src/ui/app.js').includes('await K.sync?.whenDurable?.()')]
 ,['IndexedDB-Start hat Blockadeerkennung',read('src/adapters/storage.js').includes('andere geöffnete KC-DP-Tabs schließen')&&read('src/adapters/storage.js').includes('12000')]
 ,['Ladeanzeige schließt auch bei Fehler',read('src/ui/app.js').includes('loadTask?.error?.(e.message)')]
 ,['Schnellplaner neben Prüfen',html.includes('id="quickPlanBtn"')&&html.indexOf('id="quickPlanBtn"')>html.indexOf('id="checkBtn"')]
 ,['Schnellplaner bleibt sichtbar',read('src/ui/app.css').includes('.quick-plan-trigger{display:inline-flex!important')]
 ,['Plus direkt an Planprüfung',read('src/ui/app.js').includes('data-inspector-add')&&read('src/ui/app.js').includes("b.onclick=openQuickPlan")]
 ,['Besetzungsmatrix zeigt Uhrzeiten',read('src/ui/app.js').includes('matrix-time-row')&&read('src/ui/app.js').includes('matrix-time-cell')&&read('src/ui/app.js').includes('UHRZEIT')]
 ,['Mitarbeiterleiste mit Suche',read('src/ui/app.js').includes('quickPlanDrawer')&&read('src/ui/app.js').includes('quickPlanSearch')]
 ,['Antippen und Rasterziehen',read('src/ui/app.js').includes('quickPlanPointerDown')&&read('src/ui/app.js').includes('Auswählen & Zeit ziehen')]
 ,['Rasterziehen legt Dienst sofort an',read('src/ui/app.js').includes("reason:'Schnellplanung im Zeitraster'")&&read('src/ui/app.js').includes('await persist()')]
 ,['Rasterziehen funktioniert zeilenunabhängig',read('src/ui/app.js').includes('targetCell=document.querySelector')&&!read('src/ui/app.js').includes('if(cell.dataset.timelinePerson!==quickPlanPersonId)return')]
 ,['Reservezeit wird beim Ziehen berücksichtigt',read('src/ui/app.js').includes('d=day(),de=displayEnd(d),step=K.state.step/60')]
 ,['Goldvorschau ist eindeutig beschriftet',read('src/ui/app.js').includes('wird angelegt')&&read('src/ui/app.css').includes('background:#e8b640!important')]
 ,['Gleichlanges Verschieben bleibt trotz Altüberschreitung erlaubt',read('src/core/staffing.js').includes('dayHours>oldDayHours+1e-9')&&read('src/core/staffing.js').includes('eventTotal>oldEventTotal+1e-9')]
 ,['Höchstzeitmeldung erklärt Wert und Lösung',read('src/core/staffing.js').includes('Persönliche Höchstzeit an diesem Tag: maximal')&&read('src/core/staffing.js').includes('Bitte den Balken verkürzen oder einen anderen Dienst dieses Tages anpassen.')]
 ,['Doppelklick öffnet Dienstdetails',read('src/ui/app.js').includes("el.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();openShiftEditor")]
 ,['Doppelklick auf Namen öffnet Personendetails',read('src/ui/app.js').includes("openPersonalOverview(el.dataset.person)")]
 ,['Klick wird nicht als Ziehen behandelt',read('src/ui/app.js').includes('Math.hypot(dx,dy)<6')&&read('src/ui/app.js').includes('if(!dragging)return')]
 ,['Zielzeile zeigt gültige oder ungültige Ablage',read('src/ui/app.js').includes("blocked?'drop-invalid':'drop-valid'")&&read('src/ui/app.css').includes('.drop-target.drop-valid')&&read('src/ui/app.css').includes('.drop-target.drop-invalid')]
 ,['Ablehnung nennt Zielperson und Grund',read('src/ui/app.js').includes('Ablegen bei ${target} nicht möglich: ${error.text}')]
 ,['Personenwechsel prüft Zielregeln neu',read('src/core/staffing.js').includes('sameOwner=existing&&existing.personId===candidate.personId')]
 ,['Schnellplanung als Alternative',read('src/ui/app.js').includes('Mit Von/Bis einplanen')&&read('src/ui/app.js').includes('quickPlanCandidate')]
 ,['Wunschstatus und Stunden sichtbar',read('src/ui/app.js').includes('quickPlanStatus')&&read('src/ui/app.js').includes("hours.toFixed(1)")]
 ,['Z-Erkennung bereinigt Altdaten',read('src/core/planning.js').includes('K.isSpecialShift')&&read('src/core/auth.js').includes('normalizeShiftClassification')]
 ,['Z aus Stand V H ausgeschlossen',read('src/core/planning.js').includes('const active=allActive.filter(s=>!K.isSpecialShift(s))')]
 ,['Z-Matrix mit Stunde',read('src/ui/app.js').includes("kind==='special'?`<small>${fmtTime(x.h).slice(0,2)}h</small>")]
 ,['Entwicklerzugang nach fünf Logoklicks',roleUx.includes('DEV_FAST_ACCESS')&&roleUx.includes('clicks:5')&&roleUx.includes('uxLoginChefLogo')]
 ,['kein Adminpasswort im Schnellzugang',!roleUx.includes('DEV_ADMIN_PASSWORD')&&!roleUx.includes('adminPassword')]
 ,['Schnellzugang nutzt echte Supabase-Prüfung',roleUx.includes('sendFirstAccessCode')&&roleUx.includes('verifyFirstAccessCode')]
 ,['Adminrolle wird nach Code geprüft',roleUx.includes("K.currentUser?.role!=='admin'")]
 ,['Entwicklerzugang zentral abschaltbar',roleUx.includes('DEV_FAST_ACCESS.enabled')]
];let passed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(ok)passed++}console.log(`ERGEBNIS ${passed}/${checks.length}`);if(passed!==checks.length)process.exitCode=1;
