# Decisions

Choices made where PROMPT.md was silent (simplest secure option).

- **2026-09-29 — ESLint 9, not 10.** `eslint-plugin-jsx-a11y` does not yet support ESLint 10.
- **2026-09-29 — Font: Comfortaa (headings) + Nunito (body)**, loaded from Google Fonts with Cyrillic support.
- **2026-09-29 — Dashboard is a module** mounted at `/m/dashboard`; `/` redirects there, so module routing stays uniform.
- **2026-09-29 — Module isolation enforced by ESLint** (`no-restricted-imports` blocks `@/modules/*/*`; only a module's index is importable, and only from the registry/app).
- **2026-09-29 — Theme** is UI state in Zustand, persisted in `localStorage` (`light` default, `dark`, `system`); moves to `profiles` in Phase 2.
- **2026-09-29 — `zod` installed in Phase 1** because the `AppModule` contract references `ZodType`.
