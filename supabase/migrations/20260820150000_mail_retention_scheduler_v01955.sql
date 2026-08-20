-- KC DP2 V0.19.55 – tägliche Bereinigung verschlüsselter Mail-Rohanhänge
-- Secret wird zur Laufzeit aus Vault gelesen und nicht im SQL gespeichert.
select cron.unschedule(jobid) from cron.job where jobname='kc-dp-mail-retention-daily';
select cron.schedule(
  'kc-dp-mail-retention-daily',
  '17 3 * * *',
  $$select net.http_post(
    url=>'https://ptblnpiroqftcvlsrhac.supabase.co/functions/v1/kc-dp-mail-retention',
    headers=>'\{"Content-Type":"application/json"\}'::jsonb,
    body=>jsonb_build_object(
      'cronSecret',(select decrypted_secret from vault.decrypted_secrets where name='kc_dp_nightly_push_secret' order by created_at desc limit 1)
    )
  )$$
);
