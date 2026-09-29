-- Phase 5 (core): stats RPCs and the achievements engine.
-- Achievements are unlocked only by security-definer functions; clients can only read their own rows.

create table public.achievements_unlocked (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  achievement_id text not null check (achievement_id ~ '^[a-z][a-z0-9-]{0,63}$'),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.achievements_unlocked enable row level security;

create policy "achievements_unlocked: read own" on public.achievements_unlocked
  for select to authenticated using (auth.uid() = user_id);

revoke all on public.achievements_unlocked from anon;
revoke insert, update, delete, truncate on public.achievements_unlocked from authenticated;

-- Internal helper: unlocks one achievement, returns true only the first time.
create function public.grant_achievement(p_uid uuid, p_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  insert into public.achievements_unlocked (user_id, achievement_id)
  values (p_uid, p_id)
  on conflict (user_id, achievement_id) do nothing;
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke all on function public.grant_achievement(uuid, text) from public, anon, authenticated;

-- Evaluates the core rules (streaks, XP, levels, completed days/tasks); returns newly unlocked ids.
-- Idempotent: safe to call after any event or whenever the stats page opens.
create function public.check_core_achievements()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_new text[] := '{}';
  v_xp bigint;
  v_days integer;
  v_tasks integer;
  v_best integer;
  v_level integer;
  r record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select coalesce(sum(amount), 0) into v_xp from public.xp_events where user_id = v_uid;
  select count(*) into v_days from public.daily_plans where user_id = v_uid and completed_at is not null;
  select count(*) into v_tasks from public.daily_tasks where user_id = v_uid and completed_at is not null;
  select coalesce(max(longest), 0) into v_best from public.streaks where user_id = v_uid;
  -- Inverse of xpForLevel(l) = 25 * (l - 1) * l  (src/core/gamification/levels.ts)
  v_level := floor((1 + sqrt(1 + 4 * v_xp / 25.0)) / 2);

  for r in
    select t.id from (values
      ('first-day', v_days >= 1),
      ('days-10', v_days >= 10),
      ('days-50', v_days >= 50),
      ('streak-3', v_best >= 3),
      ('streak-7', v_best >= 7),
      ('streak-14', v_best >= 14),
      ('streak-30', v_best >= 30),
      ('xp-100', v_xp >= 100),
      ('xp-500', v_xp >= 500),
      ('xp-1000', v_xp >= 1000),
      ('xp-2500', v_xp >= 2500),
      ('level-4', v_level >= 4),
      ('level-7', v_level >= 7),
      ('level-10', v_level >= 10),
      ('tasks-25', v_tasks >= 25),
      ('tasks-100', v_tasks >= 100)
    ) as t (id, ok)
    where t.ok
  loop
    if public.grant_achievement(v_uid, r.id) then v_new := v_new || r.id; end if;
  end loop;

  return v_new;
end;
$$;

-- The caller's study day for an instant (timezone + rollover hour from the profile).
create function public.xp_study_day(p_ts timestamptz)
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select ((p_ts at time zone p.timezone) - make_interval(hours => p.day_rollover_hour))::date
  from public.profiles p
  where p.id = auth.uid()
$$;

-- Summary numbers for a range of study days (inclusive). All time = pass an early p_from.
create function public.get_stats_summary(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_to < p_from then raise exception 'invalid range'; end if;

  return jsonb_build_object(
    'total_xp', coalesce((select sum(amount) from public.xp_events where user_id = auth.uid()), 0),
    'range_xp', coalesce((
      select sum(q.amount)
      from (select public.xp_study_day(created_at) as day, amount
            from public.xp_events where user_id = auth.uid()) q
      where q.day between p_from and p_to
    ), 0),
    'days_studied', (
      select count(distinct p.study_day)
      from public.daily_tasks t
      join public.daily_plans p on p.id = t.plan_id
      where t.user_id = auth.uid() and t.completed_at is not null
        and p.study_day between p_from and p_to
    ),
    'tasks_done', (
      select count(*)
      from public.daily_tasks t
      join public.daily_plans p on p.id = t.plan_id
      where t.user_id = auth.uid() and t.completed_at is not null
        and p.study_day between p_from and p_to
    ),
    'study_minutes', coalesce((
      select sum(t.estimated_minutes)
      from public.daily_tasks t
      join public.daily_plans p on p.id = t.plan_id
      where t.user_id = auth.uid() and t.completed_at is not null
        and p.study_day between p_from and p_to
    ), 0)
  );
end;
$$;

-- Sparse per-day series (only days with activity): [{day, xp, tasks}], at most ~13 months.
create function public.get_daily_stats(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'invalid range';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object('day', d.day, 'xp', d.xp, 'tasks', d.tasks) order by d.day)
    from (
      select coalesce(x.day, t.day) as day, coalesce(x.xp, 0)::int as xp, coalesce(t.n, 0)::int as tasks
      from (
        select q.day, sum(q.amount) as xp
        from (select public.xp_study_day(created_at) as day, amount
              from public.xp_events where user_id = auth.uid()) q
        where q.day between p_from and p_to
        group by q.day
      ) x
      full join (
        select p.study_day as day, count(*) as n
        from public.daily_tasks t
        join public.daily_plans p on p.id = t.plan_id
        where t.user_id = auth.uid() and t.completed_at is not null
          and p.study_day between p_from and p_to
        group by p.study_day
      ) t on t.day = x.day
    ) d
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.check_core_achievements() from public, anon;
revoke all on function public.xp_study_day(timestamptz) from public, anon;
revoke all on function public.get_stats_summary(date, date) from public, anon;
revoke all on function public.get_daily_stats(date, date) from public, anon;
grant execute on function public.check_core_achievements() to authenticated;
grant execute on function public.xp_study_day(timestamptz) to authenticated;
grant execute on function public.get_stats_summary(date, date) to authenticated;
grant execute on function public.get_daily_stats(date, date) to authenticated;
