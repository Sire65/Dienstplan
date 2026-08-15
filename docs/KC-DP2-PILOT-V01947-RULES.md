# KC DP2 V0.19.47 – Pilotbetrieb: verbindliche Regeln

Diese Regeln gelten für den externen KC-DP2-Pilotbetrieb und ergänzen die allgemeine Engineering-/TÜV-/Studio-Regelakte.

## Trennung vom Köcheclub

- Externe Pilotpersonen sind keine Köcheclub-Mitglieder und dürfen niemals als solche angelegt werden.
- Pilotpersonen dürfen nicht in Mitgliederlisten, Dienstplanung, Besetzungsmatrix, Stundenberechnung, Wunsch-/Soll-/Ist-Plan oder Personalsuche erscheinen.
- Pilotdaten liegen in getrennten Tabellen und Pilot-Push-Subscriptions getrennt von produktiven Mitglieder-Subscriptions.

## Personen- und Kontaktdaten

- Für den Pilot werden nur die zur Durchführung notwendigen Daten verarbeitet: Vorname, internationale Telefonnummer im E.164-Format, erwarteter Gerätetyp, Pilotstatus und technische Push-/Diagnosedaten.
- Die Telefonnummer wird nicht zur Authentifizierung des Dienstplans verwendet.
- Persönliche Einladungslinks verwenden zufällige, ausreichend lange Tokens. In der Datenbank wird ausschließlich der SHA-256-Hash des Einladungstokens gespeichert.

## Zugriff und Sicherheit

- Der Pilot-Endpunkt gibt ohne gültiges persönliches Token keine Testerdaten und keine Pushfunktion frei.
- Ein Pilot-Token gewährt keinerlei Zugriff auf Dienstpläne, Köcheclub-Mitgliederdaten oder Adminfunktionen.
- Service-Role-Schlüssel, VAPID-Private-Key und andere Secrets dürfen niemals im Browser ausgeliefert werden.
- Die Pilot-PWA verwendet einen eigenen Service-Worker-Scope und darf den produktiven KC-DP2-Service-Worker nicht ersetzen.

## iPhone und Android

- iPhone/iOS und Android werden getrennt erkannt und erhalten gerätespezifische Installationshinweise.
- Auf iPhone wird Push erst nach Installation als Home-Screen-Web-App und einer ausdrücklichen Benutzeraktion angefordert.
- Auf Android wird ein verfügbarer Browser-Installationsdialog genutzt; alternativ wird der manuelle Installationsweg erklärt.

## Pilotstatus

Der technische Ablauf lautet verbindlich:

`invited → opened → installed → push_enabled → test_received → completed`

- `test_received` darf erst gesetzt werden, nachdem die Testperson die Server-Push-Nachricht tatsächlich geöffnet hat; ein erfolgreicher Server-Sendeversuch allein reicht nicht.
- Ereignisse werden für die Pilot-Auswertung mit Zeitstempel protokolliert.

## Abschluss und Löschung

- Am Ende erhält jede Pilotperson eine Abschluss-Push mit dem Dank des Entwicklers und einer zum Gerät passenden Deinstallationsanleitung.
- Nach erfolgreichem Abschluss werden aktive Pilot-Push-Subscriptions deaktiviert, damit keine weiteren KC-DP2-Pushes versehentlich an die Pilotperson gehen.
- Pilotpersonen können auf `revoked` gesetzt und ihre getrennten Pilotdaten anschließend gelöscht werden.

## Freigaberegel

V0.19.47 darf nur nach grünem Pilot-Gate sowie vollständigem KC-DP2-Deep-TÜV, Smartphone-, Rollen-, Wunsch→Soll→Ist-, Dokument-/PDF-/E-Mail-, Planfoto-, Push-, Diagnostics/TableCore-, Security-, PWA- und Releaseintegritäts-Test nach `main` und GitHub Pages veröffentlicht werden.
