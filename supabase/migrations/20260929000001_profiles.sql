-- Phase 2: profiles + RLS, health RPC.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  bio text not null default '' check (char_length(bio) <= 160),
  avatar_emoji text not null default '🌻' check (char_length(avatar_emoji) <= 16),
  avatar_url text,
  timezone text not null default 'Europe/Kyiv' check (char_length(timezone) <= 64),
  day_rollover_hour smallint not null default 4 check (day_rollover_hour between 0 and 23),
  locale text not null default 'uk' check (locale in ('uk', 'en')),
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  role text not null default 'user' check (role in ('user', 'admin')),
  enabled_modules text[] not null default '{}',
  daily_goal_xp integer not null default 50 check (daily_goal_xp between 0 and 10000),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may read and update only their own row. Inserts happen via the signup trigger only.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- `role` may only be changed by the service role.
create function public.protect_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'role can only be changed by the service role';
  end if;
  if new.id is distinct from old.id then
    raise exception 'id is immutable';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Auto-create a profile for every new (invited) user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Public health check used by the keep-alive workflow (reveals nothing).
create function public.health()
returns text
language sql
stable
security invoker
set search_path = ''
as $$ select 'ok'::text $$;

grant execute on function public.health() to anon, authenticated;
