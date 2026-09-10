begin;
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.lead_demo_leads (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  lead jsonb not null,
  attempt text not null,
  lease_until timestamptz not null default now() + interval '90 seconds',
  result jsonb,
  notification text not null default 'pending' check (notification in ('pending','sent','failed','unknown','not_configured')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.lead_demo_leads enable row level security;
revoke all on public.lead_demo_leads from public, anon, authenticated;
grant select, insert, update, delete on public.lead_demo_leads to service_role;
create index if not exists lead_demo_created on public.lead_demo_leads(created_at);

create or replace function public.lead_demo_claim(p_lead jsonb, p_attempt text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare f text; r public.lead_demo_leads%rowtype;
begin
  if jsonb_typeof(p_lead) <> 'object' or length(p_lead::text) > 12000 or length(p_attempt) > 100 then
    raise exception 'Invalid lead';
  end if;
  f := encode(extensions.digest(p_lead::text, 'sha256'), 'hex');
  -- Serialize only the small reservation transaction: global daily quota and dedup are atomic.
  perform pg_advisory_xact_lock(813504726);
  select * into r from public.lead_demo_leads where fingerprint = f for update;
  if found then
    if r.result is not null then
      return jsonb_build_object('state','duplicate','id',r.id,'result',r.result || jsonb_build_object('notification',r.notification));
    end if;
    if r.lease_until > now() and r.attempt <> p_attempt then
      return jsonb_build_object('state','busy');
    end if;
    update public.lead_demo_leads set attempt=p_attempt, lease_until=now()+interval '90 seconds', updated_at=now() where id=r.id;
    return jsonb_build_object('state','claimed','id',r.id);
  end if;
  if (select count(*) from public.lead_demo_leads where created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') >= 100 then
    return jsonb_build_object('state','limit');
  end if;
  insert into public.lead_demo_leads(fingerprint,lead,attempt) values(f,p_lead,p_attempt) returning * into r;
  return jsonb_build_object('state','claimed','id',r.id);
end $$;

create or replace function public.lead_demo_finish(p_id uuid,p_attempt text,p_result jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.lead_demo_leads%rowtype;
begin
  update public.lead_demo_leads set result=p_result,updated_at=now()
    where id=p_id and attempt=p_attempt and result is null returning * into r;
  if not found then
    select * into r from public.lead_demo_leads where id=p_id and attempt=p_attempt and result is not null;
  end if;
  if r.id is null then return jsonb_build_object('state','conflict'); end if;
  return jsonb_build_object('state','saved','id',r.id,'result',r.result);
end $$;

create or replace function public.lead_demo_notification(p_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('sent','failed','unknown','not_configured') then raise exception 'Invalid status'; end if;
  update public.lead_demo_leads set notification=p_status,updated_at=now() where id=p_id and notification='pending';
  return jsonb_build_object('recorded',found);
end $$;
revoke all on function public.lead_demo_claim(jsonb,text) from public,anon,authenticated;
revoke all on function public.lead_demo_finish(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.lead_demo_notification(uuid,text) from public,anon,authenticated;
grant execute on function public.lead_demo_claim(jsonb,text) to service_role;
grant execute on function public.lead_demo_finish(uuid,text,jsonb) to service_role;
grant execute on function public.lead_demo_notification(uuid,text) to service_role;
notify pgrst, 'reload schema';
commit;
