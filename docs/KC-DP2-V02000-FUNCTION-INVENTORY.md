# KC DP2 V0.20.0 – Funktionsinventur nach V0.19.54

Stand: Recovery-Branch `recovery/dp2-v02000`

Ziel: Neuere Funktionen nur kontrolliert zurückholen. Der stabile Kern (Login, lokale Daten, Startpfad, LEDs, Sync) hat Vorrang. `main` bleibt während der Recovery-Arbeit unverändert.

## Architekturregel

- DP2 muss vollständig ohne KC-Communication starten und planen können.
- Kommunikation wird später über `Sire65/KC-Communication` angebunden.
- E-Mail-Inbox, Mail-Center und Notification-Kanalsteuerung werden nicht wieder in den DP2-Kern integriert.
- Nach jedem Funktionspaket: Baseline-Gate, Syntaxprüfung und eigener Checkpoint-PR gegen den Recovery-Branch.

## Einstufung der neueren Bausteine

### A – Niedriges Risiko / zuerst prüfen

1. `src/ui/diagnostics-history-view.js`
   - rein ergänzende Diagnoseansicht
   - trennt Offen / Historie / Tests
   - greift nicht in Auth, Storage oder Planungskern ein
   - Kandidat P5.1

### B – Mittleres Risiko / nur mit eigenem Gate

2. `src/adapters/xlsx-local.js`
   - lokale XLSX-Auswertung ohne externes CDN
   - sinnvoll für Wunschimport/offline
   - eigener ZIP/DEFLATE-Parser; daher Parser-Regression nötig

3. `src/ui/mobile-day.js` + `src/ui/mobile-day.css`
   - Handy-Tagesansicht Liste/Balken
   - Tag-Navigation, Soll/Wunsch/Ist/Vergleich, Bereitschaft, Z/Aushilfe
   - verändert DOM/Rendering; echter Mobile-Smoke-Test erforderlich

### C – Höheres Risiko / später

4. `src/core/wish-zone.js`
   - V/H/B-Wunschlogik
   - verändert `validateWish`, `mutations.saveWish` und `validateShift`
   - nur zusammen mit Planungs-, Wunsch- und Drag/Drop-Regression übernehmen

5. `src/ui/start-choice.js` + CSS
   - Startauswahl Ansehen/Bearbeiten/Meine Dienste/Wunschplan
   - hängt sich in `roleUx.afterDataLoaded()` ein
   - wird erst nach Abschluss der Start-/Session-Recovery betrachtet

### D – vorerst nicht in DP2 zurückholen

- `src/core/email-inbox*.js`
- `src/ui/email-center.js`
- Mail-Supabase-Functions und Mail-Vault-Bridges
- `notification-channel-safety.js` / `notification-channel-settings.js` als fachprogramminterne Versandsteuerung

Diese Funktionen werden durch die spätere Schnittstelle zu `Sire65/KC-Communication` ersetzt bzw. dort zentral betrieben.

## Geplante Reihenfolge

- P5.1 Diagnose-Historie
- Regression/Konsolidierung
- P5.2 lokales XLSX
- Regression/Konsolidierung
- P5.3 Handy-Tagesansicht
- Mobile-Smoke + Regression
- P5.4 V/H/B-Wunschlogik
- Planungs-/Wunsch-Regression
- erst danach Startauswahl
- anschließend KC-Communication-Adapter als eigenes Paket

## Stop-Regel

Sobald ein Paket Baseline, Login, LEDs, Start, IndexedDB oder Sync verschlechtert, wird es nicht weitergeschleppt. Das Paket wird isoliert zurückgenommen oder korrigiert, bevor die Recovery-Arbeit fortgesetzt wird.
