-- RLS + engine test for daily_plans / daily_tasks / xp_events / streaks. Rolled back at the end.
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
declare
  v_plan uuid; v_plan2 uuid; v_task uuid; r jsonb; n int; s jsonb;
begin
  v_plan := public.ensure_daily_plan('[{"module_id":"dashboard","task_key":"checkin","title_key":"dashboard:task","xp":5}]');
  v_plan2 := public.ensure_daily_plan('[{"module_id":"dashboard","task_key":"checkin","title_key":"dashboard:task","xp":5}]');
  if v_plan <> v_plan2 then raise exception 'FAIL: plan not idempotent'; end if;
  select count(*) into n from public.daily_tasks;
  if n <> 1 then raise exception 'FAIL: duplicated tasks (%)', n; end if;

  select id into v_task from public.daily_tasks limit 1;
  perform set_config('test.task_a', v_task::text, true);
  r := public.report_task_progress(v_task, 1);
  if not (r ->> 'day_completed')::boolean then raise exception 'FAIL: day should be complete'; end if;
  r := public.report_task_progress(v_task, 1);   -- replay must not double-award
  s := public.get_xp_summary();
  if (s ->> 'total_xp')::int <> 15 then raise exception 'FAIL: xp % (expected 5 + 10 bonus)', s; end if;
  select current into n from public.streaks;
  if n <> 1 then raise exception 'FAIL: streak % (expected 1)', n; end if;

  -- clients cannot write directly
  begin
    insert into public.xp_events (source_module, source_ref, amount) values ('x', 'y', 999);
    raise exception 'FAIL: direct xp insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.streaks set current = 999;
    raise exception 'FAIL: direct streak update allowed';
  exception when insufficient_privilege then null; end;
end $$;

-- user B sees nothing of A's data and cannot touch A's task
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

do $$
declare n int; v_task uuid;
begin
  select count(*) into n from public.daily_plans;
  if n <> 0 then raise exception 'FAIL: B sees % plans', n; end if;
  select count(*) into n from public.daily_tasks;
  if n <> 0 then raise exception 'FAIL: B sees % tasks', n; end if;
  select count(*) into n from public.xp_events;
  if n <> 0 then raise exception 'FAIL: B sees % xp events', n; end if;
  select count(*) into n from public.streaks;
  if n <> 0 then raise exception 'FAIL: B sees % streaks', n; end if;

  v_task := current_setting('test.task_a')::uuid;
  begin
    perform public.report_task_progress(v_task, 1);
    raise exception 'FAIL: B completed A''s task';
  exception when others then
    if sqlerrm not like '%task not found%' then raise; end if;
  end;

  raise notice 'PASS: daily engine + RLS isolation';
end $$;

rollback;
