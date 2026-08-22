# KC DP2 V0.20.0 – Recovery- und Konsolidierungsplan

## Ausgangspunkt

V0.20.0 wird ausschließlich aus dem gesicherten Stand `restore/v0.19.54-stable` aufgebaut.
Der aktuelle V0.19.55-Mischstand dient nur als Funktionsquelle, nicht als technische Basis.

## Unverhandelbare Kernregeln

1. DP2 muss ohne Kommunikationsmodul starten, anmelden, planen, lokal speichern und synchronisieren können.
2. Kommunikation ist ein externer Dienst über `Sire65/KC-Communication`.
3. DP2 erzeugt ausschließlich fachliche Ereignisse; Routing, Push, E-Mail, Fallback, Zustellstatus und Historie gehören in KC Communication.
4. Ein Fehler oder Timeout in KC Communication darf DP2 niemals blockieren.
5. Neue Funktionspakete werden einzeln übernommen. Nach jedem Paket laufen Konsolidierung und Regression.
6. Kein Paket wird in `main` übernommen, solange Baseline-Gates rot sind.
7. Jede übernommene Funktion muss eine eindeutige Versions-/Herkunftsnotiz erhalten. Keine stillen Hotfix-Layer.

## Recovery-Reihenfolge

### Phase A – Baseline
- Programm lädt
- Login-Oberfläche erscheint
- Login kann erfolgreich abschließen oder kontrolliert fehlschlagen; kein Endloszustand
- IDX-LED und SUP-LED sind vorhanden
- Dienstplan-Hauptansicht startet nach Anmeldung
- IndexedDB bleibt lokale Primär-Fallback-Schicht
- Supabase-Sync darf bei Fehlern den lokalen Betrieb nicht blockieren

### Phase B – Kernfunktionen
- Wunsch / Soll / Ist
- Tages-, Wochen- und Zeitraumansicht
- Dienst anlegen/bearbeiten
- Drag & Drop
- Schnell-Einplanen
- Kollegen suchen / übernehmen
- Planprüfung und Veröffentlichung
- Diagnosezentrum

### Phase C – neuere Funktionen selektiv zurückholen
Jede Funktion aus V0.19.55+ wird vor Übernahme gegen V0.19.54 diff-geprüft und isoliert portiert.

### Phase D – KC Communication Adapter
Zielrepository: `Sire65/KC-Communication`.
DP2 verwendet dessen SDK/API und keine eigene Push-/E-Mail-Providerlogik.

Geplante DP2-Ereignisse:
- `dp2.plan.published`
- `dp2.shift.changed`
- `dp2.replacement.requested`
- `dp2.replacement.resolved`
- `dp2.standby.requested`
- `dp2.wish.deadline`
- `dp2.actual.issue`

Vorgabe: `testOnly=true` bis die komplette Ende-zu-Ende-Regression grün ist.

## Pflicht-Regression nach jedem Paket

1. JavaScript-Syntax aller Release-Dateien
2. Login-Start und Session-Guard
3. IDX-/SUP-LED-Struktur
4. Hauptansicht und Kernnavigation
5. lokales Speichern
6. Supabase-Fehlerfall ohne UI-Hänger
7. Diagnose öffnet/schließt
8. Kommunikationsadapter optional: fehlt er, muss DP2 trotzdem funktionieren
9. keine direkte E-Mail-/Push-Providerabhängigkeit im DP2-Kern
10. Versionskonsistenz des Release-Manifests

## Release-Regel

Erst wenn Baseline und alle übernommenen Pakete grün sind, wird ein neuer eingefrorener Release `KC DP2 V0.20.0` erzeugt. Danach keine Änderungen mehr direkt in diesem Release-Ordner; weitere Änderungen gehen in V0.20.1+.