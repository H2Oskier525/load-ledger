-- Load Ledger initial schema
-- Every table: client-generated UUID, user_id for RLS, updated_at for sync, deleted_at for soft delete (offline-safe).

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create table public.rifles (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  manufacturer text, model text, caliber text,
  barrel_length_inches numeric, twist_rate text,
  barrel_round_count integer default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.components (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('bullet','powder','primer','case')),
  manufacturer text, product_name text not null, caliber_or_size text,
  weight_grains numeric, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.component_lots (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  component_id uuid not null references public.components(id) on delete cascade,
  lot_number text not null, purchase_date date, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.load_recipes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rifle_id uuid references public.rifles(id) on delete set null,
  name text not null,
  cartridge text,
  bullet_lot_id uuid references public.component_lots(id) on delete set null,
  powder_lot_id uuid references public.component_lots(id) on delete set null,
  primer_lot_id uuid references public.component_lots(id) on delete set null,
  case_lot_id uuid references public.component_lots(id) on delete set null,
  powder_charge_grains numeric,
  cartridge_overall_length_inches numeric,
  base_to_ogive_inches numeric,
  bullet_jump_inches numeric,
  case_firing_count integer,
  neck_tension_inches numeric,
  trim_length_inches numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.range_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rifle_id uuid references public.rifles(id) on delete set null,
  session_date date not null default current_date,
  range_name text, location text, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.firing_strings (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  range_session_id uuid not null references public.range_sessions(id) on delete cascade,
  load_recipe_id uuid references public.load_recipes(id) on delete set null,
  label text,
  target_distance_yards numeric,
  group_size_inches numeric,
  vertical_spread_inches numeric,
  horizontal_spread_inches numeric,
  target_photo_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.shots (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  firing_string_id uuid not null references public.firing_strings(id) on delete cascade,
  shot_number integer not null,
  muzzle_velocity_fps numeric,
  is_excluded boolean not null default false,
  exclusion_reason text, notes text,
  source text not null default 'manual' check (source in ('manual','labradar_csv','labradar_ble')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.environmental_snapshots (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  firing_string_id uuid not null references public.firing_strings(id) on delete cascade,
  captured_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual','kestrel','import')),
  temperature_f numeric, relative_humidity_percent numeric,
  station_pressure_inhg numeric, density_altitude_ft numeric,
  wind_speed_mph numeric, wind_direction_degrees numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

do $$
declare t text;
begin
  foreach t in array array['rifles','components','component_lots','load_recipes','range_sessions','firing_strings','shots','environmental_snapshots'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()', t, t);
    execute format('create index %I on public.%I (user_id, updated_at)', t || '_sync_idx', t);
  end loop;
end $$;

create index on public.component_lots (component_id);
create index on public.load_recipes (rifle_id);
create index on public.range_sessions (rifle_id);
create index on public.firing_strings (range_session_id);
create index on public.firing_strings (load_recipe_id);
create index on public.shots (firing_string_id);
create index on public.environmental_snapshots (firing_string_id);

-- Private bucket for target photos and LabRadar CSVs; files stored under <user_id>/...
insert into storage.buckets (id, name, public) values ('range-files', 'range-files', false)
on conflict (id) do nothing;

create policy "own files read" on storage.objects for select to authenticated
  using (bucket_id = 'range-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files write" on storage.objects for insert to authenticated
  with check (bucket_id = 'range-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'range-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
