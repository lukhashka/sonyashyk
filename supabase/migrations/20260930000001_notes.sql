-- Phase 7: Notes module. Tables are prefixed nt_.
--  * nt_folders  notebooks by subject
--  * nt_notes    Markdown notes (soft delete via deleted_at, archive via archived_at)

create table public.nt_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index nt_folders_user_name_idx on public.nt_folders (user_id, lower(name));

create table public.nt_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  folder_id uuid references public.nt_folders (id) on delete set null,
  title text not null default '' check (char_length(title) <= 200),
  body_md text not null default '' check (char_length(body_md) <= 100000),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  pinned boolean not null default false,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Short excerpt so list views never download whole bodies.
  preview text generated always as (left(body_md, 160)) stored,
  -- Full-text search: 'simple' matches Ukrainian words exactly (Postgres ships no Ukrainian
  -- dictionary), 'english' adds stemming for English text. Tags are filtered separately
  -- (array_to_string is not immutable, so it cannot live in a generated column).
  search tsvector generated always as (
    to_tsvector('simple', title || ' ' || body_md)
    || to_tsvector('english', title || ' ' || body_md)
  ) stored
);
create index nt_notes_user_updated_idx on public.nt_notes (user_id, updated_at desc);
create index nt_notes_folder_idx on public.nt_notes (folder_id);
create index nt_notes_search_idx on public.nt_notes using gin (search);

alter table public.nt_folders enable row level security;
alter table public.nt_notes enable row level security;

create policy "nt_folders: own" on public.nt_folders
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "nt_notes: read own" on public.nt_notes
  for select to authenticated using (user_id = auth.uid());
-- A note may only be filed into one of the user's own folders (the subselect obeys folder RLS).
create policy "nt_notes: insert own" on public.nt_notes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (folder_id is null or exists (select 1 from public.nt_folders f where f.id = folder_id))
  );
create policy "nt_notes: update own" on public.nt_notes
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (folder_id is null or exists (select 1 from public.nt_folders f where f.id = folder_id))
  );
-- Permanent delete is only possible from the trash.
create policy "nt_notes: delete trashed own" on public.nt_notes
  for delete to authenticated using (user_id = auth.uid() and deleted_at is not null);

revoke all on public.nt_folders, public.nt_notes from anon;
revoke truncate on public.nt_folders, public.nt_notes from authenticated;

create function public.nt_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger nt_notes_touch before update on public.nt_notes
  for each row execute function public.nt_touch_updated_at();

-- Keep a user's notebook a sensible size.
create function public.nt_limit_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'nt_notes'
     and (select count(*) from public.nt_notes where user_id = new.user_id) >= 5000 then
    raise exception 'note limit reached';
  end if;
  if tg_table_name = 'nt_folders'
     and (select count(*) from public.nt_folders where user_id = new.user_id) >= 100 then
    raise exception 'folder limit reached';
  end if;
  return new;
end;
$$;
revoke all on function public.nt_limit_rows() from public, anon, authenticated;
create trigger nt_notes_limit before insert on public.nt_notes
  for each row execute function public.nt_limit_rows();
create trigger nt_folders_limit before insert on public.nt_folders
  for each row execute function public.nt_limit_rows();
