# Sonyashyk — Master Build Prompt

> Use this document as the master prompt / spec for every development session on this project.
> Paste it (or reference it) at the start of a session, then add the concrete task for that session
> (e.g. "Implement Phase 2 from PROMPT.md").

---

## 0. Role & mission

You are a senior full-stack engineer and product designer. You are building **Sonyashyk** ("sunflower" in Ukrainian) —
a personal, cozy, beautifully designed study companion web app for a **law student** (Ukrainian, studying to become a lawyer).

The app must feel like a thoughtful gift: warm, cute, motivating, never corporate. At the same time it must be
**engineered properly**: typed, modular, secure, tested, and easy to extend with new features over months/years.

Core goals:

1. **Daily tasks** — a small, achievable set of study tasks every day, including **10 English words** (with a focus on Legal English).
2. **Statistics** — visible progress: streaks, XP, charts, heatmap, per-module stats.
3. **Personal account (cabinet)** — secure login, profile, settings, personal data isolated per user.
4. **Modular architecture** — new study modules (flashcards for law terms, case notes, exam planner, pomodoro, quizzes, etc.) can be added by dropping in a new module folder and registering it in one place.

---

## 1. Tech stack (fixed decisions)

| Concern      | Choice                                                                                          | Notes                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Build tool   | **Vite**                                                                                        | Fast dev server, simple config                                             |
| UI           | **React 19 + TypeScript (strict)**                                                              | `"strict": true`, no `any` without justification                           |
| Routing      | **React Router v7** (data router)                                                               | Lazy-loaded module routes                                                  |
| Styling      | **Tailwind CSS v4** + CSS variables design tokens                                               | Theme lives in tokens, not scattered hex values                            |
| Components   | Own small UI kit (in `src/shared/ui`) built on **Radix UI primitives**                          | Accessible dialogs, tabs, tooltips, dropdowns                              |
| Icons        | **lucide-react**                                                                                | Single icon library, consistent stroke style                               |
| Emoji        | Native Unicode emoji + a small `Emoji` component (with `aria-label`)                            | Optional: `emoji-mart` for a picker in profile/notes                       |
| Animation    | **framer-motion** (`motion`)                                                                    | Subtle: confetti on completion, card flips, page fades                     |
| Confetti     | `canvas-confetti`                                                                               | On daily set completion / streak milestones                                |
| Charts       | **Recharts**                                                                                    | Themed with the pink/nude palette                                          |
| Server state | **TanStack Query**                                                                              | Caching, optimistic updates, retries                                       |
| Client state | **Zustand** (only for UI state)                                                                 | Server data never duplicated in Zustand                                    |
| Forms        | **react-hook-form + zod**                                                                       | zod schemas shared for validation                                          |
| Dates        | **date-fns** (+ `date-fns-tz`)                                                                  | All "day" logic is timezone-aware (Europe/Kyiv default, user-configurable) |
| i18n         | **i18next / react-i18next**                                                                     | UI language: **Ukrainian** by default, English as second locale            |
| Backend      | **Supabase** (Postgres + Auth + Row Level Security + Edge Functions)                            | See §5 for why and how                                                     |
| Testing      | **Vitest + React Testing Library**, **Playwright** for e2e                                      |                                                                            |
| Lint/format  | ESLint (typescript-eslint, react-hooks, jsx-a11y) + Prettier                                    |                                                                            |
| PWA          | `vite-plugin-pwa`                                                                               | Installable on phone, offline shell, optional reminders later              |
| Hosting      | **Free tier only**: Cloudflare Pages (frontend) + Supabase Free (backend) + GitHub Actions (CI) | See §9 — budget is **$0**                                                  |

Do not introduce additional heavy libraries without a clear reason; prefer small, well-maintained ones.

---

## 2. Visual design — pink / white / nude

### 2.1 Mood

Soft, feminine, calm, "stationery & latte" aesthetic. Rounded corners, generous whitespace, soft shadows,
gentle gradients, tiny playful details (emoji, sparkles ✨, 🌻 as the brand mark, ⚖️ / 📚 for law vibes).
It must still be **readable and accessible** (WCAG AA contrast for text).

