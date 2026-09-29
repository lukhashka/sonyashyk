-- RLS isolation test for `profiles`. Run against a local/test DB:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/rls_profiles.sql
-- Everything runs in a transaction and is rolled back.
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local');
-- profiles are created by the on_auth_user_created trigger

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare n int;
begin
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'FAIL: user A sees % profiles (expected 1)', n; end if;

  update public.profiles set display_name = 'hacked'
    where id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user A updated user B'; end if;

  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'FAIL: user A escalated to admin';
  exception when others then
    if sqlerrm not like '%service role%' then raise; end if;
  end;

  raise notice 'PASS: profiles RLS isolation';
end $$;

rollback;
