# KC DP2 V0.19.51 – Produktions- und Präsentationsfreigabe

Stand: 19.08.2026

## Freigabeprinzip

Dieser Stand darf erst nach vollständiger grüner Gegenprüfung in `main` übernommen werden. Einzelne erfolgreiche Tests ersetzen keine Gesamtfreigabe.

## Pflichtprüfungen

- kanonischer Release- und Versionsstand V0.19.51
- Manifest: Dateigröße, SHA-256 und Runtime-Summe für jede ausgelieferte Datei
- PWA-/Service-Worker-Update, Force-Refresh, Cache und Rollback
- Supabase Start-Healthcheck, Heartbeat, Reconnect, Offline-/Online-Wechsel und Session-Refresh
- RLS, Rollen, Grants, SECURITY DEFINER und Least Privilege
- IndexedDB, Verschlüsselung, Offline-Fortsetzung und Sync-Warteschlange
- Wunsch / Soll / Freigabe / Ist und zentrale Planungsregeln
- Rollen- und Nur-Lese-Sperren
- Smartphone 390x844 und Tablet-/Desktop-Praxisregression
- Push, Pilot-Onboarding und Installationshistorie
- Dokumente, PDF, Druck, E-Mail-Export und Planfoto
- Zentrale Fehlerdiagnose: Offen / Historie / Tests getrennt
- Alt-Excel-Migration: Personen-Zuordnung, Vorschau, Plausibilität, Dubletten- und Wiederimport-Schutz
- unabhängige statische Prüfung durch GitHub CodeQL und Semgrep

## Alt-Excel-Migration

Bereits ausgefüllte Wunschlisten werden nicht direkt in den Dienstplan geschrieben. Die Migration arbeitet in der Reihenfolge:

1. Datei lesen und Identität aus Name / KC-Person-ID / E-Mail bestimmen.
2. Bei alten Dateien ohne eindeutige ID muss ein Administrator das Mitglied bewusst zuordnen.
3. Zeitangaben mit den bestehenden KC-DP-Regeln normalisieren und prüfen.
4. Vorhandene Datensätze und Dubletten innerhalb derselben Datei erkennen.
5. Identische Dateien per SHA-256-Fingerprint gegen erneuten Import sperren.
6. Neue Angaben in einer Vorschau kontrollierbar anzeigen.
7. Erst nach Bestätigung als bestätigte Wunschdaten übernehmen und den Import protokollieren.

## Supabase-Härtung

Live angewendet und als Migration dokumentiert:

- Browserrolle `authenticated` besitzt auf den betroffenen DP2-Tabellen keine unnötigen `TRUNCATE`, `TRIGGER` oder `REFERENCES`-Rechte mehr.
- Direkte Schreibrechte auf Push-Delivery-Daten wurden entfernt; Zustandsänderungen erfolgen serverseitig bzw. über die vorgesehene Receipt-RPC.
- Nicht benötigte direkte DELETE-Rechte wurden entfernt.
- RLS bleibt auf den DP2-Tabellen aktiv; die zusätzliche `kc_dp_permanent_users_only`-Policy wurde gegengeprüft und ist RESTRICTIVE, nicht permissiv.

Migration: `supabase/migrations/20260819214000_harden_kc_dp_authenticated_table_privileges.sql`

## Ampel für Freigabe

- **GRÜN:** alle Pflichtprüfungen und externe Scanner bestanden, PR konfliktfrei, anschließender Main-/Live-Test bestanden.
- **GELB:** technisch lauffähig, aber mindestens eine Prüfung ausstehend oder fachlich nicht geklärt. Kein Echtbetrieb.
- **ROT:** Regression, Sicherheitsfund, Manifest-/PWA-Integritätsfehler, Rollen-/RLS-Fehler oder Datenmigrationsfehler. Kein Merge, kein Echtbetrieb.