### 2.2 Design tokens (define in `src/app/styles/tokens.css` as CSS variables, map into Tailwind theme)

```
--color-bg:            #FFFBF9   /* warm white page background */
--color-surface:       #FFFFFF   /* cards */
--color-surface-muted: #FBF1EC   /* nude tint panels */
--color-border:        #F0DDD5

--color-primary:       #E8A0B4   /* dusty rose — main accent */
--color-primary-hover: #DC8AA1
--color-primary-soft:  #FBE4EA   /* pink wash backgrounds, chips */
--color-primary-ink:   #9E4A63   /* pink text on light bg (AA compliant) */

--color-nude:          #E9CBB7   /* nude/beige accent */
--color-nude-soft:     #F6E7DD
--color-nude-deep:     #C49A82

--color-text:          #3D2C2E   /* warm dark brown-plum, not pure black */
--color-text-muted:    #8A7274

--color-success:       #9CC5A1   /* sage */
--color-warning:       #F2C58B   /* peach */
--color-danger:        #E27D7D   /* soft red */

--radius-sm: 10px; --radius-md: 16px; --radius-lg: 24px; --radius-full: 9999px;
--shadow-soft: 0 6px 24px rgba(232, 160, 180, 0.18);
--gradient-hero: linear-gradient(135deg, #FBE4EA 0%, #F6E7DD 50%, #FFFBF9 100%);
```

- Fonts (Google Fonts, must support Cyrillic): headings **"Comfortaa"** or **"Playfair Display"** (pick one, keep consistent),
  body **"Nunito"** or **"Manrope"**.
- Provide an optional **dark mode** ("mocha rose": deep plum-brown background, rose accents) via the same tokens.
  Light mode is the default.
- Icons: lucide-react, `strokeWidth={1.75}`, colored with `--color-primary-ink` or `--color-nude-deep`, often inside a
  soft round badge (`bg-primary-soft rounded-full p-2`).
- Emoji used for personality: greetings ("Доброго ранку, сонечко ☀️"), achievements (🏆 🔥 🌸), moods, task types.
  Never rely on emoji alone to convey meaning — always pair with text or `aria-label`.

### 2.3 Layout

- Desktop: left sidebar (collapsible) with module nav + top bar with greeting, streak 🔥 counter, avatar menu.
- Mobile (primary use case!): bottom tab bar (Home, Tasks, Stats, Profile) + "More" sheet for other modules.
- Mobile-first; test at 375px width. No horizontal scroll.

### 2.4 Micro-interactions

- Completing a task: checkbox fills with a heart/check animation, +XP floating number.
- Completing the whole daily set: confetti in pink/nude colors + a random motivational message.
- Flashcard: 3D flip animation.
- Respect `prefers-reduced-motion`.

---

## 3. Project structure (feature-module architecture)

```
src/
  app/                      # app shell, composition root
    main.tsx
    App.tsx
    router.tsx              # builds routes from the module registry
    providers/              # QueryClient, i18n, Theme, Auth providers
    layout/                 # AppShell, Sidebar, BottomNav, TopBar
    styles/                 # tokens.css, globals.css
  core/                     # framework-level, module-agnostic
    modules/
      types.ts              # AppModule contract (see §4)
      registry.ts           # list of enabled modules
      useModules.ts
    auth/                   # session, guards, useAuth, RequireAuth
    api/                    # supabase client, typed query helpers, error mapping
    events/                 # tiny typed event bus (task.completed, xp.awarded, ...)
    gamification/           # XP, levels, streak logic, achievements engine
    daily/                  # daily plan engine: collects tasks from module providers
    stats/                  # stats aggregation contracts + shared widgets
    i18n/
    lib/                    # date utils (timezone-aware "study day"), helpers
  shared/
    ui/                     # Button, Card, Badge, Dialog, Tabs, Progress, Emoji, EmptyState, ...
    hooks/
    types/
  modules/                  # ⬅ every feature lives here
    dashboard/
    english-words/
    profile/
    stats/
    notes/
    (future) legal-terms/, pomodoro/, exam-planner/, quizzes/ ...
supabase/
  migrations/               # SQL migrations incl. RLS policies
  functions/                # edge functions
  seed/                     # seed data (e.g. legal English word list)
tests/e2e/
```

