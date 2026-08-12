# KC-DP2 – Köcheclub Werne

Produktions-Repository für den **Dienstplan Manager KC dp2**.

- Freigegebener Web-Release: **V0.19.0**
- Fach-Core: **V0.17.10**
- Ziel: Tablet-/Browserbetrieb als PWA über GitHub Pages
- Backend/Auth/Synchronisation: Supabase (Produktivkonfiguration noch ausstehend)

## Veröffentlichungsregel

Nur ein vollständig geprüfter Release darf veröffentlicht werden. Der Pages-Workflow prüft vor jedem Deployment:

1. Release-Datei vorhanden
2. erwartete SHA-256-Prüfsumme
3. ZIP lässt sich vollständig entpacken
4. `index.html`, `manifest.webmanifest`, `service-worker.js` und `update-manifest.json` sind vorhanden

Schlägt eine Prüfung fehl, wird **nicht** auf die neue Version umgeschaltet.

## Sicherheit

In dieses öffentliche Repository gehören ausschließlich deploybare Web-Dateien und die Release-Automation. Keine Supabase-Service-Role-/Secret-Schlüssel, keine internen Datenbankzugänge und keine personenbezogenen Testdaten.

Erstellt und Designed by: Hans-Joachim Koch
