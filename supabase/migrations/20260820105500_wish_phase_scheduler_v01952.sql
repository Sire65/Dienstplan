select cron.schedule(
  'kc-dp-wish-phase-v01952',
  '*/5 * * * *',
  $$select net.http_post(
    url=>'https://ptblnpiroqftcvlsrhac.supabase.co/functions/v1/kc-dp-wish-phase',
    headers=>'{"Content-Type":"application/json"}'::jsonb,
    body=>jsonb_build_object(
      'action','scheduled',
      'cronSecret',(select decrypted_secret from vault.decrypted_secrets where name='kc_dp_nightly_push_secret' order by created_at desc limit 1),
      'orgId','KC_WERNE',
      'projectId','KC_DP'
    )
  )$$
);
