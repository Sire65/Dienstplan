# KC-SICHERHEIT-2026-10-13 – Mail-Eingang

Claudes Zweig `claude/sicherheit-mail-inbound` wird einschließlich Verlauf übernommen. Brevo erfordert `x-kc-inbound-token`, abgeglichen gegen Function-Secret `KC_DP_BREVO_INBOUND_TOKEN`; fehlt eine Seite, wird vor Verarbeitung abgewiesen. Resend bleibt bei Svix-Signaturprüfung. Der ergänzte SHA-256-Vergleich läuft über alle Digest-Zeichen ohne frühen Abbruch. Funktionsquellstand 9 (`X-KC-Function-Version`), kein eingebauter Zugangsschlüssel.

`node tests/mail-inbound-security.cjs` prüft fehlendes Secret, fehlenden/falschen Token (403 ohne DB-Zugriff), gültigen Token sowie ungültige/gültige Resend-Signaturwege mit isolierten Fixtures. Keine produktiven Nachrichten versendet. Der Live-Negativtest benutzt nur `{}` ohne Token.

Die bereits live eingespielte Absicherung von Claude bleibt bestehen. Der Quellcode wird dauerhaft in main gesichert; Version 9 wird nicht automatisch auf Supabase deployt. Brevo bleibt ohne eingerichtetes Secret geschlossen. Kein Secret wurde gesetzt oder rotiert.