Rules:

- A module may import from `core/` and `shared/`, **never from another module directly**. Cross-module communication goes
  through the event bus, the daily-task engine, or the stats contracts.
- Each module owns its DB tables (prefixed, e.g. `ew_` for english-words) and its migrations.
- Each module has its own `i18n` namespace.

---

## 4. Module contract

Every module exports a single manifest object. The app shell reads the registry and wires everything automatically.

```ts
// src/core/modules/types.ts
export interface AppModule {
  id: string; // 'english-words'
  version: string;
  title: I18nKey; // nav label
  icon: LucideIcon;
  emoji?: string; // '🇬🇧'
  enabledByDefault: boolean;

  routes?: RouteObject[]; // lazy-loaded pages, mounted under /m/<id>
  nav?: { order: number; placement: 'main' | 'more' };

  /** Contributes tasks to "Today" */
  dailyTaskProvider?: DailyTaskProvider;

  /** Contributes cards/charts to the Stats page and summary numbers to the dashboard */
  statsProvider?: StatsProvider;

  /** Small widgets for the dashboard grid */
  dashboardWidgets?: DashboardWidget[];

  /** Module-specific user settings (rendered automatically in Settings) */
  settings?: { schema: ZodSchema; defaults: unknown; Component: React.FC };

  /** Achievements this module can unlock */
  achievements?: AchievementDefinition[];

  i18n?: Record<Locale, Record<string, unknown>>;
}

export interface DailyTaskProvider {
  /** Deterministically generates today's tasks for a user (idempotent per study-day) */
  getTasksForDay(ctx: {
    userId: string;
    day: StudyDay;
    settings: unknown;
  }): Promise<DailyTaskDescriptor[]>;
}

export interface DailyTaskDescriptor {
  key: string; // unique within module+day, e.g. 'words-10'
  title: I18nKey;
  emoji?: string;
  xp: number;
  estimatedMinutes?: number;
  route?: string; // where to go to perform it
  progress?: { current: number; target: number };
}

export interface StatsProvider {
  getSummary(range: DateRange): Promise<StatSummaryItem[]>; // numbers for cards
  Widgets?: React.LazyExoticComponent<React.FC<{ range: DateRange }>>[];
}
```

- `registry.ts` is the **only** place to enable a new module.
- Users can toggle optional modules on/off in Settings (stored in `profiles.enabled_modules`).
- Adding a module = create folder in `src/modules/<id>`, export manifest, add migration, add to registry. Document this
  in `docs/ADDING_A_MODULE.md` with a checklist, and ship a `modules/_template/` folder to copy.

---

## 5. Backend, data & security architecture

### 5.1 Why Supabase

One small user base (initially one person), no desire to maintain servers, but we need real authentication and
per-user data isolation. Supabase gives managed Postgres + Auth + **Row Level Security (RLS)**, which enforces access
rules in the database itself — so even a buggy frontend cannot read someone else's data.

Keep the data-access layer abstracted (`core/api` + per-module `api.ts` with repository functions), so a switch to a
custom backend (e.g. Fastify + Postgres) later touches only those files.

### 5.2 Authentication

- Email + password via Supabase Auth; optional magic link. **Public sign-up disabled** — accounts are created by invite
  (admin invites via Supabase dashboard). The app is private.
- Password policy: min 10 chars, checked against leaked passwords (Supabase setting) — enable it.
- Optional TOTP 2FA (Supabase MFA) available in Profile → Security.
- Sessions: Supabase JS client with PKCE flow; access token short-lived (1h), refresh token rotation enabled with reuse detection.
- Rate limiting on auth endpoints (Supabase defaults + CAPTCHA (Turnstile) on login if abuse appears).
- "Log out from all devices" button.
- Route guard `RequireAuth` wraps all app routes; unauthenticated → `/login`. Guards are UX only; **real protection is RLS.**

### 5.3 Authorization (RLS) — mandatory rules

