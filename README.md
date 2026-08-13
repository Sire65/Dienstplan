# KC DP2 – Köcheclub Werne

Produktions-Repository für **KC DP2**, den Dienstplan des Köcheclub Werne.

- Freigegebener Web-Release: **V0.19.18**
- Ziel: Tablet-/Browserbetrieb als PWA über GitHub Pages
- Backend/Auth/Synchronisation: Supabase/KC Sync
- Sicherheitsstand: AES-256-GCM, PBKDF2-SHA-256, keine Secret-/service_role-Schlüssel im Browser

## Veröffentlichungsregel

GitHub Pages wird nur aktualisiert, wenn der Workflow alle 58 Runtime-Dateien anhand Größe und SHA-256 bestätigt. Schlägt eine Prüfung fehl, wird die bisherige veröffentlichte Version nicht ersetzt.

V0.19.18 enthält deutsche Loginmeldungen, die korrigierte Anmeldegrafik und eine getrennte Messung von Benutzerwartezeit und technischer Anmeldung. Fachlogik, Sync-Verträge und Verschlüsselung bleiben unverändert.

Erstellt und Designed by: Hans-Joachim Koch
