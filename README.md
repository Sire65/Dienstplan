# KC DP2 – Köcheclub Werne

Produktions-Repository für **KC DP2**, den Dienstplan des Köcheclub Werne.

- Freigegebener Web-Release: **V0.19.51**
- Ziel: Tablet-/Browserbetrieb als PWA über GitHub Pages
- Backend/Auth/Synchronisation: Supabase/KC Sync
- Sicherheitsstand: AES-256-GCM, PBKDF2-SHA-256, keine Secret-/service_role-Schlüssel im Browser

## Veröffentlichungsregel

GitHub Pages wird nur aktualisiert, wenn der Workflow die Runtime-Dateien anhand Größe und SHA-256 bestätigt. Schlägt eine Prüfung fehl, wird die bisherige veröffentlichte Version nicht ersetzt.

V0.19.51 ist der aktuell verifizierte Produktionsstand. Er umfasst die Produktionsreife-Härtung mit Supabase-Heartbeat/Reconnect, getrennter Diagnosehistorie, abgesicherter Alt-Excel-Migration, Least-Privilege-Härtung sowie Deep-Regression/TÜV und externen Sicherheitsprüfungen. Fachlogik, Sync-Verträge und Verschlüsselung bleiben geschützt.

Erstellt und Designed by: Hans-Joachim Koch
