# KC DP2 – Engineering-, TÜV- und Studio-Regeln

Stand: V0.19.45 Produktionsstand – versionsübergreifend verbindlich

Diese Regeln sind verbindliche Architektur-, Qualitäts- und Freigabekriterien für KC DP2. Ein Release darf eine Regel nur ändern, wenn die Änderung bewusst dokumentiert, getestet und im TÜV-/Studio-Gate nachvollziehbar gemacht wird. Versionsspezifische Alt-Gates dürfen ergänzend bestehen bleiben, ersetzen aber niemals den TÜV des in `release/current.json` bezeichneten kanonischen Releases.

## 1. Release- und Branch-Regeln

1. `main` enthält nur freigegebene, geprüfte Releases.
2. Ein bestehender funktionierender Produktionsstand darf nie durch einen roten oder ungeprüften Stand ersetzt werden.
3. Jede neue Version baut auf dem zuletzt vollständig freigegebenen `main`-Stand auf; alte Releasebäume werden nachträglich nicht verändert.
4. Jeder Releasekandidat benötigt Syntaxprüfung, statischen TÜV-/Studio-Check und die vollständigen End-to-End-Regressionen auf demselben finalen Head.
5. Temporäre Handtest-, Reset-, Bootstrap-, Overlay- oder Diagnosehilfen dürfen nicht unbemerkt Bestandteil eines finalen Releases bleiben.
6. `release/current.json`, Update-Manifest, Cache-Name, sichtbare Versionsangaben und Produktivdeploy müssen auf denselben kanonischen Release zeigen.
7. Manifest-Dateien werden vor Freigabe bytegenau und per SHA-256 versiegelt; Abweichungen sind ROT.
8. Ein Merge erfolgt nur mit fixiertem, vollständig geprüftem Head-SHA. Nach dem Merge muss der Produktiv-Verify erneut erfolgreich sein.

## 2. Supabase- und Security-Regeln

1. KC DP2 verwendet ausschließlich das dedizierte Supabase-Projekt als Runtime-Ziel.
2. Das frühere Academy-Projekt darf nur als kontrollierte Legacy-Migrationskennung vorkommen, niemals als Default-Runtime-Ziel oder Benutzer-Preset.
3. Im Browser sind nur Publishable-/Anon-kompatible Schlüssel zulässig. Secret- und `service_role`-Schlüssel sind im Frontend verboten und müssen aktiv abgewiesen werden.
4. Zugriffsschutz erfolgt über Supabase Auth, RLS und die KC-DP2-Rollen-/Mitgliedschaftslogik. Sicherheitsprüfungen dürfen nicht nur in der Oberfläche liegen.
5. SECURITY-DEFINER-Funktionen dürfen nicht für `anon` oder `authenticated` ausführbar sein, sofern dies nicht ausdrücklich fachlich erforderlich und geprüft ist.
6. Server-only Tabellen dürfen bei aktivem RLS ohne Client-Policy bleiben, wenn `anon` und `authenticated` keine Tabellenrechte besitzen.
7. VAPID Private Keys, Cron-Secrets, Reset-Bearer und vergleichbare Geheimnisse dürfen niemals im Browserpaket, in Logs für Anwender oder in Dokumentation ausgegeben werden.
8. Auth-Sessions werden nicht durch einen lokalen pauschalen Kurzzeit-Timer beendet. Supabase-Sitzungen nutzen die vorgesehene Token-/Refresh-Logik.
9. Fehlerdiagnosen dürfen keine Passwörter, Tokens, Authorization-Header oder vergleichbare Geheimnisse persistieren; Redaction ist Pflicht.

## 3. Datenquellen- und Stammdatenregeln