- **RLS enabled on every table**, no exceptions. A migration without RLS policies must not be merged.
- Standard policy for user-owned data:
  ```sql
  alter table ew_user_words enable row level security;
  create policy "own rows" on ew_user_words
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  ```
- Shared read-only content (e.g. dictionary of words) is readable by `authenticated`, writable only by `service_role`.
- `user_id` columns default to `auth.uid()`; never trust a `user_id` sent from the client.
- XP/streak/achievement awarding happens in **Postgres functions (`security definer`, fixed `search_path`) or Edge
  Functions**, not by the client writing arbitrary numbers. The client reports "I completed task X"; the server validates
  and awards XP (prevents trivial cheating and keeps stats consistent).
- Roles: `user` (default) and `admin` (stored in `profiles.role`, only changeable by service role). Admin can manage
  content (word lists) via a hidden admin module.

### 5.4 Frontend security

- Only the **anon/publishable key** in the frontend; `service_role` key never leaves server-side code/CI secrets.
- `.env` files git-ignored; `.env.example` committed.
- Strict **Content Security Policy** via hosting headers (`default-src 'self'`; allow Supabase URL, Google Fonts), plus
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- Never use `dangerouslySetInnerHTML` with user content; if rich text is needed (notes), sanitize with DOMPurify.
- Validate all input with zod on the client **and** with DB constraints / function checks on the server.
- Avatar uploads: Supabase Storage bucket with RLS (`path starts with auth.uid()`), type/size limits (images, ≤2MB).
- Dependency hygiene: `npm audit` in CI, Renovate/Dependabot.
- Error messages to the user are friendly and generic; details go to console in dev only.

### 5.5 Privacy

- Store minimal personal data: display name, avatar, timezone, locale, preferences.
- Profile → "Export my data" (JSON) and "Delete my account" (Edge Function, cascades all user rows).

### 5.6 Core tables (initial)

```
profiles(id uuid pk = auth.users.id, display_name, avatar_url, timezone default 'Europe/Kyiv',
         locale default 'uk', role default 'user', enabled_modules text[], daily_goal_xp int,
         created_at)
daily_plans(id, user_id, study_day date, generated_at, unique(user_id, study_day))
daily_tasks(id, plan_id, user_id, module_id, task_key, title_key, xp, target, progress,
            completed_at null, unique(plan_id, module_id, task_key))
xp_events(id, user_id, source_module, source_ref, amount, created_at)          -- append-only ledger
streaks(user_id pk, current int, longest int, last_completed_day date, freezes_available int)
achievements_unlocked(user_id, achievement_id, unlocked_at, pk(user_id, achievement_id))
study_sessions(id, user_id, module_id, started_at, ended_at, duration_sec)   -- time tracking for stats
```

"Study day" is computed in the user's timezone; the day rolls over at a configurable hour (default 04:00, so late-night
studying still counts for the previous day).

---

## 6. Feature specs (v1)

### 6.1 Dashboard (`modules/dashboard`)

- Greeting by time of day with emoji and her display name ("Доброго ранку, <name> 🌸").
- Today card: progress ring of the daily set (x/y tasks, XP today vs goal), "Continue" button to next unfinished task.
- Streak 🔥 with flame animation; weekly mini-calendar of completed days.
- Widgets contributed by modules (words learned this week, next exam countdown later, etc.).
- Random motivational quote (law- or study-themed, UA/EN), rotating daily.

### 6.2 Daily tasks engine (`core/daily`)

- On first open of a study day, the engine calls every enabled module's `dailyTaskProvider` and persists the plan
  (idempotent — regenerating the same day returns the same plan).
- Task list page "Сьогодні": grouped by module, each task with emoji, XP, estimated time, progress bar, deep link.
- Completing all tasks → "day complete" state, confetti, streak increment, XP bonus.
- Streak freeze: 1 freeze earned per 7-day streak (max 2), auto-used on a missed day.
- Tasks carry over? **No** — each day is fresh; unfinished tasks show in history as missed (gently, no guilt messages).

### 6.3 English words module (`modules/english-words`) — the flagship

