-- KC DP2 V0.19.55 – Mail-Anhangverschlüsselung / Aufbewahrung
-- Private Quarantäne. Dateiinhalte werden in der Edge Function vor Upload AES-256-GCM verschlüsselt.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'kc-dp-mail-quarantine',
  'kc-dp-mail-quarantine',
  false,
  10485760,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/pdf',
    'image/png','image/jpeg','image/webp','image/heic','application/octet-stream'
  ]
)
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.kc_dp_inbox_attachments
  add column if not exists encryption_algorithm text,
  add column if not exists encryption_iv text,
  add column if not exists plaintext_sha256 text,
  add column if not exists cipher_sha256 text,
  add column if not exists encrypted_at timestamptz,
  add column if not exists retention_until timestamptz,
  add column if not exists content_status text not null default 'metadata_only';

alter table public.kc_dp_inbox_attachments
  drop constraint if exists kc_dp_inbox_attachments_content_status_check;
alter table public.kc_dp_inbox_attachments
  add constraint kc_dp_inbox_attachments_content_status_check
  check (content_status in ('metadata_only','encrypted','deleted','failed'));

create index if not exists kc_dp_inbox_attachments_retention
  on public.kc_dp_inbox_attachments(retention_until)
  where content_status='encrypted';

comment on column public.kc_dp_inbox_attachments.encryption_algorithm is 'Anwendungsverschlüsselung vor Storage-Upload; aktuell AES-256-GCM.';
comment on column public.kc_dp_inbox_attachments.encryption_iv is 'Base64-kodierter zufälliger 96-Bit-IV; kein Schlüsselmaterial.';
comment on column public.kc_dp_inbox_attachments.retention_until is 'Zeitpunkt, ab dem verschlüsselter Rohanhang automatisiert gelöscht werden darf.';
comment on column public.kc_dp_inbox_attachments.plaintext_sha256 is 'Integritäts-/Dublettenhash des entschlüsselten Originals; kein Dateiinhaltsersatz.';

-- Browserzugriffe auf Quarantäneobjekte sind absichtlich nicht freigegeben.
-- Zugriff erfolgt ausschließlich über service_role in den KC-DP-Edge-Funktionen.
