# Changelog

## Phase 3 — Daily engine & gamification core (2026-09-29)

- Migration `daily_engine`: `daily_plans`, `daily_tasks`, `xp_events` (append-only ledger), `streaks` — RLS read-own only, no client writes.
- Server-side RPCs (`security definer`): `ensure_daily_plan` (idempotent), `report_task_progress` (validates, awards XP once, closes the day, +10 bonus XP), streak bookkeeping with freezes (1 per 7-day streak, max 2, auto-used), `study_day`, `get_xp_summary`. SQL test `rls_daily.sql` (idempotency, no double XP, direct writes denied, user isolation).
- `core/daily` (plan from module `dailyTaskProvider`s, progress/XP/streak/week queries), `core/events` typed bus, `core/gamification` (level curve, law-themed titles, effective streak), timezone-aware `getStudyDay`.
- New `today` module (grouped task list, day-complete state); dashboard: Today ring + continue, streak with weekly calendar, level bar, daily quote, module widgets; real streak in the top bar; dashboard contributes a "say hi" check-in task.
- "Export my data" now includes plans, tasks, XP events and streaks.

## Phase 2 — Auth, cabinet & deploy setup (2026-09-29)

- Supabase client (PKCE, anon key only), `AuthProvider`, `RequireAuth` guard, login page (generic error messages).
- Migration `profiles` with RLS, role-protection trigger, signup trigger, public `health()` RPC; SQL isolation test.
- Profile module: name, bio, emoji avatar, timezone, rollover hour, language, theme, daily goal; sign out / sign out everywhere. Preferences apply app-wide.
- `public/_headers` (CSP, HSTS…); GitHub Actions: CI, db-migrate, keepalive, encrypted weekly backup.
- `docs/DEPLOYMENT.md`.
- Phase 2 completion: password change (re-checks current password), TOTP 2FA (enroll/disable in Profile, second step on login, guarded by `needsMfa`), JSON data export, account deletion (password-confirmed, `delete-account` Edge Function), avatar upload (private `avatars` bucket, RLS by folder, 2 MB png/jpg/webp, signed URLs), storage/RLS SQL test run in CI against the live DB after each migration.

## Phase 1 — Foundation (2026-09-29)

- Vite + React 19 + TypeScript (strict) + Tailwind v4 with pink/nude design tokens and a "mocha rose" dark theme.
- Small accessible UI kit (`Button`, `Card`, `Badge`, `Emoji`, `Progress`, `EmptyState`, `Skeleton`).
- i18n (Ukrainian default, English), per-module namespaces.
- App shell: collapsible sidebar (desktop), bottom tab bar + "More" sheet (mobile), top bar with greeting.
- Module contract (`AppModule`), registry, routes built from the registry, per-module error boundary, dashboard placeholder module, `_template` module.
- ESLint (a11y, module-isolation rule), Prettier, Vitest + Testing Library.
