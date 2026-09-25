alter table public.component_lots add column if not exists quantity integer, add column if not exists times_fired integer, add column if not exists last_annealed_after integer, add column if not exists retire_after integer, add column if not exists prep_notes text;
alter table public.load_recipes add column if not exists intended_use text;
create table if not exists public.library_notes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null, body text, source_type text not null default 'my_note', source_url text,
  cartridge text, component_ref text, tags text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
alter table public.library_notes enable row level security;
create policy "own rows select" on public.library_notes for select to authenticated using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.library_notes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.library_notes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows delete" on public.library_notes for delete to authenticated using ((select auth.uid()) = user_id);
create trigger touch_library_notes before update on public.library_notes for each row execute function public.touch_updated_at();
create index library_notes_sync_idx on public.library_notes (user_id, updated_at);
