-- Phase 4: English words module. Tables are prefixed ew_.
--  * ew_words        shared dictionary (owner_id null, read-only for clients) + a user's private custom words
--  * ew_user_words   per-user spaced-repetition state
--  * ew_reviews      answer log (accuracy stats)
--  * ew_settings     per-user module settings

create table public.ew_words (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid() references auth.users (id) on delete cascade,
  term text not null check (char_length(term) between 1 and 80),
  pos text not null default '' check (char_length(pos) <= 30),
  ipa text not null default '' check (char_length(ipa) <= 80),
  translation_uk text not null check (char_length(translation_uk) between 1 and 200),
  definition_en text not null default '' check (char_length(definition_en) <= 400),
  example_en text not null default '' check (char_length(example_en) <= 400),
  topics text[] not null default '{}' check (cardinality(topics) <= 8),
  level text not null default 'B2' check (level in ('B1', 'B2', 'C1')),
  sort_order integer not null default 100000,
  created_at timestamptz not null default now()
);

-- Shared terms are unique; each user's custom terms are unique among their own.
create unique index ew_words_shared_term_idx on public.ew_words (lower(term)) where owner_id is null;
create unique index ew_words_owner_term_idx on public.ew_words (owner_id, lower(term)) where owner_id is not null;
create index ew_words_order_idx on public.ew_words (sort_order);

create table public.ew_user_words (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word_id uuid not null references public.ew_words (id) on delete cascade,
  ease numeric(4, 2) not null default 2.5 check (ease between 1.3 and 4),
  interval_days integer not null default 0 check (interval_days between 0 and 3650),
  due_on date not null,
  reps integer not null default 0 check (reps between 0 and 10000),
  lapses integer not null default 0 check (lapses between 0 and 10000),
  status text not null default 'learning' check (status in ('new', 'learning', 'known')),
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id)
);
create index ew_user_words_due_idx on public.ew_user_words (user_id, due_on);

create table public.ew_reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word_id uuid not null references public.ew_words (id) on delete cascade,
  reviewed_on date not null,
  kind text not null check (kind in ('choose', 'type', 'gap', 'match')),
  correct boolean not null,
  created_at timestamptz not null default now()
);
create index ew_reviews_user_idx on public.ew_reviews (user_id, reviewed_on);

create table public.ew_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  words_per_day integer not null default 10 check (words_per_day between 5 and 20)
);

alter table public.ew_words enable row level security;
alter table public.ew_user_words enable row level security;
alter table public.ew_reviews enable row level security;
alter table public.ew_settings enable row level security;

-- Dictionary: everyone signed in reads the shared words + their own; writes only to their own custom words.
create policy "ew_words: read shared and own" on public.ew_words
  for select to authenticated using (owner_id is null or owner_id = auth.uid());
create policy "ew_words: insert own" on public.ew_words
  for insert to authenticated with check (owner_id = auth.uid());
create policy "ew_words: update own" on public.ew_words
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "ew_words: delete own" on public.ew_words
  for delete to authenticated using (owner_id = auth.uid());

-- Learning state: own rows only, and only for words the user is allowed to see (subselect obeys ew_words RLS).
create policy "ew_user_words: read own" on public.ew_user_words
  for select to authenticated using (user_id = auth.uid());
create policy "ew_user_words: insert own" on public.ew_user_words
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.ew_words w where w.id = word_id));
create policy "ew_user_words: update own" on public.ew_user_words
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ew_user_words: delete own" on public.ew_user_words
  for delete to authenticated using (user_id = auth.uid());

create policy "ew_reviews: read own" on public.ew_reviews
  for select to authenticated using (user_id = auth.uid());
create policy "ew_reviews: insert own" on public.ew_reviews
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.ew_words w where w.id = word_id));

create policy "ew_settings: own" on public.ew_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.ew_words, public.ew_user_words, public.ew_reviews, public.ew_settings from anon;
-- The answer log is append-only for clients.
revoke update, delete, truncate on public.ew_reviews from authenticated;
-- The shared dictionary can never be truncated by a client.
revoke truncate on public.ew_words from authenticated;

-- Keep a user's private dictionary a sensible size.
create function public.ew_limit_custom_words()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is not null
     and (select count(*) from public.ew_words where owner_id = new.owner_id) >= 500 then
    raise exception 'custom word limit reached';
  end if;
  return new;
end;
$$;
revoke all on function public.ew_limit_custom_words() from public, anon, authenticated;

create trigger ew_words_limit before insert on public.ew_words
  for each row execute function public.ew_limit_custom_words();
