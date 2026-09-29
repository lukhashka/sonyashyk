-- Phase 3: daily plans/tasks, XP ledger, streaks. All writes go through security-definer RPCs;
-- clients only have SELECT on their own rows.

create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  study_day date not null,
  generated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, study_day)
);

create table public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.daily_plans (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id text not null check (module_id ~ '^[a-z][a-z0-9-]{0,39}$'),
  task_key text not null check (char_length(task_key) between 1 and 64),
  title_key text not null check (char_length(title_key) between 1 and 100),
  emoji text check (char_length(emoji) <= 16),
  route text check (char_length(route) <= 200),
  xp integer not null check (xp between 0 and 100),
  estimated_minutes integer check (estimated_minutes between 0 and 600),
  target integer not null default 1 check (target between 1 and 1000),
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  unique (plan_id, module_id, task_key)
);

create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_module text not null check (char_length(source_module) between 1 and 40),
  source_ref text not null check (char_length(source_ref) between 1 and 100),
  amount integer not null check (amount between 0 and 1000),
  created_at timestamptz not null default now(),
  unique (user_id, source_module, source_ref)
);

create table public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current integer not null default 0 check (current >= 0),
  longest integer not null default 0 check (longest >= 0),
  last_completed_day date,
  freezes_available integer not null default 0 check (freezes_available between 0 and 2)
);

create index daily_tasks_plan_idx on public.daily_tasks (plan_id);
create index xp_events_user_idx on public.xp_events (user_id, created_at);

alter table public.daily_plans enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.xp_events enable row level security;
alter table public.streaks enable row level security;

create policy "daily_plans: read own" on public.daily_plans
  for select to authenticated using (auth.uid() = user_id);
create policy "daily_tasks: read own" on public.daily_tasks
  for select to authenticated using (auth.uid() = user_id);
create policy "xp_events: read own" on public.xp_events
  for select to authenticated using (auth.uid() = user_id);
create policy "streaks: read own" on public.streaks
  for select to authenticated using (auth.uid() = user_id);

-- No insert/update/delete policies: clients cannot write. Belt and braces:
revoke insert, update, delete, truncate on
  public.daily_plans, public.daily_tasks, public.xp_events, public.streaks
  from anon, authenticated;

-- Today's "study day" in the caller's timezone, honouring the rollover hour.
create function public.study_day()
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select ((now() at time zone p.timezone) - make_interval(hours => p.day_rollover_hour))::date
  from public.profiles p
  where p.id = auth.uid()
$$;

