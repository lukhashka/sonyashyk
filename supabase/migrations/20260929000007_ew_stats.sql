-- Phase 5 (english-words): stats RPC and module-defined achievements.

-- Words/accuracy per day in a range, plus dictionary totals and a topic breakdown.
-- security invoker: ew_* RLS keeps every number scoped to the caller.
create function public.ew_get_stats(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_today date := public.study_day();
  v_started integer;
  v_shared integer;
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'invalid range';
  end if;

  select count(*) into v_started from public.ew_user_words where user_id = auth.uid();
  select count(*) into v_shared from public.ew_words where owner_id is null;

  return jsonb_build_object(
    'daily', coalesce((
      select jsonb_agg(
        jsonb_build_object('day', r.day, 'words', r.words, 'answers', r.answers, 'correct', r.correct)
        order by r.day)
      from (
        select reviewed_on as day,
               count(distinct word_id)::int as words,
               count(*)::int as answers,
               (count(*) filter (where correct))::int as correct
        from public.ew_reviews
        where user_id = auth.uid() and reviewed_on between p_from and p_to
        group by reviewed_on
      ) r
    ), '[]'::jsonb),
    'range_words', (
      select count(distinct word_id) from public.ew_reviews
      where user_id = auth.uid() and reviewed_on between p_from and p_to
    ),
    'range_answers', (
      select count(*) from public.ew_reviews
      where user_id = auth.uid() and reviewed_on between p_from and p_to
    ),
    'range_correct', (
      select count(*) from public.ew_reviews
      where user_id = auth.uid() and reviewed_on between p_from and p_to and correct
    ),
    'known', (select count(*) from public.ew_user_words where user_id = auth.uid() and status = 'known'),
    'learning', (select count(*) from public.ew_user_words where user_id = auth.uid() and status <> 'known'),
    'unseen', greatest(0, v_shared - v_started),
    'due', (
      select count(*) from public.ew_user_words
      where user_id = auth.uid() and reps > 0 and due_on <= v_today
    ),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object('topic', tp.topic, 'count', tp.n) order by tp.n desc, tp.topic)
      from (
        select topic, count(*)::int as n
        from public.ew_user_words uw
        join public.ew_words w on w.id = uw.word_id
        cross join lateral unnest(w.topics) as topic
        where uw.user_id = auth.uid()
        group by topic
        order by n desc, topic
        limit 8
      ) tp
    ), '[]'::jsonb)
  );
end;
$$;

-- Module-defined achievement rules; returns newly unlocked ids.
create function public.ew_check_achievements()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_new text[] := '{}';
  v_started integer;
  v_known integer;
  v_reviews integer;
  v_perfect boolean;
  v_custom boolean;
  r record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select count(*) into v_started from public.ew_user_words where user_id = v_uid and reps > 0;
  select count(*) into v_known from public.ew_user_words where user_id = v_uid and status = 'known';
  select count(*) into v_reviews from public.ew_reviews where user_id = v_uid;
  select exists (
    select 1 from public.ew_reviews where user_id = v_uid
    group by reviewed_on having count(*) >= 10 and bool_and(correct)
  ) into v_perfect;
  select exists (select 1 from public.ew_words where owner_id = v_uid) into v_custom;

  for r in
    select t.id from (values
      ('ew-words-10', v_started >= 10),
      ('ew-words-50', v_started >= 50),
      ('ew-words-100', v_started >= 100),
      ('ew-words-300', v_started >= 300),
      ('ew-known-25', v_known >= 25),
      ('ew-known-100', v_known >= 100),
      ('ew-reviews-100', v_reviews >= 100),
      ('ew-perfect-day', v_perfect),
      ('ew-custom-word', v_custom)
    ) as t (id, ok)
    where t.ok
  loop
    if public.grant_achievement(v_uid, r.id) then v_new := v_new || r.id; end if;
  end loop;

  return v_new;
end;
$$;

revoke all on function public.ew_get_stats(date, date) from public, anon;
revoke all on function public.ew_check_achievements() from public, anon;
grant execute on function public.ew_get_stats(date, date) to authenticated;
grant execute on function public.ew_check_achievements() to authenticated;
