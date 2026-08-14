# KC DP2 – Engineering-, TÜV- und Studio-Regeln

Stand: V0.19.42 Entwicklungszweig

Diese Regeln sind verbindliche Architektur- und Freigabekriterien für KC DP2. Ein Release darf eine Regel nur ändern, wenn die Änderung bewusst dokumentiert, getestet und im TÜV-/Studio-Gate nachvollziehbar gemacht wird.

## 1. Release- und Branch-Regeln

1. `main` enthält nur freigegebene, geprüfte Releases.
2. Ein bestehender funktionierender Produktionsstand darf nie durch einen roten oder ungeprüften Stand ersetzt werden.
3. V0.19.42 baut auf dem vollständig abgenommenen V0.19.41-Stand auf. Solange V0.19.41 im Realgeräte-Test ist, bleibt V0.19.42 ein gestapelter Draft.
4. Jeder Releasekandidat benötigt Syntaxprüfung, statischen TÜV-/Studio-Check und die vollständigen End-to-End-Regressionen.
5. Temporäre Handtest-, Reset-, Bootstrap- oder Diagnosehilfen dürfen nicht unbemerkt Bestandteil eines finalen Releases bleiben.
6. `release/current.json` wird erst nach abgeschlossener Freigabe auf die neue Version gesetzt.

## 2. Supabase- und Security-Regeln

1. KC DP2 verwendet ausschließlich das dedizierte Supabase-Projekt als Runtime-Ziel.
2. Das frühere Academy-Projekt darf nur als kontrollierte Legacy-Migrationskennung vorkommen, niemals als Default-Runtime-Ziel oder Benutzer-Preset.
3. Im Browser sind nur Publishable-/Anon-kompatible Schlüssel zulässig. Secret- und `service_role`-Schlüssel sind im Frontend verboten und müssen aktiv abgewiesen werden.
4. Zugriffsschutz erfolgt über Supabase Auth, RLS und die KC-DP2-Rollen-/Mitgliedschaftslogik. Sicherheitsprüfungen dürfen nicht nur in der Oberfläche liegen.
5. SECURITY-DEFINER-Funktionen dürfen nicht für `anon` oder `authenticated` ausführbar sein, sofern dies nicht ausdrücklich fachlich erforderlich und geprüft ist.
6. Server-only Tabellen dürfen bei aktivem RLS ohne Client-Policy bleiben, wenn `anon` und `authenticated` keine Tabellenrechte besitzen.
7. VAPID Private Keys, Cron-Secrets, Reset-Bearer und vergleichbare Geheimnisse dürfen niemals im Browserpaket, in Logs für Anwender oder in Dokumentation ausgegeben werden.
8. Auth-Sessions werden nicht durch einen lokalen pauschalen 10-Minuten-Timer beendet. Supabase-Sitzungen nutzen die vorgesehene Token-/Refresh-Logik.

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
5. Read-only Rollen erhalten keinen Bearbeiten-Einstieg.
6. Admin-Rechte bleiben explizit und dürfen nicht aus UI-Sichtbarkeit abgeleitet werden.
7. Smartphone-, Tablet- und Desktop-Bedienung dürfen sich funktional nicht widersprechen.

## 7. Offline-, PWA- und Update-Regeln

1. IndexedDB bleibt verschlüsselte lokale Arbeitsbasis.
2. Release-Dateien werden über Manifest, Hash/Byte-Prüfung und Service-Worker-Updatepfad kontrolliert.
3. Kritische Hotfix-Dateien können per `forceRefresh` gezielt aus einem alten PWA-Cache heraus aktualisiert werden.
4. Updateprüfungen müssen veraltete HTTP-Caches umgehen.
5. Boot-Bestätigung und Rollback-Schutz dürfen nicht entfernt werden, ohne einen gleichwertigen Mechanismus zu ersetzen.

## 8. Push-Regeln

1. Push-Abonnements sind benutzer-/gerätebezogen und müssen bei VAPID-Wechsel sicher reconciled werden.
2. Reconcile darf nicht ungefragt die Browser-Berechtigung anfordern; eine neue Permission-Anfrage gehört in einen bewussten Benutzer-Subscribe-Pfad.
3. Zeitgesteuerte Push-Läufe müssen idempotent sein und Doppelversand verhindern.
4. Temporäre Push-Tests müssen zeitlich begrenzt und nach Abnahme entfernbar sein.
5. Push-Erfolg gilt erst als End-to-End bestätigt, wenn Serverzustellung und Realgerät geprüft sind.

## 9. Pflicht-Regression vor Freigabe

Mindestens folgende Prüfungen müssen auf dem finalen Release-Head erfolgreich sein:

- TÜV Studio: Releaseintegrität, Security, Architektur und Regeln
- Manager/Core Leading Source und Vollständigkeitsschutz
- Manager Auto-Sync inklusive Rechte-/Fehlerfälle
- Planner Engine und gemeinsame Recommendations
- Ersatz-/Lückensuche
- Tagesverfügbarkeitsfilter inklusive Tageswechsel
- KI-Audit und Apply-Guard
- Datenquellenstatus
- Smartphone Smoke Test
- Wunsch → Soll → Ist
- Rollen/Berechtigungen
- Dokumente / PDF / E-Mail
- Foto-Pipeline
- Supabase Auth/RLS/Sync
- Realgeräte-Push bei Push-relevanten Releases

## 10. Freigabestatus

- **GRÜN:** alle verpflichtenden Gates bestanden; keine offenen Release-Blocker.
- **GELB:** nicht-blockierende Hinweise/Optimierungen sind dokumentiert; Funktion und Sicherheit sind nicht beeinträchtigt.
- **ROT:** Sicherheits-, Datenintegritäts-, Release-, Rollen-, Sync- oder Kernfunktionsfehler. Kein Merge und kein Produktivdeploy.
