alter table public.load_recipes add column if not exists bullet_id uuid references public.components(id) on delete set null, add column if not exists powder_id uuid references public.components(id) on delete set null, add column if not exists primer_id uuid references public.components(id) on delete set null, add column if not exists case_id uuid references public.components(id) on delete set null;
alter table public.components add column if not exists catalog_key text, add column if not exists is_quick_add boolean not null default false, add column if not exists bullet_diameter_inches numeric, add column if not exists bullet_type text;
alter table public.rifles add column if not exists cartridge text;
create index if not exists load_recipes_cartridge_idx on public.load_recipes (user_id, cartridge);
create table if not exists public.user_settings (user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade, settings jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
alter table public.user_settings enable row level security;
create policy "own settings" on public.user_settings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
