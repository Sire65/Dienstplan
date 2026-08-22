# V0.20.0 Recovery Checkpoint P2 – Login/LED-Basis

Stand: 2026-08-22

## Enthalten
- V0.19.54 bleibt technische Basis.
- Supabase-Netzwerkzugriffe besitzen einen echten 15-Sekunden-Abbruch über AbortController.
- Timeout wird vor dem Supabase-Adapter installiert.
- Mobile Rollenansicht erhält eigene IDX/SUP Status- und Traffic-LEDs.
- Klassische Legacy-LEDs bleiben erhalten.
- Kommunikationsmodul ist noch nicht in den DP2-Startpfad eingebunden.

## Pflichtprüfung
- `node tests/v02000-baseline-gate.js`
- Syntaxprüfung aller JavaScript-Dateien unter `release/v0.19.54/site`
- Recovery-Architektur-Guard

Erst bei grünem Gate folgt Paket P3 (Start-/Session-Stabilisierung).
