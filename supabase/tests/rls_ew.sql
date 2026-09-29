-- RLS test for the English words tables. Rolled back at the end.
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ew-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ew-b@test.local');

-- The shared dictionary was seeded by migrations.
do $$
declare n int;
begin
  select count(*) into n from public.ew_words where owner_id is null;
  if n < 300 then raise exception 'FAIL: only % shared words seeded', n; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

do $$
declare v_shared uuid; v_custom uuid; n int;
begin
  select id into v_shared from public.ew_words where owner_id is null order by sort_order limit 1;

  -- A can add a custom word (owner defaults to A) and see it plus the shared dictionary.
  insert into public.ew_words (term, translation_uk) values ('a-secret-word', 'секрет') returning id into v_custom;
  perform set_config('test.custom_a', v_custom::text, true);
  select count(*) into n from public.ew_words;
  if n < 301 then raise exception 'FAIL: A should see shared + own words (%)', n; end if;

  -- A cannot write to the shared dictionary or impersonate an owner.
  begin
    insert into public.ew_words (owner_id, term, translation_uk) values (null, 'injected', 'x');
    raise exception 'FAIL: inserted a shared word';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ew_words (owner_id, term, translation_uk)
    values ('00000000-0000-0000-0000-0000000000b1', 'forged', 'x');
    raise exception 'FAIL: inserted a word owned by B';
  exception when insufficient_privilege then null; end;
  update public.ew_words set translation_uk = 'hacked' where id = v_shared;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: updated a shared word'; end if;
  delete from public.ew_words where id = v_shared;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: deleted a shared word'; end if;

  -- Learning state, reviews and settings.
  insert into public.ew_user_words (word_id, due_on, reps, status) values (v_shared, current_date, 1, 'learning');
  insert into public.ew_user_words (word_id, due_on, reps, status) values (v_custom, current_date, 1, 'learning');
  insert into public.ew_reviews (word_id, reviewed_on, kind, correct) values (v_shared, current_date, 'choose', true);
  insert into public.ew_settings (words_per_day) values (12);

  -- The answer log is append-only.
  begin
    update public.ew_reviews set correct = false;
    raise exception 'FAIL: review log was updatable';
  exception when insufficient_privilege then null; end;
end $$;

-- User B sees the shared words but nothing of A's.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

do $$
declare n int; v_custom uuid := current_setting('test.custom_a')::uuid;
begin
  select count(*) into n from public.ew_words where owner_id is not null;
  if n <> 0 then raise exception 'FAIL: B sees % custom words of A', n; end if;
  select count(*) into n from public.ew_user_words;
  if n <> 0 then raise exception 'FAIL: B sees % user_words', n; end if;
  select count(*) into n from public.ew_reviews;
  if n <> 0 then raise exception 'FAIL: B sees % reviews', n; end if;
  select count(*) into n from public.ew_settings;
  if n <> 0 then raise exception 'FAIL: B sees A settings'; end if;

  -- B cannot attach to, edit or delete A's custom word.
  begin
    insert into public.ew_user_words (word_id, due_on, reps) values (v_custom, current_date, 1);
    raise exception 'FAIL: B linked to A custom word';
  exception when insufficient_privilege then null; end;
  update public.ew_words set translation_uk = 'hacked' where id = v_custom;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B updated A custom word'; end if;
  delete from public.ew_words where id = v_custom;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B deleted A custom word'; end if;
end $$;

-- Anonymous clients get nothing.
reset role;
set local role anon;
do $$
begin
  perform 1 from public.ew_words limit 1;
  raise exception 'FAIL: anon can read ew_words';
exception when insufficient_privilege then null; end $$;

rollback;
select 'rls_ew: ok' as result;
