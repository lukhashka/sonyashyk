-- Schema-wide security guard. Catches a *new* table or function that forgot its RLS / grants,
-- without needing a per-table test first. Run against a local/test DB:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_meta.sql
-- Everything runs in a transaction and is rolled back (safe on a live DB).
begin;

insert into auth.users (id, instance_id, aud, role, email)
values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@test.local');

-- 1. Static checks on the catalog.
do $$
declare bad text;
begin
  select string_agg(c.relname, ', ') into bad
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;
  if bad is not null then raise exception 'FAIL: RLS is disabled on: %', bad; end if;

  select string_agg(c.relname, ', ') into bad
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname);
  if bad is not null then raise exception 'FAIL: RLS enabled but no policy on (table is unreadable): %', bad; end if;

  -- Every public function is closed to `anon`, except the deliberate health() probe.
  select string_agg(p.oid::regprocedure::text, ', ') into bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    and p.proname <> 'health'
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    and has_function_privilege('anon', p.oid, 'execute');
  if bad is not null then raise exception 'FAIL: anon can execute: %', bad; end if;

  -- security definer functions must pin their search_path (no search-path hijacking).
  select string_agg(p.oid::regprocedure::text, ', ') into bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');
  if bad is not null then raise exception 'FAIL: security definer without search_path: %', bad; end if;

  raise notice 'PASS: catalog checks';
end $$;

-- 2. Behaviour as an anonymous visitor: nothing readable, nothing writable.
set local role anon;

do $$
declare t text; n bigint;
begin
  for t in select c.relname from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
           where ns.nspname = 'public' and c.relkind in ('r', 'p') loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      if n <> 0 then raise exception 'FAIL: anon reads % rows of %', n, t; end if;
      execute format('delete from public.%I', t);
      get diagnostics n = row_count;
      if n <> 0 then raise exception 'FAIL: anon deleted % rows of %', n, t; end if;
    exception when insufficient_privilege then null;   -- denied outright is fine too
    end;
  end loop;
  raise notice 'PASS: anon sees and changes nothing';
end $$;

reset role;

-- 3. A brand-new signed-in user owns nothing, so they may only see the shared dictionary
--    (ew_words with owner_id null) and their own auto-created profile.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

do $$
declare t text; n bigint;
begin
  for t in select c.relname from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
           where ns.nspname = 'public' and c.relkind in ('r', 'p')
             and c.relname not in ('profiles', 'ew_words') loop
    execute format('select count(*) from public.%I', t) into n;
    if n <> 0 then raise exception 'FAIL: a fresh user sees % rows of %', n, t; end if;
  end loop;

  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'FAIL: a fresh user sees % profiles (expected only their own)', n; end if;

  select count(*) into n from public.ew_words where owner_id is not null;
  if n <> 0 then raise exception 'FAIL: a fresh user sees % private words of others', n; end if;

  raise notice 'PASS: new user sees only shared data';
end $$;

rollback;
