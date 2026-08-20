-- KC DP2 V0.19.55 – providerunabhängiger E-Mail-Posteingang und QR-Dokumentregister
-- Keine Secrets in Tabellen. API-Schlüssel bleiben ausschließlich als Edge-/Vault-Secrets.

create table if not exists public.kc_dp_document_registry (
  id uuid primary key default gen_random_uuid(),
  org_id text not null default 'KC_WERNE',
  project_id text not null default 'KC_DP',
  document_type text not null check (document_type in ('wish_form','staffing_matrix','desired_plan','target_plan','actual_plan','comparison','other')),
  planning_period_id text,
  person_id text,
  version text not null,
  short_code text not null unique,
  qr_token_hash text not null unique,
  import_allowed boolean not null default false,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid
);
create index if not exists kc_dp_document_registry_lookup on public.kc_dp_document_registry(org_id,project_id,document_type,person_id,status);

create table if not exists public.kc_dp_mail_provider_settings (
  id uuid primary key default gen_random_uuid(),
  org_id text not null default 'KC_WERNE',
  project_id text not null default 'KC_DP',
  provider_key text not null check (provider_key in ('resend','brevo','smtp','custom')),
  display_name text not null,
  priority integer not null default 100,
  enabled boolean not null default false,
  send_enabled boolean not null default true,
  receive_enabled boolean not null default false,
  secret_ref text,
  from_address text,
  inbound_address text,
  free_tier_note text,
  last_health_status text not null default 'unknown' check (last_health_status in ('unknown','ok','warning','error')),
  last_health_at timestamptz,
  last_error text,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique(org_id,project_id,provider_key)
);

create table if not exists public.kc_dp_inbox_messages (
  id uuid primary key default gen_random_uuid(),
  org_id text not null default 'KC_WERNE',
  project_id text not null default 'KC_DP',
  provider_key text not null,
  provider_message_id text,
  received_at timestamptz not null default now(),
  from_address text not null,
  from_name text,
  subject text,
  person_id text,
  person_match_method text check (person_match_method in ('qr','sender','manual','unknown')),
  person_match_confidence numeric(5,4),
  document_id uuid references public.kc_dp_document_registry(id),
  status text not null default 'received' check (status in ('received','processing','review','accepted','rejected','quarantine','duplicate','error')),
  quarantine_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(org_id,project_id,provider_key,provider_message_id)
);
create index if not exists kc_dp_inbox_messages_status on public.kc_dp_inbox_messages(org_id,project_id,status,received_at desc);

create table if not exists public.kc_dp_inbox_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.kc_dp_inbox_messages(id) on delete cascade,
  file_name text not null,
  media_type text,
  byte_size bigint not null default 0,
  sha256 text not null,
  storage_path text,
  detected_kind text check (detected_kind in ('xlsx','xls','csv','pdf','image','unknown')),
  qr_short_code text,
  qr_document_id uuid references public.kc_dp_document_registry(id),
  scan_status text not null default 'pending' check (scan_status in ('pending','clean','blocked','failed')),
  parse_status text not null default 'pending' check (parse_status in ('pending','parsed','review','invalid','failed')),
  created_at timestamptz not null default now(),
  unique(message_id,sha256)
);

create table if not exists public.kc_dp_import_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null default 'KC_WERNE',
  project_id text not null default 'KC_DP',
  message_id uuid references public.kc_dp_inbox_messages(id) on delete set null,
  attachment_id uuid references public.kc_dp_inbox_attachments(id) on delete set null,
  person_id text,
  document_id uuid references public.kc_dp_document_registry(id),
  source_kind text not null check (source_kind in ('email_excel','email_photo','email_pdf','manual_photo','manual_excel')),
  status text not null default 'queued' check (status in ('queued','processing','review','ready','applied','rejected','error')),
  confidence numeric(5,4) not null default 0,
  auto_apply_eligible boolean not null default false,
  wish_phase_open boolean,
  detected_rows integer not null default 0,
  valid_rows integer not null default 0,
  error_rows integer not null default 0,
  normalized_payload jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  applied_at timestamptz,
  applied_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists kc_dp_import_jobs_review on public.kc_dp_import_jobs(org_id,project_id,status,created_at desc);

-- Service-first security model: Browser dürfen diese administrativen Tabellen nicht direkt verändern.
alter table public.kc_dp_document_registry enable row level security;
alter table public.kc_dp_mail_provider_settings enable row level security;
alter table public.kc_dp_inbox_messages enable row level security;
alter table public.kc_dp_inbox_attachments enable row level security;
alter table public.kc_dp_import_jobs enable row level security;

revoke all on public.kc_dp_document_registry from anon, authenticated;
revoke all on public.kc_dp_mail_provider_settings from anon, authenticated;
revoke all on public.kc_dp_inbox_messages from anon, authenticated;
revoke all on public.kc_dp_inbox_attachments from anon, authenticated;
revoke all on public.kc_dp_import_jobs from anon, authenticated;

grant all on public.kc_dp_document_registry to service_role;
grant all on public.kc_dp_mail_provider_settings to service_role;
grant all on public.kc_dp_inbox_messages to service_role;
grant all on public.kc_dp_inbox_attachments to service_role;
grant all on public.kc_dp_import_jobs to service_role;

comment on table public.kc_dp_document_registry is 'Maschinenlesbare Dokumentidentität für QR-gestützte Zuordnung ohne PII im QR-Code.';
comment on table public.kc_dp_mail_provider_settings is 'Providerabstraktion; secret_ref verweist nur auf serverseitige Secrets/Vault und enthält nie den Schlüssel selbst.';
comment on table public.kc_dp_import_jobs is 'Auditierbare Importpipeline. Auto-Apply erst nach eindeutiger Person/Dokument-Zuordnung, offener Wunschphase und fehlerfreier Validierung.';