- **10 words per day** (count configurable 5–20 in module settings).
- Word source: seeded dictionary focused on **Legal English** (contract, tort, liability, plaintiff, defendant,
  jurisdiction, statute, precedent, breach, damages, affidavit, injunction, …) tagged by topic and level (B1–C1),
  plus a general academic English deck. Seed at least **300 words** with: term, part of speech, IPA transcription,
  Ukrainian translation, English definition, example sentence (ideally legal context), topic tags, level.
- Daily selection = mix of **new words** + **due reviews** using a light spaced-repetition algorithm (SM-2 or FSRS-lite):
  store per user `ew_user_words(user_id, word_id, ease, interval_days, due_on, reps, lapses, status: new|learning|known)`.
- Daily flow (one task "Learn 10 words" with progress 0/10, plus optional "Review N words"):
  1. **Learn** — flashcards (front: term + IPA + 🔊 pronunciation via Web Speech API; back: translation, definition, example).
  2. **Practice** — mini quiz: EN→UA multiple choice, UA→EN typing, fill-the-gap in a legal sentence, match pairs.
  3. **Result** — score, mistakes list, "known / still learning" per word, XP awarded.
- "My dictionary" page: search, filter by status/topic, mark as known, add **custom words** (private, RLS-protected).
- Stats contribution: words learned total, per week, accuracy %, due reviews count, topic breakdown.

### 6.4 Stats (`modules/stats`)

- Range selector: week / month / all time.
- Summary cards: total XP & level, current/longest streak, days studied, total study time, words learned.
- **Activity heatmap** (GitHub-style, pink shades) of XP per day.
- XP per day bar chart, words learned line chart, accuracy trend.
- Module sections rendered from each module's `statsProvider`.
- Achievements gallery 🏆 (locked ones shown greyed with hint).
- Stats computed by SQL views / RPC functions (`get_stats_summary(range)`), not by downloading raw rows.

### 6.5 Profile / personal cabinet (`modules/profile`)

- Avatar (upload or emoji avatar 🌻🐱🌸), display name, bio line.
- Settings: timezone, day rollover hour, language (UA/EN), theme (light/dark/system), daily XP goal,
  enabled modules, per-module settings (auto-rendered from manifests).
- Security: change password, enable 2FA, active sessions / log out everywhere.
- Data: export JSON, delete account (with confirmation typing).

### 6.6 Gamification (`core/gamification`)

- XP ledger (`xp_events`) is the single source of truth; level = f(total XP) with a gentle curve.
- Levels have cute law-themed titles: "Першокурсниця 📚" → "Помічниця юриста" → "Юристка ⚖️" → "Адвокатка" → "Суддя 👩‍⚖️" …
- Achievements engine listens to events (`task.completed`, `day.completed`, `words.learned`) and evaluates module-defined
  rules server-side.

### 6.7 Notes module (`modules/notes`) — create, store, manage

- **Create/edit** notes with a title and a Markdown body (headings, lists, bold/italic, links, checklists, quotes, code) in an
  editor with live preview; autosave (debounced) with an "saved ✓" indicator; works well on mobile.
- **Manage**: folders (notebooks) by subject (e.g. Цивільне право, Теорія держави і права), free-form tags, pin ⭐, archive,
  trash with restore (soft delete; permanent delete only from trash), sort (updated / created / title), duplicate.
- **Find**: full-text search (Postgres `tsvector`, Ukrainian + English config) across title/body, filter by folder/tag/pinned/archived.
- **Templates**: blank, **IRAC** (Issue, Rule, Application, Conclusion), case brief (facts, issue, holding, reasoning),
  lecture notes, article/code-section summary.
- **Links**: a note may reference a word from `english-words` or a task only through core contracts/events, never module imports.
- **Data**: tables `nt_folders`, `nt_notes` (`id, user_id, folder_id, title, body_md, tags text[], pinned, archived_at, deleted_at,
  created_at, updated_at`), each with RLS `auth.uid() = user_id` + isolation tests; body size limit (e.g. 100k chars) as a DB constraint.
