# KC DP2 V0.19.34 – TÜV-, Studio- und Architekturbericht

## Ergebnis

Freigabestatus: **bestanden**

- TÜV/Studio/Architektur: **40/40**
- Funktionsregression: **78/78**
- Z-Sonderdienstregression: **17/17**
- Manifest und SHA-256: **59/59**
- Gesamt: **194/194 Prüfungen**

## Unabhängige Werkzeuge

- Node.js Syntaxprüfung jedes JavaScript-Moduls
- `html-validate` für HTML und grundlegende Barrierefreiheit
- OpenSSL für unabhängige SHA-256-Prüfwerte
- Git `diff --check` für Patch- und Leerraumkonsistenz
- `ripgrep`-Musterscan auf private Schlüssel und JWTs

## Behobene Fremdprüfungsbefunde

Der erste HTML-Lauf meldete 36 formale Befunde. Behoben wurden explizite Schaltflächentypen, eine korrekte ARIA-Gruppe für den Datenbankstatus, eine zugängliche Beschriftung des dynamischen Datumsknopfes und die normgerechte DOCTYPE-Schreibweise. Der anschließende Fremdprüflauf war fehlerfrei.

## Architekturentscheidung

Die bestehende Trennung `core`, `adapters` und `ui` bleibt erhalten. IndexedDB ist der verschlüsselte lokale Primärpfad; Supabase-Synchronisation läuft über eine dauerhaft gespeicherte Outbox. Z-Dienste bleiben fachlich von der Standbesetzung getrennt. Private Server- und VAPID-Schlüssel dürfen nicht in Browsercode oder IndexedDB gelangen.

## Bedienregel

Die Farblegende wird als schwebendes Element im vorhandenen Kopfbereich geöffnet. Sie erzeugt keine zusätzliche Planzeile und wird bei einer Fensterbreite unter 1450 Pixel automatisch ausgeblendet.
