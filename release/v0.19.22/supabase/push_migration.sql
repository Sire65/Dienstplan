create table if not exists public.kc_dp_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  project_id text not null default 'KC_DP',
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id text not null,
  endpoint text not null,
  subscription jsonb not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, project_id, user_id, endpoint)
);
create index if not exists kc_dp_push_person_idx on public.kc_dp_push_subscriptions(org_id,project_id,person_id) where active;
create index if not exists kc_dp_push_user_idx on public.kc_dp_push_subscriptions(user_id);
alter table public.kc_dp_push_subscriptions enable row level security;
drop policy if exists kc_dp_push_own_select on public.kc_dp_push_subscriptions;
create policy kc_dp_push_own_select on public.kc_dp_push_subscriptions for select to authenticated using (user_id=(select auth.uid()) and coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false)=false);
drop policy if exists kc_dp_push_own_insert on public.kc_dp_push_subscriptions;
create policy kc_dp_push_own_insert on public.kc_dp_push_subscriptions for insert to authenticated with check (user_id=(select auth.uid()) and coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false)=false);
drop policy if exists kc_dp_push_own_update on public.kc_dp_push_subscriptions;
create policy kc_dp_push_own_update on public.kc_dp_push_subscriptions for update to authenticated using (user_id=(select auth.uid()) and coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false)=false) with check (user_id=(select auth.uid()) and coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false)=false);
revoke all on public.kc_dp_push_subscriptions from anon;
grant select,insert,update on public.kc_dp_push_subscriptions to authenticated;