1. PC Manager / KC Core ist die führende Quelle für Personen und freigegebene Kontextdaten.
2. `personId` ist die stabile technische Identität. Anzeigenamen dürfen nie als Primärschlüssel verwendet werden.
3. Führende Manager-/Core-Daten werden atomar übernommen. Ein unvollständiger Snapshot darf den bestehenden Dienstplan weder leeren noch teilweise überschreiben.
4. Jede bereits im Dienstplan referenzierte `personId` muss vor einer Stammdatenumschaltung weiterhin vorhanden sein.
5. Auto-Sync respektiert den Benutzerschalter und das Recht `roster.people.sync`.
6. Herkunft und Zustand der Datenquelle müssen diagnostizierbar sein: führend, gemischt oder lokaler Fallback.

## 4. Planungsregeln

1. Harte Regeln werden vor weicher Optimierung geprüft.
2. Harte Regeln umfassen insbesondere Verfügbarkeit, Krankheit/Abwesenheit, Qualifikation, Sperrtage, Aushilfen-Zeitmatrix, zulässige Einsatzfenster, Stundenlimits, Ruhezeit und sonstige explizite Ausschlüsse.
3. Weiche Optimierung umfasst Wünsche, bevorzugte Bereiche, Fairness, zusammenhängende Dienste und ähnliche Qualitätskriterien.
4. Wetter und Programm dürfen den Besetzungsbedarf beeinflussen, aber keine harte Personenregel außer Kraft setzen.
5. Pausenregeln und daraus entstehende Deckungslücken sind Teil der Planvalidierung.
6. KI-Plan, Quick-Plan und Ersatz-/Lückensuche verwenden denselben zentralen Regel- und Bewertungskern.
7. Bereitschaft darf als transparenter Ersatz-Sonderbonus berücksichtigt werden, aber keine harte Sperre überstimmen.
8. Ein KI-Vorschlag wird unmittelbar vor der tatsächlichen Übernahme erneut fachlich validiert. Ein ungültiger Vorschlag darf nicht in den Sollplan übernommen werden.

## 5. Tagesauswahl „Alle“ / „Verfügbar“

1. Das bestehende `＋` zeigt alle aktiven Mitarbeiter und Aushilfen.
2. Der zusätzliche Button links daneben zeigt nur Personen, die am aktuell angezeigten Tag mindestens ein zulässiges Einsatzfenster besitzen.
3. Krank/abwesend, ganztägig nicht verfügbar, vollständig gesperrt oder Aushilfen ohne Tages-Zeitfenster werden ausgeblendet.
4. Teilweise nicht verfügbare Personen bleiben sichtbar, wenn außerhalb der Sperrzeit noch ein zulässiges Einsatzfenster besteht.
5. Bei jedem Tageswechsel wird die Filterliste neu berechnet; es gibt keinen übernommenen Filterzustand des Vortags.

## 6. Rollen- und Bedienregeln

1. Mitarbeiter dürfen veröffentlichte Pläne sehen und eigene Wünsche im erlaubten Umfang bearbeiten, aber keinen Sollplan administrieren.
2. Planer dürfen Sollpläne bearbeiten und veröffentlichen.
3. Dienstverantwortliche dürfen im vorgesehenen Umfang planen, aber nicht automatisch veröffentlichen.
4. Zeitprüfer bearbeiten Ist-/Zeitdaten, nicht den Sollplan.
5. Read-only Rollen erhalten keinen Bearbeiten-Einstieg und keine versteckten Schreibpfade über Pointer, Tastatur oder Kontextmenü.
6. Admin-Rechte bleiben explizit und dürfen nicht aus UI-Sichtbarkeit abgeleitet werden.
7. Smartphone-, Tablet- und Desktop-Bedienung dürfen sich funktional nicht widersprechen.
8. Technische Diagnoseanzeigen werden rollenabhängig dargestellt; normale Mitglieder erhalten verständliche Benutzertexte statt interner Kürzel.
9. Köcheclub-Design darf fachliche Signalfarben für Besetzung, Fehler und Warnungen nicht verfälschen.

## 7. Offline-, PWA- und Update-Regeln

