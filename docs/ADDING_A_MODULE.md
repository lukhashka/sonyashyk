# Adding a module

1. Copy `src/modules/_template/` to `src/modules/<your-id>/` (id: lowercase, digits, dashes).
2. Edit `index.tsx`: set `id`, `title` key, icon, `nav`, `routes` (lazy pages), and `i18n` (namespace = module id).
3. Import only from `@/core/*` and `@/shared/*` — **never from another module**. Use the event bus / daily engine / stats contracts for cross-module communication.
4. If the module needs tables: add `supabase/migrations/<timestamp>_<id>.sql` with prefixed table names, **RLS enabled + policies**, and a test proving user isolation.
5. Register it in `src/core/modules/registry.ts` (the only place modules are enabled).
6. Add unit tests; run `npm run lint && npm run typecheck && npm test`.
7. Add a line to `CHANGELOG.md`.
