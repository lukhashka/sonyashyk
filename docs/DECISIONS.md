# Decisions

Choices made where PROMPT.md was silent (simplest secure option).

- **2026-09-29 — ESLint 9, not 10.** `eslint-plugin-jsx-a11y` does not yet support ESLint 10.
- **2026-09-29 — Font: Comfortaa (headings) + Nunito (body)**, loaded from Google Fonts with Cyrillic support.
- **2026-09-29 — Dashboard is a module** mounted at `/m/dashboard`; `/` redirects there, so module routing stays uniform.
- **2026-09-29 — Module isolation enforced by ESLint** (`no-restricted-imports` blocks `@/modules/*/*`; only a module's index is importable, and only from the registry/app).
- **2026-09-29 — Theme** is UI state in Zustand, persisted in `localStorage` (`light` default, `dark`, `system`); moves to `profiles` in Phase 2.
- **2026-09-29 — `zod` installed in Phase 1** because the `AppModule` contract references `ZodType`.
- **2026-09-29 — SRS state is written by the client under RLS** (`ew_user_words`, own rows only), as in PROMPT §5.3. It is the user's own learning data; XP is still awarded server-side through `report_task_progress`.
- **2026-09-29 — Dictionary lives in migrations.** Words are authored in `supabase/seed/ew_words_*.txt`; `scripts/gen-ew-seed.mjs` generates `..._ew_seed.sql` so `supabase db push` in CI seeds it. Custom words share `ew_words` (`owner_id` = user; shared rows have `owner_id` null).
- **2026-09-29 — New words follow dictionary order** (`sort_order`, Legal core first), so a session is deterministic within a day and survives a page reload.
- **2026-09-29 — Session grading:** 0 mistakes → quality 4, 1 → 3, 2+ → 1 (lapse). Match-pair errors count as mistakes. Progress reported to the daily task = words in the finished session.
- **2026-09-29 — Achievements are evaluated in SQL, defined in manifests.** Rules live in `security definer` functions (core: `check_core_achievements`; modules ship their own RPC named in `checkAchievementsRpc`), the display data (emoji, title, locked hint) in the manifest/i18n. A unit test keeps the TS ids and the SQL rule ids in sync. Achievements grant no XP, so the XP ledger stays a pure record of completed tasks.
- **2026-09-29 — "Study time" is an estimate**: the sum of `estimated_minutes` of completed tasks (no `study_sessions` writer exists yet; a Pomodoro module can replace it later).
- **2026-09-29 — "Words practised", not "words learned", per range**: `ew_user_words` has no first-seen date, so range stats count distinct words answered in `ew_reviews`; "Known" is the all-time count.
- **2026-09-29 — Daily series RPCs are capped at ~13 months** (`get_daily_stats`, `ew_get_stats`); "all time" summaries are uncapped, charts show the last year, aggregated per week beyond 45 days.
- **2026-09-30 — Notes search uses the `simple` + `english` configs.** Postgres ships no Ukrainian dictionary, so Ukrainian words match exactly (with prefix matching from the client's `word:*` query); English text is additionally stemmed. Tags are filtered client-side because `array_to_string` is not immutable and cannot be used in a generated column.
- **2026-09-30 — Notes are sanitised with DOMPurify after `marked`.** Images are forbidden (the CSP would block external ones anyway and they would leak the reader's IP); only Markdown, task-list checkboxes and safe links survive.
- **2026-09-30 — Note list rows carry only a 160-char `preview`** (generated column); the full body is fetched when a note is opened, so the list stays light for thousands of notes.
- **2026-09-30 — Optional daily "write a note" task and note achievements are deferred.** PROMPT §6.7 marks the task as optional/off by default; it needs a per-module settings surface that does not exist yet.
- **2026-09-30 — Notes ↔ words/tasks links are not implemented.** §6.7 allows them only through core contracts/events; no such event exists yet, so they wait for a real use case.