1. IndexedDB bleibt verschlüsselte lokale Arbeitsbasis.
2. Release-Dateien werden über Manifest, Hash/Byte-Prüfung und Service-Worker-Updatepfad kontrolliert.
3. Kritische Hotfix-Dateien können per `forceRefresh` gezielt aus einem alten PWA-Cache heraus aktualisiert werden.
4. Updateprüfungen müssen veraltete HTTP-Caches umgehen.
5. Boot-Bestätigung und Rollback-Schutz dürfen nicht entfernt werden, ohne einen gleichwertigen Mechanismus zu ersetzen.
6. Offline benötigte Runtime-Dateien müssen im kanonischen Manifest enthalten sein.
7. Update, Installation und erster Start dürfen keine bestehende freigegebene lokale Planung zerstören.

## 8. Push-Regeln

1. Push-Abonnements sind benutzer-/gerätebezogen und müssen bei VAPID-Wechsel sicher reconciled werden.
2. Reconcile darf nicht ungefragt die Browser-Berechtigung anfordern; eine neue Permission-Anfrage gehört in einen bewussten Benutzer-Subscribe-Pfad.
3. Zeitgesteuerte Push-Läufe müssen idempotent sein und Doppelversand verhindern.
4. Temporäre Push-Tests müssen zeitlich begrenzt und nach Abnahme entfernbar sein.
5. Push-Erfolg gilt erst als End-to-End bestätigt, wenn Serverzustellung und Realgerät geprüft sind.
6. Push-Center-Massenversand ist auf berechtigte Rollen beschränkt und benötigt vor Versand eine eindeutige Empfänger-/Inhaltsbestätigung.
7. Versandstatus `gesendet`, `angezeigt`, `geöffnet`, `verworfen/Fehler` muss technisch nachvollziehbar bleiben.

## 9. Diagnose-, TableCore- und Fehlerprotokoll-Regeln

1. Technische Fehler werden datensparsam erfasst, redigiert und über Fingerprints dedupliziert.
2. Offline entstandene Diagnoseereignisse dürfen gepuffert und später übertragen werden.
3. Das Admin-Fehlerprotokoll verwendet den freigegebenen Master-TableCore bzw. einen dünnen kompatiblen Adapter; keine parallele Tabellenarchitektur.
4. Häufigkeit, erstes/letztes Auftreten, Version, technische Plattform, Schweregrad und Bearbeitungsstatus müssen auswertbar sein.
5. Archivieren/Löschen benötigt bewusste Adminaktion; Mehrfachaktionen dürfen keine fremden oder ungeprüften Datensätze versehentlich verändern.
6. Normale Mitglieder dürfen die zentrale Fehlerdatenbank nicht direkt lesen.

## 10. Pflicht-Regression vor Freigabe

Mindestens folgende Prüfungen müssen auf dem finalen Release-Head erfolgreich sein:

- TÜV Studio: Releaseintegrität, Security, Architektur und Regeln
- Manifest/Bytes/SHA-256 sowie `release/current.json`
- Manager/Core Leading Source und Vollständigkeitsschutz
- Manager Auto-Sync inklusive Rechte-/Fehlerfälle
- Planner Engine und gemeinsame Recommendations
- Ersatz-/Lückensuche
- Tagesverfügbarkeitsfilter inklusive Tageswechsel
- KI-Audit und Apply-Guard
- Datenquellenstatus
- Smartphone Smoke Test und Responsive-/Touch-Prüfung
- Wunsch → Soll → Ist
- Rollen/Berechtigungen und Read-only Guards
- Dokumente / PDF / E-Mail
- Foto-Pipeline
- Push-Center und Push-Receipts
- Diagnostics/TableCore
- Offline/PWA/Update/Rollback
- Supabase Auth/RLS/Sync
- Realgeräte-Push bei Push-relevanten Releases

## 11. Freigabestatus

- **GRÜN:** alle verpflichtenden Gates bestanden; keine offenen Release-Blocker.
- **GELB:** nicht-blockierende Hinweise/Optimierungen sind dokumentiert; Funktion und Sicherheit sind nicht beeinträchtigt.
- **ROT:** Sicherheits-, Datenintegritäts-, Release-, Rollen-, Sync- oder Kernfunktionsfehler. Kein Merge und kein Produktivdeploy.
