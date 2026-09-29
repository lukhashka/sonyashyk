import type { Page, Route } from '@playwright/test';

/**
 * A small stateful stand-in for Supabase (Auth + PostgREST) so the end-to-end flow runs in CI
 * without secrets and without ever touching the real database. It mirrors only the calls the app
 * makes for: login → daily plan → completing a task → stats. Real RLS is covered by the SQL tests
 * in `supabase/tests/`.
 */
export const E2E_EMAIL = 'sonya@test.local';
export const E2E_PASSWORD = 'correct-horse-battery';
export const E2E_ORIGIN = 'https://e2e.supabase.co';

const USER_ID = '00000000-0000-4000-8000-0000000000aa';
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

function session() {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: E2E_EMAIL,
    app_metadata: {},
    user_metadata: {},
    factors: [],
    created_at: new Date(0).toISOString(),
  };
  const claims = {
    sub: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    aal: 'aal1',
    exp: now + 3600,
    iat: now,
  };
  return {
    access_token: `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(claims)}.sig`,
    refresh_token: 'e2e-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user,
  };
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

type Row = Record<string, unknown>;

export interface FakeBackend {
  /** "METHOD path" of every request the app made to the fake API. */
  calls: string[];
}

export async function installFakeBackend(
  page: Page,
  opts: { signedIn?: boolean; theme?: 'light' | 'dark' } = {},
): Promise<FakeBackend> {
  const calls: string[] = [];
  const today = new Date().toISOString().slice(0, 10); // the fake profile uses UTC
  let tasks: Row[] = [];
  let totalXp = 0;
  let dayDone = false;
  let achievementSent = false;

  if (opts.signedIn) {
    // supabase-js derives its storage key from the project ref (host's first label).
    await page.addInitScript(
      (s) => localStorage.setItem('sb-e2e-auth-token', JSON.stringify(s)),
      session(),
    );
  }

  // Nothing but the fake API and the local app may be reached.
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, async (route) => {
    if (route.request().url().startsWith(E2E_ORIGIN)) return route.fallback();
    return route.abort();
  });

  await page.route(`${E2E_ORIGIN}/auth/v1/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    calls.push(`${req.method()} ${url.pathname}`);
    if (url.pathname.endsWith('/token')) {
      const body = req.postDataJSON() as { email?: string; password?: string };
      if (body.email === E2E_EMAIL && body.password === E2E_PASSWORD) {
        return json(route, session());
      }
      return json(
        route,
        { error: 'invalid_grant', error_description: 'Invalid login credentials' },
        400,
      );
    }
    if (url.pathname.endsWith('/user')) return json(route, session().user);
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204 });
    return json(route, {});
  });

  await page.route(`${E2E_ORIGIN}/rest/v1/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const name = url.pathname.replace('/rest/v1/', '');
    calls.push(`${req.method()} ${name}`);
    const wantsObject = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const rows = (list: Row[]) => json(route, wantsObject ? (list[0] ?? null) : list);

    if (req.method() === 'HEAD') {
      return route.fulfill({ status: 200, headers: { 'content-range': '*/0' } });
    }

    if (name.startsWith('rpc/')) {
      const body = (req.postDataJSON() ?? {}) as Row;
      switch (name.slice(4)) {
        case 'ensure_daily_plan': {
          if (tasks.length === 0) {
            tasks = (body.p_tasks as Row[]).map((t, i) => ({
              ...t,
              id: `00000000-0000-4000-8000-00000000010${i}`,
              progress: 0,
              completed_at: null,
            }));
          }
          return json(route, '00000000-0000-4000-8000-0000000000bb');
        }
        case 'report_task_progress': {
          const task = tasks.find((t) => t.id === body.p_task_id);
          if (task && !task.completed_at) {
            task.completed_at = new Date().toISOString();
            task.progress = task.target;
            totalXp += (task.xp as number) + 10; // task XP + day bonus
            dayDone = tasks.every((t) => t.completed_at);
          }
          return json(route, { task_completed: true, day_completed: dayDone });
        }
        case 'get_xp_summary':
          return json(route, { total_xp: totalXp, today_xp: totalXp });
        case 'get_stats_summary':
          return json(route, {
            total_xp: totalXp,
            range_xp: totalXp,
            days_studied: dayDone ? 1 : 0,
            tasks_done: tasks.filter((t) => t.completed_at).length,
            study_minutes: dayDone ? 1 : 0,
          });
        case 'get_daily_stats':
          return json(route, totalXp > 0 ? [{ day: today, xp: totalXp, tasks: 1 }] : []);
        case 'ew_get_stats':
          return json(route, {
            daily: [],
            range_words: 0,
            range_answers: 0,
            range_correct: 0,
            known: 0,
            learning: 0,
            unseen: 0,
            due: 0,
            topics: [],
          });
        case 'check_core_achievements':
          if (dayDone && !achievementSent) {
            achievementSent = true;
            return json(route, ['first-day']);
          }
          return json(route, []);
        default:
          return json(route, []);
      }
    }

    switch (name.split('?')[0]) {
      case 'profiles':
        return rows([
          {
            id: USER_ID,
            display_name: 'Соня',
            bio: '',
            avatar_emoji: '🌻',
            avatar_url: null,
            timezone: 'UTC',
            day_rollover_hour: 0,
            locale: 'uk',
            theme: opts.theme ?? 'light',
            daily_goal_xp: 30,
            role: 'user',
            enabled_modules: [],
          },
        ]);
      case 'daily_tasks':
        return json(route, tasks);
      case 'daily_plans':
        return json(route, dayDone ? [{ study_day: today }] : []);
      case 'streaks':
        return rows(
          dayDone
            ? [{ current: 1, longest: 1, last_completed_day: today, freezes_available: 0 }]
            : [],
        );
      case 'achievements_unlocked':
        return json(
          route,
          achievementSent
            ? [{ achievement_id: 'first-day', unlocked_at: new Date().toISOString() }]
            : [],
        );
      default:
        return rows([]);
    }
  });

  return { calls };
}
