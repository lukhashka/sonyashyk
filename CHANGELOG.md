# Changelog

## Phase 2 — Auth, cabinet & deploy setup (2026-09-29)

- Supabase client (PKCE, anon key only), `AuthProvider`, `RequireAuth` guard, login page (generic error messages).
- Migration `profiles` with RLS, role-protection trigger, signup trigger, public `health()` RPC; SQL isolation test.
- Profile module: name, bio, emoji avatar, timezone, rollover hour, language, theme, daily goal; sign out / sign out everywhere. Preferences apply app-wide.
- `public/_headers` (CSP, HSTS…), `_redirects`; GitHub Actions: CI, db-migrate, keepalive, encrypted weekly backup.
- `docs/DEPLOYMENT.md`.
- Not yet done from spec §5.2/§5.5: password change, TOTP 2FA, data export, account deletion, avatar upload, e2e RLS run against a live DB.

## Phase 1 — Foundation (2026-09-29)

- Vite + React 19 + TypeScript (strict) + Tailwind v4 with pink/nude design tokens and a "mocha rose" dark theme.
- Small accessible UI kit (`Button`, `Card`, `Badge`, `Emoji`, `Progress`, `EmptyState`, `Skeleton`).
- i18n (Ukrainian default, English), per-module namespaces.
- App shell: collapsible sidebar (desktop), bottom tab bar + "More" sheet (mobile), top bar with greeting.
- Module contract (`AppModule`), registry, routes built from the registry, per-module error boundary, dashboard placeholder module, `_template` module.
- ESLint (a11y, module-isolation rule), Prettier, Vitest + Testing Library.
