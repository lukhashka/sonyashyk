# Sonyashyk 🌻

A cozy study companion for a law student. Spec: [PROMPT.md](PROMPT.md).

## Setup

```bash
npm install
cp .env.example .env.local   # Supabase keys are needed from Phase 2
npm run dev
```

## Scripts

| Script              | Purpose                                 |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Dev server                              |
| `npm run build`     | Typecheck + production build to `dist/` |
| `npm run lint`      | ESLint                                  |
| `npm run typecheck` | `tsc`                                   |
| `npm test`          | Vitest                                  |
| `npm run format`    | Prettier                                |

## Env vars

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public/anon only; never put service keys in the frontend).

## Adding a module

See [docs/ADDING_A_MODULE.md](docs/ADDING_A_MODULE.md).

## Status

Phase 1 (Foundation) done. Next: Phase 2 — Auth, cabinet & first deploy.
