# KC DP2 V0.19.55 Build 84 – Stabilisierung

Build 84 ist eine vorsichtige Stabilisierung von Build 83. Es wurden keine fachlichen Funktionen oder vorhandenen Daten entfernt.

## Änderungen

- Vollständiges Release-Manifest: 134 lokale Programmdateien werden mit Größe und SHA-256 erfasst.
- Atomare Auslieferung: JavaScript und CSS werden aus dem vollständig verifizierten aktiven Release-Cache geliefert. Der aktive Cache wird nicht mehr durch einzelne Netzwerkdateien überschrieben.
- Auth-Härtung: Ein bestätigter Benutzerzustand wird nicht mehr rekonstruiert, wenn der Supabase-Client kein Zugriffstoken besitzt.
- Entwicklerzugang: Der versteckte Logo-Schnellzugang ist nur noch auf `localhost` beziehungsweise `127.0.0.1` aktiv.
- Login-Barrierefreiheit: E-Mail- und Passwortfeld haben eindeutige zugängliche Namen; Autofill-Fallen sind aus dem Accessibility-Baum entfernt.
- Versionskonsistenz: `RELEASE.txt`, Manifest, Cache und Buildkennung nennen V0.19.55 Build 84.
- Reproduzierbare Werkzeuge: Manifestgenerator, Releaseprüfung und Core-Smoke-Test liegen im Ordner `tools`.

## Durchgeführte Prüfungen

- JavaScript-Syntaxprüfung: 0 Fehler.
- Manifestprüfung: 134/134 Dateien vorhanden, Größen und SHA-256 korrekt.
- Core-Smoke-Test: Pausenschwellen, Überschneidungsblockade und Tagesbewertung bestanden.
- Originalstand vor Änderung als `KC-DP2-Build83-before-repair.zip` gesichert.

## Bewusst nicht automatisch verändert

- Vorhandene Dienstpläne und gespeicherte Daten.
- Supabase-Datenbank, RLS-Regeln und Edge Functions, da diese nicht Teil des Pakets sind.
- Betriebsindividuelle Arbeitszeitregeln. Sie müssen fachlich/rechtlich festgelegt werden, bevor sie als unveränderliche Sperren eingebaut werden.
- Die grundlegende Loginarchitektur wurde nicht vollständig neu geschrieben. Eine große Umstellung ohne echte Testkonten wäre riskanter als die gezielte Härtung.

## Wiederholbare Prüfung

Nach Änderungen im Web-Root:

```text
node tools/generate-release-manifest.mjs
node tools/verify-release.mjs
node tools/smoke-core.mjs
```
