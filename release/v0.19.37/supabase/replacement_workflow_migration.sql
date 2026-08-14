-- KC DP2 V0.19.37 · atomare Vertretungsanfragen
create table if not exists public.kc_dp_replacement_requests (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  project_id text not null default 'KC_DP',
  service_date date not null,
  start_time time not null,
  end_time time not null,
  area text not null,
  zone text not null default 'back',
  reason_category text not null default 'personalausfall',
  status text not null default 'open' check (status in ('open','filled','cancelled','expired')),
  invited_person_ids text[] not null default '{}',
  assigned_person_id text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  synced_at timestamptz,
  check (end_time > start_time)
);
create table if not exists public.kc_dp_replacement_responses (
  request_id uuid not null references public.kc_dp_replacement_requests(id) on delete cascade,
  person_id text not null,
  user_id uuid not null references auth.users(id),
  response text not null check (response in ('accepted','declined','too_late')),
  created_at timestamptz not null default now(),
  primary key (request_id, person_id)
);
create index if not exists kc_dp_replacement_open_idx on public.kc_dp_replacement_requests(org_id,project_id,status,service_date);
alter table public.kc_dp_replacement_requests enable row level security;
alter table public.kc_dp_replacement_responses enable row level security;
revoke all on public.kc_dp_replacement_requests from public, anon, authenticated;
revoke all on public.kc_dp_replacement_responses from public, anon, authenticated;

create or replace function public.kc_dp_accept_replacement(p_request_id uuid, p_user_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.kc_dp_replacement_requests%rowtype; m public.kc_dp_memberships%rowtype; outcome text;
begin
  select * into r from public.kc_dp_replacement_requests where id=p_request_id for update;
  if not found then raise exception 'Vertretungsanfrage nicht gefunden'; end if;
  select * into m from public.kc_dp_memberships where org_id=r.org_id and user_id=p_user_id and active=true;
  if not found or m.person_id is null or not (m.person_id=any(r.invited_person_ids)) then raise exception 'Nicht für diese Anfrage eingeladen'; end if;
  if not p_accept then
    insert into public.kc_dp_replacement_responses values(r.id,m.person_id,p_user_id,'declined',now()) on conflict(request_id,person_id) do update set response='declined',created_at=now();
    return jsonb_build_object('status','declined','requestId',r.id);
  end if;
  if r.status<>'open' or r.expires_at<=now() then
    insert into public.kc_dp_replacement_responses values(r.id,m.person_id,p_user_id,'too_late',now()) on conflict(request_id,person_id) do update set response='too_late',created_at=now();
    return jsonb_build_object('status','too_late','assignedPersonId',r.assigned_person_id);
  end if;
  update public.kc_dp_replacement_requests set status='filled',assigned_person_id=m.person_id,accepted_at=now() where id=r.id;
  insert into public.kc_dp_replacement_responses values(r.id,m.person_id,p_user_id,'accepted',now()) on conflict(request_id,person_id) do update set response='accepted',created_at=now();
  return jsonb_build_object('status','accepted','requestId',r.id,'personId',m.person_id,'date',r.service_date,'start',left(r.start_time::text,5),'end',left(r.end_time::text,5),'area',r.area,'zone',r.zone);
end $$;
revoke all on function public.kc_dp_accept_replacement(uuid,uuid,boolean) from public, anon, authenticated;
