-- Isolation test for the `avatars` bucket and profiles.avatar_url. Run against a local/test DB:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_avatars.sql
-- Everything runs in a transaction and is rolled back.
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local');

-- B owns a file (inserted as the table owner, bypassing RLS).
insert into storage.objects (bucket_id, name, owner)
values ('avatars', '00000000-0000-0000-0000-00000000000b/avatar.png', '00000000-0000-0000-0000-00000000000b');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare n int;
begin
  -- A cannot see B's file.
  select count(*) into n from storage.objects where bucket_id = 'avatars';
  if n <> 0 then raise exception 'FAIL: user A sees % avatar objects of others', n; end if;

  -- A can write into their own folder...
  insert into storage.objects (bucket_id, name, owner)
  values ('avatars', '00000000-0000-0000-0000-00000000000a/avatar.png', '00000000-0000-0000-0000-00000000000a');

  -- ...but not into B's folder.
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('avatars', '00000000-0000-0000-0000-00000000000b/evil.png', '00000000-0000-0000-0000-00000000000a');
    raise exception 'FAIL: user A wrote into user B folder';
  exception when others then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  -- A cannot delete B's file.
  delete from storage.objects where name = '00000000-0000-0000-0000-00000000000b/avatar.png';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user A deleted user B file'; end if;

  -- avatar_url must point into the caller's own folder.
  update public.profiles set avatar_url = '00000000-0000-0000-0000-00000000000a/avatar.png' where id = auth.uid();
  begin
    update public.profiles set avatar_url = '00000000-0000-0000-0000-00000000000b/avatar.png' where id = auth.uid();
    raise exception 'FAIL: avatar_url may point to another user folder';
  exception when check_violation then
    null;
  end;

  raise notice 'PASS: avatars RLS isolation';
end $$;

rollback;
