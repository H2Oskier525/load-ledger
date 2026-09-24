-- Applied 2026-09-24. Approval-only sign-ups while the app is web-only, plus multi-chronograph shot sources.
-- To turn approval OFF later (e.g. after app-store launch):  drop trigger enforce_approved_signup on auth.users;
alter table public.shots drop constraint if exists shots_source_check;
alter table public.shots add constraint shots_source_check check (source in ('manual','labradar_csv','garmin_csv','magnetospeed_csv','caldwell_csv','generic_csv','labradar_ble','garmin_ble','magnetospeed_ble','caldwell_ble'));

create table public.app_admins (email text primary key);
alter table public.app_admins enable row level security;
insert into public.app_admins values ('justin@thesells.net');

create or replace function public.is_app_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins a where a.email = lower(coalesce(auth.jwt()->>'email','')));
$$;

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text, reason text,
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  admin_notified_at timestamptz
);
alter table public.access_requests enable row level security;
create policy "admins read" on public.access_requests for select to authenticated using ((select public.is_app_admin()));
create policy "admins update" on public.access_requests for update to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));
insert into public.access_requests (email, full_name, status, decided_at) values ('justin@thesells.net', 'Justin Sell', 'approved', now());

create or replace function public.request_access(p_email text, p_name text, p_reason text) returns text
language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(p_email));
begin
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email'; end if;
  insert into public.access_requests (email, full_name, reason) values (e, left(p_name, 120), left(p_reason, 1000))
  on conflict (email) do nothing;
  return 'received';
end; $$;
revoke all on function public.request_access(text,text,text) from public;
grant execute on function public.request_access(text,text,text) to anon, authenticated;

create or replace function public.enforce_approved_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.access_requests r where r.email = lower(new.email) and r.status = 'approved') then
    raise exception 'ACCESS_NOT_APPROVED';
  end if;
  return new;
end; $$;
create trigger enforce_approved_signup before insert on auth.users for each row execute function public.enforce_approved_signup();
