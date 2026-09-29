-- Stats RPCs + achievements engine + RLS isolation. Rolled back at the end.
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare
  v_task uuid; r jsonb; ids text[]; n int; s jsonb; v_today date;
begin
  perform public.ensure_daily_plan('[{"module_id":"dashboard","task_key":"checkin","title_key":"dashboard:task","xp":5,"estimated_minutes":3}]');
  select id into v_task from public.daily_tasks limit 1;
  perform public.report_task_progress(v_task, 1);   -- 5 XP + 10 day bonus, first streak day
  v_today := public.study_day();

  -- summary numbers
  s := public.get_stats_summary(v_today, v_today);
  if (s ->> 'total_xp')::int <> 15 then raise exception 'FAIL: total_xp %', s; end if;
  if (s ->> 'range_xp')::int <> 15 then raise exception 'FAIL: range_xp %', s; end if;
  if (s ->> 'days_studied')::int <> 1 then raise exception 'FAIL: days_studied %', s; end if;
  if (s ->> 'tasks_done')::int <> 1 then raise exception 'FAIL: tasks_done %', s; end if;
  if (s ->> 'study_minutes')::int <> 3 then raise exception 'FAIL: study_minutes %', s; end if;

  -- an earlier range is empty
  s := public.get_stats_summary(v_today - 30, v_today - 1);
  if (s ->> 'range_xp')::int <> 0 then raise exception 'FAIL: earlier range_xp %', s; end if;

  -- per-day series is sparse and correct
  r := public.get_daily_stats(v_today - 6, v_today);
  if jsonb_array_length(r) <> 1 or (r -> 0 ->> 'xp')::int <> 15 then raise exception 'FAIL: daily stats %', r; end if;

  -- oversized / inverted ranges are rejected
  begin
    perform public.get_daily_stats(v_today - 1000, v_today);
    raise exception 'FAIL: huge range allowed';
  exception when others then
    if sqlerrm not like '%invalid range%' then raise; end if;
  end;

  -- achievements: unlocked once, never twice
  ids := public.check_core_achievements();
  if not ('first-day' = any (ids)) then raise exception 'FAIL: first-day not unlocked (%)', ids; end if;
  if 'streak-3' = any (ids) then raise exception 'FAIL: streak-3 unlocked too early'; end if;
  ids := public.check_core_achievements();
  if coalesce(array_length(ids, 1), 0) <> 0 then raise exception 'FAIL: achievements re-unlocked (%)', ids; end if;
  ids := public.ew_check_achievements();
  if coalesce(array_length(ids, 1), 0) <> 0 then raise exception 'FAIL: ew achievements unlocked without words (%)', ids; end if;
  select count(*) into n from public.achievements_unlocked;
  if n <> 1 then raise exception 'FAIL: expected 1 unlocked, got %', n; end if;

  -- clients cannot write or grant achievements themselves
  begin
    insert into public.achievements_unlocked (achievement_id) values ('streak-30');
    raise exception 'FAIL: direct achievement insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.grant_achievement(auth.uid(), 'streak-30');
    raise exception 'FAIL: grant_achievement callable by client';
  exception when insufficient_privilege then null; end;

  -- ew stats
  r := public.ew_get_stats(v_today - 6, v_today);
  if (r ->> 'range_words')::int <> 0 or (r ->> 'known')::int <> 0 then raise exception 'FAIL: ew stats %', r; end if;
end $$;

-- user B sees nothing of A's achievements and has empty stats
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

do $$
declare n int; s jsonb;
begin
  select count(*) into n from public.achievements_unlocked;
  if n <> 0 then raise exception 'FAIL: B sees % achievements', n; end if;
  s := public.get_stats_summary(current_date - 365, current_date);
  if (s ->> 'total_xp')::int <> 0 then raise exception 'FAIL: B sees A''s xp %', s; end if;

  raise notice 'PASS: stats + achievements + RLS isolation';
end $$;

rollback;
