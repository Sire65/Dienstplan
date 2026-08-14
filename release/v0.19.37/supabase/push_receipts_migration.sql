-- KC DP2 V0.19.37 · Push-Versand- und Öffnungsbestätigung
create table if not exists public.kc_dp_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  project_id text not null,
  notification_id text not null,
  subscription_id uuid not null references public.kc_dp_push_subscriptions(id) on delete cascade,
  user_id uuid not null,
  person_id text not null,
  status text not null default 'queued' check(status in ('queued','sent','failed','opened')),
  title text not null default '',
  error_code text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  failed_at timestamptz,
  opened_at timestamptz,
  unique(notification_id,subscription_id)
);
create index if not exists kc_dp_push_deliveries_recent_idx on public.kc_dp_push_deliveries(org_id,project_id,created_at desc);
create index if not exists kc_dp_push_deliveries_person_idx on public.kc_dp_push_deliveries(org_id,person_id,status,created_at desc);
alter table public.kc_dp_push_deliveries enable row level security;
revoke all on public.kc_dp_push_deliveries from anon,public;
grant select on public.kc_dp_push_deliveries to authenticated;
drop policy if exists kc_dp_push_delivery_member_select on public.kc_dp_push_deliveries;
create policy kc_dp_push_delivery_member_select on public.kc_dp_push_deliveries for select to authenticated using (
 coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false)=false and (user_id=(select auth.uid()) or exists(select 1 from public.kc_dp_memberships m where m.org_id=kc_dp_push_deliveries.org_id and m.user_id=(select auth.uid()) and m.active and m.role in ('planner','duty_manager','admin')))
);
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kc_dp_push_deliveries') then alter publication supabase_realtime add table public.kc_dp_push_deliveries; end if;
end $$;