- **Security**: render Markdown with a sanitizing renderer (DOMPurify / no raw HTML); no `dangerouslySetInnerHTML` on unsanitized content.
- **Stats/gamification**: `statsProvider` (notes count, notes written per week); small XP for a daily "write a note" task (optional, off by default).
- **Export**: single note or all notes as `.md` (zip) — included in "Export my data".
- **Future**: attachments/images (Supabase Storage, size-limited), share-as-read-only link (only if explicitly enabled), offline editing via PWA.

---

## 7. Future module ideas (design so they plug in cleanly)

- **Legal terms flashcards (UA)** — Ukrainian legal terminology, articles of codes (ЦК, КК, КПК…).
- **Pomodoro / focus timer** 🍅 — logs `study_sessions`, contributes "focus 25 min" daily task.
- **Exam & deadline planner** 📅 — sessions, colloquiums, countdowns, reminders.
- **Case notes / briefs** 📝 — covered by the Notes module (§6.7) via IRAC and case-brief templates.
- **Quizzes** — custom question sets per subject (theory of state and law, civil law, criminal law…).
- **Reading tracker** 📖 — books/articles, pages per day.
- **Mood & wellbeing check-in** 🌸 — optional, private.
- **Love notes** 💌 — surprise messages from the admin (boyfriend) shown on the dashboard on chosen dates.

---

## 8. Quality bar

- TypeScript strict, no ESLint errors, Prettier formatted.
- Unit tests for: SRS algorithm, streak logic, study-day/timezone logic, XP/level calc, daily plan generation, module registry.
- Component tests for key UI (flashcard, quiz, task list).
- E2E (Playwright): login → complete daily words → see stats updated; RLS test that user A cannot read user B's rows.
- SQL tests for RLS policies (pgTAP or a script using two test users).
- Accessibility: keyboard navigable, visible focus rings (rose-colored), `aria-*` on custom controls, AA contrast.
- Performance: route-level code splitting per module; Lighthouse ≥ 90 on mobile.
- All user-facing strings through i18n — no hardcoded Ukrainian/English text in components.
- Loading skeletons (soft pink shimmer), friendly empty states with emoji, error boundaries per module
  (a crashing module must not break the whole app).

---

## 9. Free hosting & deployment ($0 budget)

The whole project must run **for free**. Every architectural decision must fit within free-tier limits.

### 9.1 Chosen setup

| Part                                           | Service (free tier)                            | Why                                                                                                                                                        |
| ---------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend (static SPA)                          | **Cloudflare Pages**                           | Unlimited bandwidth & requests for static assets, free HTTPS, free `*.pages.dev` subdomain, custom headers via `_headers` file, preview deploys per branch |
| Backend (DB + Auth + Storage + Edge Functions) | **Supabase Free plan**                         | 500 MB Postgres, 1 GB storage, 50k monthly active users, Edge Functions included — far more than needed                                                    |
| Source & CI/CD                                 | **GitHub** (private repo) + **GitHub Actions** | Free for private repos within monthly minutes quota                                                                                                        |
| Domain                                         | `sonyashyk.pages.dev` (free)                   | A custom domain (~$10/yr) is optional and can be added later without code changes                                                                          |

Fallback alternatives (if needed): Vercel Hobby or Netlify Free for the frontend — the app must stay host-agnostic
(plain static build in `dist/`, no host-specific server features).

### 9.2 Constraints the code must respect

- **No own server.** Frontend is a pure static SPA (`vite build` → `dist/`). All server logic lives in Postgres
  functions (RPC) or Supabase Edge Functions.
- **SPA routing fallback**: add `public/_redirects` with `/* /index.html 200` (works on Cloudflare Pages & Netlify)
  and `vercel.json` rewrite if Vercel is used.
- **Security headers** (CSP, HSTS, etc. from §5.4) are delivered via `public/_headers` (Cloudflare Pages / Netlify format).
- **Supabase Free pauses a project after ~7 days of inactivity.** Mitigation: a GitHub Actions scheduled workflow
  (`.github/workflows/keepalive.yml`, e.g. every 3 days) that performs a lightweight read against a public `health` RPC
  using the anon key. Daily use by the student normally prevents pausing anyway.
