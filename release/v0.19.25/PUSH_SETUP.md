# Push-Einrichtung V0.19.25

Bereits aktiv: Tabelle `kc_dp_push_subscriptions`, RLS und Edge Function `kc-dp-push`.

Einmalig im Supabase-Dashboard unter **Edge Functions → Secrets** setzen:

- `KC_DP_VAPID_PUBLIC_KEY`
- `KC_DP_VAPID_PRIVATE_KEY`
- `KC_DP_VAPID_SUBJECT` = `mailto:admin@koecheclub-werne.de`

Die Schlüssel mit `npx web-push generate-vapid-keys` erzeugen. Der private Schlüssel darf niemals in Browsercode, GitHub oder Chat eingefügt werden. Danach aktiviert jeder Mitarbeiter Push einmal unter **Benachrichtigungen → Push auf diesem Gerät aktivieren**.
