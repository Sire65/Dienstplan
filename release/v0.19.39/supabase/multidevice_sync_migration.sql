-- KC DP2 V0.19.37 · Mehrgeräte-, Offline- und Konflikttest
create table if not exists public.kc_dp_devices (
  org_id text not null,
  project_id text not null,
  device_id uuid not null,
  user_id uuid not null default auth.uid(),
  device_name text not null,
  platform text not null default 'unbekannt',
  app_version text not null default 'unbekannt',
  status text not null default 'online' check (status in ('online','offline','testing','inactive')),
  last_seen_at timestamptz not null default now(),
  capabilities jsonb not null default '{}'::jsonb,
  primary key (org_id,project_id,device_id)
);

create table if not exists public.kc_dp_sync_test_runs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  project_id text not null,
  created_by uuid not null default auth.uid(),
  title text not null default 'KC-DP Mehrgerätetest',
  status text not null default 'prepared' check (status in ('prepared','running','waiting_second_device','conflict_ready','passed','failed','cancelled')),
  current_step text not null default 'device_registration',
  device_a uuid,
  device_b uuid,
  probe_entity_id text not null,
  results jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.kc_dp_sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  project_id text not null,
  entity text not null,
  entity_id text not null,
  operation_id text not null,
  actor_user_id uuid not null default auth.uid(),
  device_id uuid,
  base_version bigint,
  remote_version bigint not null,
  local_envelope jsonb not null,
  remote_envelope jsonb,
  status text not null default 'open' check (status in ('open','resolved_local','resolved_remote','resolved_merged','dismissed')),
  resolution jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(operation_id)
);

create index if not exists kc_dp_devices_seen_idx on public.kc_dp_devices(org_id,project_id,last_seen_at desc);
create index if not exists kc_dp_sync_test_runs_project_idx on public.kc_dp_sync_test_runs(org_id,project_id,updated_at desc);
create index if not exists kc_dp_sync_conflicts_open_idx on public.kc_dp_sync_conflicts(org_id,project_id,status,detected_at desc);

alter table public.kc_dp_devices enable row level security;
alter table public.kc_dp_sync_test_runs enable row level security;
alter table public.kc_dp_sync_conflicts enable row level security;

grant select,insert,update,delete on public.kc_dp_devices to authenticated;
grant select,insert,update on public.kc_dp_sync_test_runs to authenticated;
grant select,insert,update on public.kc_dp_sync_conflicts to authenticated;
revoke all on public.kc_dp_devices,public.kc_dp_sync_test_runs,public.kc_dp_sync_conflicts from anon,public;

drop policy if exists kc_dp_devices_member_select on public.kc_dp_devices;
create policy kc_dp_devices_member_select on public.kc_dp_devices for select to authenticated
using (exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_devices.org_id and m.user_id=(select auth.uid()) and m.active));
drop policy if exists kc_dp_devices_own_insert on public.kc_dp_devices;
create policy kc_dp_devices_own_insert on public.kc_dp_devices for insert to authenticated
with check (user_id=(select auth.uid()) and exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_devices.org_id and m.user_id=(select auth.uid()) and m.active));
drop policy if exists kc_dp_devices_own_update on public.kc_dp_devices;
create policy kc_dp_devices_own_update on public.kc_dp_devices for update to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists kc_dp_devices_own_delete on public.kc_dp_devices;
create policy kc_dp_devices_own_delete on public.kc_dp_devices for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists kc_dp_tests_member_select on public.kc_dp_sync_test_runs;
create policy kc_dp_tests_member_select on public.kc_dp_sync_test_runs for select to authenticated
using (exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_sync_test_runs.org_id and m.user_id=(select auth.uid()) and m.active));
drop policy if exists kc_dp_tests_planner_insert on public.kc_dp_sync_test_runs;
create policy kc_dp_tests_planner_insert on public.kc_dp_sync_test_runs for insert to authenticated
with check (created_by=(select auth.uid()) and exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_sync_test_runs.org_id and m.user_id=(select auth.uid()) and m.active and m.role in ('planner','duty_manager','admin')));
drop policy if exists kc_dp_tests_planner_update on public.kc_dp_sync_test_runs;
create policy kc_dp_tests_planner_update on public.kc_dp_sync_test_runs for update to authenticated
using (exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_sync_test_runs.org_id and m.user_id=(select auth.uid()) and m.active and m.role in ('planner','duty_manager','admin')))
with check (exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_sync_test_runs.org_id and m.user_id=(select auth.uid()) and m.active and m.role in ('planner','duty_manager','admin')));