- **No automatic backups on Supabase Free.** Mitigation: weekly GitHub Actions workflow running `supabase db dump`
  (or `pg_dump`) and storing the encrypted dump as a workflow artifact / in a private repo. DB connection string lives
  only in GitHub Actions secrets. Plus the in-app "Export my data" (§5.5).
- Keep storage small: avatars resized client-side to ≤ 256×256 WebP before upload; word dictionary stored as rows,
  audio pronunciation via the browser's Web Speech API (no audio files stored).
- Keep Edge Function invocations low (free quota): prefer SQL RPC functions for XP/stats; Edge Functions only for
  account deletion and similar rare admin operations.
- Supabase Auth emails: built-in SMTP on the free plan is rate-limited (a few emails/hour) — acceptable for an
  invite-only app with one or two users. Optionally configure a free SMTP (e.g. Resend / Brevo free tier) later.
- Supabase Auth → URL configuration: set Site URL and redirect URLs to the `pages.dev` domain (and `localhost:5173` for dev).

### 9.3 Environment & secrets

- Frontend env (public, safe to expose): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — set in Cloudflare Pages
  project settings and in local `.env.local`.
- Server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN`) — **only** in GitHub Actions
  secrets / Supabase function secrets. Never in the repo, never with the `VITE_` prefix.

### 9.4 CI/CD pipeline (GitHub Actions)

1. `ci.yml` on every push / PR: install → lint → typecheck → unit tests → build.
2. Deploy frontend: Cloudflare Pages Git integration (auto-deploy `main` to production, other branches to preview URLs).
3. `db-migrate.yml` on push to `main` when `supabase/**` changed: `supabase db push` (migrations) and
   `supabase functions deploy`.
4. `keepalive.yml` (cron) and `backup.yml` (weekly cron) as described above.

### 9.5 Deliverable

`docs/DEPLOYMENT.md` — a step-by-step guide written for a non-DevOps person: create Supabase project, run migrations,
disable public sign-ups, invite the user, create Cloudflare Pages project from the GitHub repo, set env vars,
set auth redirect URLs, verify headers, add GitHub secrets for keepalive/backup.

---

## 10. Delivery phases

1. **Foundation** — Vite + React + TS + Tailwind + tokens + UI kit basics, fonts, lucide, i18n, layout shell
   (sidebar/bottom nav), module registry with a dummy module, lint/test setup.
2. **Auth, cabinet & first deploy** — Supabase project, `profiles` table + RLS, login page, guards, profile/settings page,
   env handling, security headers, **first production deploy to Cloudflare Pages + CI + keepalive** (§9) — deploy early,
   so every following phase ships to the live URL.
3. **Daily engine & gamification core** — daily_plans/tasks, XP ledger, streaks, events, dashboard "Today" card.
4. **English words module** — seed dictionary, SRS, learn/practice/result flow, my dictionary, daily provider.
5. **Stats** — RPC stats functions, charts, heatmap, achievements gallery.
6. **Polish** — animations, confetti, dark mode, PWA, empty states, a11y & Lighthouse pass, e2e + RLS tests.
7. **Notes module** — §6.7: CRUD, folders, tags, search, templates, trash, export.
8. **Next modules** — pick from §7.

At the end of each phase: working app, tests passing, short changelog entry in `CHANGELOG.md`, and an updated
`README.md` (setup, env vars, scripts, how to add a module).

---

## 11. Working agreement for the AI assistant

- Before coding a phase, briefly restate the plan and list files to be created/changed.
- Keep changes scoped to the current phase; don't silently refactor unrelated code.
- Every new table ⇒ migration + RLS policies + a test proving isolation.
- Prefer composition and small components; keep module boundaries clean (§3 rules).
- When a decision isn't covered here, choose the simplest secure option and note it in `docs/DECISIONS.md`.
- UI copy default language: Ukrainian, warm and supportive tone, with light use of emoji.
- Never add a dependency or service that requires a paid plan; if a feature would exceed free-tier limits (§9), flag it
  and propose a free alternative.
