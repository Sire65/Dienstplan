# KC DP2 V0.19.51 – Main-/Live-Abnahme

Stand: 19.08.2026

Ergebnis: **GRÜN**

Geprüfter Main-Abnahmestand: `f08e28e5ed615f35c0ccef9504a2e3e5b64c3bb6`
Produktions-Readiness-Merge: `cf81f75b025954b083d5b66fc530ca356a6080ec`

## Bestanden

- TÜV / Manifest-Dateigrößen / SHA-256 / Runtime-Summe
- Security-, Architektur-, Versions- und Engineering-Regeln
- komplette Deep-Consolidation einschließlich Manager, Planer und Rollen
- Supabase Start-Heartbeat / Reconnect Regression
- Diagnose: Offen / Historie / Tests getrennt
- Alt-Excel-Migration: Personen-Zuordnung, Plausibilität, Dubletten- und Wiederimport-Schutz
- Mobile 390 × 844
- Wunsch / Soll / Freigabe / Ist
- Dokument / PDF / E-Mail-Export
- Planfoto-Pipeline
- Pilot-/Installationsregressionen
- GitHub Pages live: KC DP2 V0.19.51 ausgeliefert
- GitHub Pages live: `monitor3`, `history4` und Excel-Migrationsmodul ausgeliefert
- GitHub Pages live: aktuelles V0.19.51-Update-Manifest ausgeliefert
- externe statische Sicherheitsprüfung: GitHub CodeQL **GRÜN**
- externe statische Sicherheitsprüfung: Semgrep **GRÜN**

## Supabase-Härtung

Die Browserrolle `authenticated` besitzt auf den betroffenen DP2-Tabellen keine unnötigen `TRUNCATE`, `TRIGGER` oder `REFERENCES`-Rechte mehr. Direkte Browser-Schreibrechte auf Push-Delivery-Zustände wurden entfernt. Die Änderung ist als Migration dokumentiert:

`supabase/migrations/20260819214000_harden_kc_dp_authenticated_table_privileges.sql`

## Excel-Übergang

Bereits ausgefüllte alte Wunschlisten werden über den Admin-Migrationsbereich kontrolliert übernommen. Vor dem Schreiben werden Person, Zeitraum, Zeitangaben und Dubletten geprüft. Identische Dateien werden über SHA-256-Fingerprint vor einem zweiten Import geschützt.

## Freigabehinweis

Der Software-/Server-/Live-Webstand ist technisch für die Präsentation und den vorbereiteten Echtbetrieb freigegeben. Vor dem produktiven Start mit Mitgliedsdaten bleibt als Praxispunkt die reale Benutzer-/Geräteprobe auf den tatsächlich verwendeten Endgeräten sowie die kontrollierte Übernahme der eingesammelten Excel-Wunschlisten.
