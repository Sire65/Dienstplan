-- KC DP2 V0.19.36 · Automatischer persönlicher Folgetagsplan
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create table if not exists public.kc_dp_push_schedule_settings (
 org_id text not null, project_id text not null, enabled boolean not null default true,
 local_time time not null default '20:00', timezone text not null default 'Europe/Berlin',
 recipient_scope text not null default 'scheduled' check(recipient_scope in ('scheduled','all_active')),
 updated_by uuid, updated_at timestamptz not null default now(), primary key(org_id,project_id)
);
create table if not exists public.kc_dp_daily_push_preview (
 org_id text not null, project_id text not null, service_date date not null, person_id text not null,
 plan_version bigint not null, shifts jsonb not null default '[]', active boolean not null default true,
 updated_by uuid, updated_at timestamptz not null default now(), primary key(org_id,project_id,service_date,person_id)
);
create table if not exists public.kc_dp_daily_push_runs (
 org_id text not null, project_id text not null, service_date date not null, person_id text not null,
 notification_id text, status text not null default 'started', created_at timestamptz not null default now(),
 primary key(org_id,project_id,service_date,person_id)
);
create table if not exists public.kc_dp_cron_auth (id text primary key default 'nightly_push',secret_hash text not null,created_at timestamptz not null default now());
alter table public.kc_dp_push_schedule_settings enable row level security;
alter table public.kc_dp_daily_push_preview enable row level security;
alter table public.kc_dp_daily_push_runs enable row level security;
alter table public.kc_dp_cron_auth enable row level security;
revoke all on public.kc_dp_cron_auth,public.kc_dp_daily_push_preview,public.kc_dp_daily_push_runs from anon,authenticated,public;
revoke all on public.kc_dp_push_schedule_settings from anon,public;
grant select,insert,update on public.kc_dp_push_schedule_settings to authenticated;
create policy kc_dp_schedule_admin_all on public.kc_dp_push_schedule_settings for all to authenticated
 using(coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false)=false and exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_push_schedule_settings.org_id and m.user_id=(select auth.uid()) and m.active and m.role in ('planner','duty_manager','admin')))
 with check(coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false)=false and exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_push_schedule_settings.org_id and m.user_id=(select auth.uid()) and m.active and m.role in ('planner','duty_manager','admin')));
insert into public.kc_dp_push_schedule_settings(org_id,project_id) values('KC_WERNE','KC_DP') on conflict do nothing;
do $$ declare s text:=gen_random_uuid()::text; begin
 insert into public.kc_dp_cron_auth(id,secret_hash) values('nightly_push',encode(digest(s,'sha256'),'hex')) on conflict(id) do update set secret_hash=excluded.secret_hash,created_at=now();
 perform vault.create_secret(s,'kc_dp_nightly_push_secret','KC DP2 Nachtversand');
end $$;
select cron.schedule('kc-dp-nightly-push-check','*/5 * * * *',$job$
 select net.http_post(url:='https://iddudrxuihdodnvejxcp.supabase.co/functions/v1/kc-dp-push',headers:=jsonb_build_object('Content-Type','application/json'),body:=jsonb_build_object('action','scheduled','cronSecret',(select decrypted_secret from vault.decrypted_secrets where name='kc_dp_nightly_push_secret' order by created_at desc limit 1)),timeout_milliseconds:=10000);
$job$);