drop policy if exists kc_dp_conflicts_member_select on public.kc_dp_sync_conflicts;
create policy kc_dp_conflicts_member_select on public.kc_dp_sync_conflicts for select to authenticated
using (exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_sync_conflicts.org_id and m.user_id=(select auth.uid()) and m.active));
drop policy if exists kc_dp_conflicts_actor_insert on public.kc_dp_sync_conflicts;
create policy kc_dp_conflicts_actor_insert on public.kc_dp_sync_conflicts for insert to authenticated
with check (actor_user_id=(select auth.uid()) and exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_sync_conflicts.org_id and m.user_id=(select auth.uid()) and m.active));
drop policy if exists kc_dp_conflicts_planner_update on public.kc_dp_sync_conflicts;
create policy kc_dp_conflicts_planner_update on public.kc_dp_sync_conflicts for update to authenticated
using (exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_sync_conflicts.org_id and m.user_id=(select auth.uid()) and m.active and m.role in ('planner','duty_manager','admin')))
with check (exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_sync_conflicts.org_id and m.user_id=(select auth.uid()) and m.active and m.role in ('planner','duty_manager','admin')));

drop function if exists public.kc_dp_push_operation(text,text,text,text,text,text,bigint,jsonb);
create or replace function public.kc_dp_push_operation(p_org_id text,p_project_id text,p_operation_id text,p_entity text,p_entity_id text,p_operation text,p_base_version bigint,p_envelope jsonb,p_device_id uuid)
returns jsonb language plpgsql set search_path='public' as $$
declare
  v_uid uuid:=auth.uid(); v_current bigint; v_new bigint; v_existing bigint; v_remote_envelope jsonb; v_conflict_id uuid;
begin
  if v_uid is null then raise exception 'KC_DP_AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.kc_dp_memberships m where m.org_id=p_org_id and m.user_id=v_uid and m.active) then raise exception 'KC_DP_MEMBERSHIP_REQUIRED'; end if;
  if not exists(select 1 from public.kc_dp_memberships m where m.org_id=p_org_id and m.user_id=v_uid and m.active and public.kc_dp_entity_write_allowed(m.role,p_entity)) then raise exception 'KC_DP_ENTITY_WRITE_FORBIDDEN'; end if;
  select remote_version into v_existing from public.kc_dp_sync_operations where operation_id=p_operation_id;
  if found then return jsonb_build_object('status','ok','remoteVersion',v_existing,'duplicate',true); end if;
  select version into v_current from public.kc_dp_entity_versions where org_id=p_org_id and project_id=p_project_id and entity=p_entity and entity_id=p_entity_id for update;
  if found and p_base_version is not null and v_current<>p_base_version then
    select envelope into v_remote_envelope from public.kc_dp_sync_operations where org_id=p_org_id and project_id=p_project_id and entity=p_entity and entity_id=p_entity_id order by seq desc limit 1;
    insert into public.kc_dp_sync_conflicts(org_id,project_id,entity,entity_id,operation_id,actor_user_id,device_id,base_version,remote_version,local_envelope,remote_envelope)
    values(p_org_id,p_project_id,p_entity,p_entity_id,p_operation_id,v_uid,p_device_id,p_base_version,v_current,p_envelope,v_remote_envelope)
    on conflict(operation_id) do update set detected_at=excluded.detected_at
    returning id into v_conflict_id;
    return jsonb_build_object('status','conflict','remoteVersion',v_current,'conflictId',v_conflict_id,'remoteEnvelope',v_remote_envelope);
  end if;
  v_new:=coalesce(v_current,0)+1;
  insert into public.kc_dp_sync_operations(operation_id,org_id,project_id,entity,entity_id,operation,base_version,remote_version,envelope,actor_user_id)
  values(p_operation_id,p_org_id,p_project_id,p_entity,p_entity_id,p_operation,p_base_version,v_new,p_envelope,v_uid);
  insert into public.kc_dp_entity_versions(org_id,project_id,entity,entity_id,version,updated_at,updated_by)
  values(p_org_id,p_project_id,p_entity,p_entity_id,v_new,now(),v_uid)
  on conflict(org_id,project_id,entity,entity_id) do update set version=excluded.version,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
  return jsonb_build_object('status','ok','remoteVersion',v_new);
end $$;

grant execute on function public.kc_dp_push_operation(text,text,text,text,text,text,bigint,jsonb,uuid) to authenticated;
revoke execute on function public.kc_dp_push_operation(text,text,text,text,text,text,bigint,jsonb,uuid) from anon,public;

-- Abwärtskompatibilität für Geräte, die während des Updates noch V0.19.32 ausführen.
create function public.kc_dp_push_operation(p_org_id text,p_project_id text,p_operation_id text,p_entity text,p_entity_id text,p_operation text,p_base_version bigint,p_envelope jsonb)
returns jsonb language sql set search_path='public' as $$
 select public.kc_dp_push_operation(p_org_id,p_project_id,p_operation_id,p_entity,p_entity_id,p_operation,p_base_version,p_envelope,null::uuid)
$$;
grant execute on function public.kc_dp_push_operation(text,text,text,text,text,text,bigint,jsonb) to authenticated;
revoke execute on function public.kc_dp_push_operation(text,text,text,text,text,text,bigint,jsonb) from anon,public;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kc_dp_devices') then alter publication supabase_realtime add table public.kc_dp_devices; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kc_dp_sync_test_runs') then alter publication supabase_realtime add table public.kc_dp_sync_test_runs; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kc_dp_sync_conflicts') then alter publication supabase_realtime add table public.kc_dp_sync_conflicts; end if;
end $$;
