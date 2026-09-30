# Changelog

## Phase 6 — Polish (2026-09-30)

- Motion & celebration: confetti on day completion (respects `prefers-reduced-motion`), flashcard flip, task-complete pop with floating XP, route fades.
- Dark theme ("mocha rose") with no flash on load (`theme-init.js`), `theme-color` follows the theme; new one-tap light/dark toggle in the top bar, saved to the profile.
- PWA: `vite-plugin-pwa`, manifest, icons (incl. maskable + apple-touch), offline shell.
- Accessibility: route announcer, skip link, one `h1` per page, axe-core scans of every page in light + dark on desktop and mobile.
- Playwright e2e against a fake backend: login, daily set → stats, a11y, PWA, theme toggle (46+ tests); ESLint ignores generated folders.

## Phase 5 — Stats & achievements (2026-09-29)

- Migrations `stats_achievements` + `ew_stats`: `achievements_unlocked` (RLS read-own, no client writes), RPCs `get_stats_summary`, `get_daily_stats`, `ew_get_stats`, and the server-side achievements engine (`check_core_achievements`, `ew_check_achievements`, internal `grant_achievement`). SQL test `rls_stats.sql` (numbers, idempotent unlocking, no client grants, user isolation).
- New `stats` module: week / month / all-time range, summary cards (XP & level, streak, days studied, study time + module cards from `statsProvider`), GitHub-style pink heatmap (26 weeks of XP), XP-per-day bars (weekly buckets for long ranges), module widgets (`english-words`: words practised, accuracy trend, topic breakdown), achievements gallery (locked ones greyed with a hint).
- 25 achievements (16 core, 9 English words) with cosy copy; a global `AchievementWatcher` re-checks after `task.completed` / `day.completed` / `words.learned` and shows a toast for newly unlocked ones. Modules declare achievements + `checkAchievementsRpc` in their manifest.
- Charts via Recharts (themed with the design tokens, lazy-loaded with the stats page). English words moved to the "More" menu on mobile so the tab bar is Home / Today / Stats / Profile.
- "Export my data" now includes unlocked achievements.

## Phase 4 — English words module (2026-09-29)

- Migrations `english_words` + `ew_seed`: `ew_words` (shared dictionary + private custom words), `ew_user_words` (SRS state), `ew_reviews` (append-only answer log), `ew_settings` — RLS on all, custom-word cap, SQL isolation test `rls_ew.sql` (shared dictionary is read-only for clients, user B sees nothing of A).
- 304 Legal English + academic words (term, POS, IPA, UA translation, definition, example, topics, level B1–C1) in `supabase/seed/ew_words_*.txt`; `scripts/gen-ew-seed.mjs` validates them and regenerates the idempotent seed migration.
- SM-2-lite spaced repetition (1 → 3 days → interval × ease, lapses reset, known at ≥ 21 days), new/due word selection, quiz builder (EN→UA choice, UA→EN typing with typo tolerance, fill-the-gap, match pairs) — all pure and unit-tested.
- New `english-words` module: hub (today's progress, new/review buttons, words per day 5–20, stats), session flow learn (flashcards + 🔊 Web Speech) → practice → match pairs → result (accuracy, mistakes, "known / still learning" per word), "My dictionary" (search, status/topic filters, mark as known, private custom words).
- Daily provider: "Learn new words" (20 XP, progress 0/N) and, when reviews are due, "Review words" (10 XP); `words.learned` event emitted after a learn session.
- "Export my data" includes SRS state, answer log, settings and custom words.

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
