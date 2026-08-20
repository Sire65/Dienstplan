-- KC DP2 V0.19.56 – sichere Vault-Brücke für Mail-Zugangsdaten
-- Nur service_role darf lesen/schreiben. Browser erhalten niemals Klartext-Secrets.

create table if not exists public.kc_dp_mail_secret_audit (
  id uuid primary key default gen_random_uuid(),
  secret_name text not null,
  actor uuid,
  action text not null check (action in ('create','update','ensure')),
  created_at timestamptz not null default now()
);
alter table public.kc_dp_mail_secret_audit enable row level security;
revoke all on public.kc_dp_mail_secret_audit from anon, authenticated;
grant all on public.kc_dp_mail_secret_audit to service_role;

create or replace function public.kc_dp_mail_secret_set(p_name text,p_secret text,p_actor uuid default null)
returns uuid
language plpgsql
security definer
set search_path=public,vault,pg_temp
as $$
declare v_id uuid; v_action text;
begin
  if coalesce(trim(p_name),'')='' or coalesce(p_secret,'')='' then raise exception 'secret name/value required'; end if;
  select id into v_id from vault.decrypted_secrets where name=p_name order by created_at desc limit 1;
  if v_id is null then
    select vault.create_secret(p_secret,p_name,'KC DP2 managed mail secret') into v_id;
    v_action:='create';
  else
    perform vault.update_secret(v_id,p_secret,p_name,'KC DP2 managed mail secret');
    v_action:='update';
  end if;
  insert into public.kc_dp_mail_secret_audit(secret_name,actor,action) values(p_name,p_actor,v_action);
  return v_id;
end$$;

create or replace function public.kc_dp_mail_secret_ensure(p_name text,p_secret text,p_actor uuid default null)
returns boolean
language plpgsql
security definer
set search_path=public,vault,pg_temp
as $$
declare v_id uuid;
begin
  select id into v_id from vault.decrypted_secrets where name=p_name order by created_at desc limit 1;
  if v_id is not null then return false; end if;
  perform vault.create_secret(p_secret,p_name,'KC DP2 managed mail secret');
  insert into public.kc_dp_mail_secret_audit(secret_name,actor,action) values(p_name,p_actor,'ensure');
  return true;
end$$;

create or replace function public.kc_dp_mail_secret_status()
returns jsonb
language sql
security definer
set search_path=public,vault,pg_temp
as $$
  select jsonb_build_object(
    'resendWebhook',exists(select 1 from vault.decrypted_secrets where name='kc_dp_resend_webhook_secret'),
    'resendApi',exists(select 1 from vault.decrypted_secrets where name='kc_dp_resend_api_key'),
    'mailAttachment',exists(select 1 from vault.decrypted_secrets where name='kc_dp_mail_attachment_key_b64')
  )
$$;

create or replace function public.kc_dp_mail_secret_get_service(p_name text)
returns text
language sql
security definer
set search_path=public,vault,pg_temp
as $$
  select decrypted_secret from vault.decrypted_secrets where name=p_name order by created_at desc limit 1
$$;

revoke all on function public.kc_dp_mail_secret_set(text,text,uuid) from public,anon,authenticated;
revoke all on function public.kc_dp_mail_secret_ensure(text,text,uuid) from public,anon,authenticated;
revoke all on function public.kc_dp_mail_secret_status() from public,anon,authenticated;
revoke all on function public.kc_dp_mail_secret_get_service(text) from public,anon,authenticated;
grant execute on function public.kc_dp_mail_secret_set(text,text,uuid) to service_role;
grant execute on function public.kc_dp_mail_secret_ensure(text,text,uuid) to service_role;
grant execute on function public.kc_dp_mail_secret_status() to service_role;
grant execute on function public.kc_dp_mail_secret_get_service(text) to service_role;