-- Idempotently creates today's plan and adds any not-yet-known tasks.
-- p_tasks: [{module_id, task_key, title_key, emoji?, route?, xp, target?, estimated_minutes?}]
create function public.ensure_daily_plan(p_tasks jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day date;
  v_plan uuid;
  v_done timestamptz;
  t jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if jsonb_typeof(p_tasks) <> 'array' or jsonb_array_length(p_tasks) > 30 then
    raise exception 'invalid tasks';
  end if;

  v_day := public.study_day();
  if v_day is null then raise exception 'profile missing'; end if;

  insert into public.daily_plans (user_id, study_day)
  values (v_uid, v_day)
  on conflict (user_id, study_day) do nothing;

  select id, completed_at into v_plan, v_done
  from public.daily_plans where user_id = v_uid and study_day = v_day;

  -- A finished day is frozen: nothing new can be added to it.
  if v_done is null then
    for t in select * from jsonb_array_elements(p_tasks) loop
      insert into public.daily_tasks
        (plan_id, user_id, module_id, task_key, title_key, emoji, route, xp, estimated_minutes, target)
      values (
        v_plan, v_uid,
        t ->> 'module_id', t ->> 'task_key', t ->> 'title_key',
        t ->> 'emoji', t ->> 'route',
        (t ->> 'xp')::int,
        (t ->> 'estimated_minutes')::int,
        coalesce((t ->> 'target')::int, 1)
      )
      on conflict (plan_id, module_id, task_key) do nothing;
    end loop;
  end if;

  return v_plan;
end;
$$;

-- Streak bookkeeping, called only from report_task_progress when a day is completed.
create function public.bump_streak(p_uid uuid, p_day date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.streaks;
  v_cur integer;
  v_freezes integer;
  v_missed integer;
begin
  select * into s from public.streaks where user_id = p_uid for update;
  if not found then
    insert into public.streaks (user_id, current, longest, last_completed_day, freezes_available)
    values (p_uid, 1, 1, p_day, 0);
    return;
  end if;

  if s.last_completed_day = p_day then return; end if;

  v_freezes := s.freezes_available;
  v_missed := p_day - s.last_completed_day - 1;
  if s.last_completed_day is null then
    v_cur := 1;
  elsif v_missed = 0 then
    v_cur := s.current + 1;
  elsif v_missed > 0 and v_missed <= v_freezes then
    -- Missed days are covered automatically by streak freezes.
    v_freezes := v_freezes - v_missed;
    v_cur := s.current + 1;
  else
    v_cur := 1;
  end if;

  -- One freeze is earned per 7-day streak (max 2).
  if v_cur % 7 = 0 and v_freezes < 2 then v_freezes := v_freezes + 1; end if;

  update public.streaks
  set current = v_cur,
      longest = greatest(longest, v_cur),
      last_completed_day = p_day,
      freezes_available = v_freezes
  where user_id = p_uid;
end;
$$;

revoke all on function public.bump_streak(uuid, date) from public, anon, authenticated;

-- The client reports progress; the server validates, awards XP once, and closes the day.
create function public.report_task_progress(p_task_id uuid, p_progress integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  tk public.daily_tasks;
  pl public.daily_plans;
  v_new integer;
  v_task_done boolean := false;
  v_day_done boolean := false;
  v_bonus constant integer := 10;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_progress is null or p_progress < 0 then raise exception 'invalid progress'; end if;

  select * into tk from public.daily_tasks where id = p_task_id and user_id = v_uid for update;
  if not found then raise exception 'task not found'; end if;
  select * into pl from public.daily_plans where id = tk.plan_id for update;

  -- Only today's tasks can be worked on; earlier days stay as they were.
  if pl.study_day <> public.study_day() or tk.completed_at is not null then
    return jsonb_build_object('task_completed', tk.completed_at is not null, 'day_completed', pl.completed_at is not null);
  end if;

  v_new := least(tk.target, greatest(tk.progress, p_progress));
  update public.daily_tasks set progress = v_new where id = tk.id;

  if v_new >= tk.target then
    update public.daily_tasks set completed_at = now() where id = tk.id;
    v_task_done := true;
    insert into public.xp_events (user_id, source_module, source_ref, amount)
    values (v_uid, tk.module_id, 'task:' || tk.id, tk.xp)
    on conflict (user_id, source_module, source_ref) do nothing;

    if pl.completed_at is null and not exists (
      select 1 from public.daily_tasks where plan_id = pl.id and completed_at is null
    ) then
      update public.daily_plans set completed_at = now() where id = pl.id;
      v_day_done := true;
      insert into public.xp_events (user_id, source_module, source_ref, amount)
      values (v_uid, 'core', 'day:' || pl.id, v_bonus)
      on conflict (user_id, source_module, source_ref) do nothing;
      perform public.bump_streak(v_uid, pl.study_day);
    end if;
  end if;

  return jsonb_build_object('task_completed', v_task_done, 'day_completed', v_day_done);
end;
$$;

-- Totals for the level bar and "XP today vs goal".
create function public.get_xp_summary()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select p.timezone tz, p.day_rollover_hour h from public.profiles p where p.id = auth.uid()
  )
  select jsonb_build_object(
    'total_xp', coalesce((select sum(amount) from public.xp_events where user_id = auth.uid()), 0),
    'today_xp', coalesce((
      select sum(e.amount) from public.xp_events e, me
      where e.user_id = auth.uid()
        and ((e.created_at at time zone me.tz) - make_interval(hours => me.h))::date = public.study_day()
    ), 0)
  )
$$;

revoke all on function public.study_day() from public, anon;
revoke all on function public.ensure_daily_plan(jsonb) from public, anon;
revoke all on function public.report_task_progress(uuid, integer) from public, anon;
revoke all on function public.get_xp_summary() from public, anon;
grant execute on function public.study_day() to authenticated;
grant execute on function public.ensure_daily_plan(jsonb) to authenticated;
grant execute on function public.report_task_progress(uuid, integer) to authenticated;
grant execute on function public.get_xp_summary() to authenticated;
