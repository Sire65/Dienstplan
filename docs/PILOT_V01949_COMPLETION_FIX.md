# KC DP2 V0.19.49 – Pilot Completion Fix

Freigabegegenstand: zuverlässiger Abschluss des Pilot-Tests.

- Dankes-Push kann nach erfolgreichem Test erneut ausgelöst werden.
- Die Pilot-Push-Subscription bleibt aktiv, bis die Abschlussnachricht tatsächlich geöffnet wurde.
- Beim Öffnen wird `completion_received` an den Pilot-Service gemeldet.
- Erst danach darf die Pilot-Subscription deaktiviert werden.
- Der Dank enthält den digitalen Blumenstrauß 💐🌷🌸.
- Der Pilot-Service-Worker verwendet einen erneuerten Cache.

Der kanonische Release `release/v0.19.49/site` wurde durch den V0.19.49-Packager vollständig neu gehasht und durch TÜV/Studio geprüft.
