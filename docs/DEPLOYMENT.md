# Deployment guide (free tier, step by step)

The repository is **public**: never commit keys. Everything secret goes into GitHub Secrets / Cloudflare / Supabase settings.

## 1. Supabase

1. Create a free project at supabase.com. Note the **Project ref** (in the URL) and **Project URL**.
2. Settings → API: copy the **anon / publishable key** (safe for the frontend). Never use the `service_role` key in the app.
3. Apply migrations: either let the `DB migrate` workflow do it (step 4), or run the SQL files from `supabase/migrations/` in the SQL editor in order.
4. Authentication → Sign In / Providers → **disable "Allow new users to sign up"** (the app is invite-only).
5. Authentication → Password: min length 10, enable leaked-password protection (if available on your plan).
6. Authentication → URL Configuration: Site URL = your `https://<project>.pages.dev`; add `http://localhost:5173` to Redirect URLs.
7. Authentication → Users → **Invite user** to create her account.
8. (Optional) run `supabase/tests/rls_profiles.sql` in the SQL editor: it must print `PASS` and rolls back.

## 2. GitHub

1. Create a public repo, push this project.
2. Settings → Secrets and variables → Actions → add:

| Secret                  | Value                      | Used by    |
| ----------------------- | -------------------------- | ---------- |
| `SUPABASE_ACCESS_TOKEN` | account access token       | db-migrate |
| `SUPABASE_DB_PASSWORD`  | database password          | db-migrate |
| `SUPABASE_PROJECT_REF`  | project ref                | db-migrate |
| `SUPABASE_URL`          | project URL                | keepalive  |
| `SUPABASE_ANON_KEY`     | anon key                   | keepalive  |
| `SUPABASE_DB_URL`       | Postgres connection string | backup     |
| `BACKUP_PASSPHRASE`     | long random passphrase     | backup     |

Backups are uploaded as workflow artifacts, which anyone can download from a public repo — they are **GPG-encrypted** with `BACKUP_PASSPHRASE`. Store that passphrase in a password manager, or the backups are unreadable.
To restore: `gpg -d backup.sql.gpg > backup.sql`.

## 3. Cloudflare Pages

1. Workers & Pages → Create → Pages → Connect to Git → pick the repo.
2. Build command `npm run build`, output directory `dist`, Node 24 (set `NODE_VERSION=24`).
3. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Deploy. `public/_headers` (CSP etc.) and `public/_redirects` (SPA fallback) are applied automatically.
5. Verify: open the site, check response headers in DevTools → Network, sign in with the invited account.

## 4. Local development

```bash
cp .env.example .env.local   # fill in the two VITE_ values
npm run dev
```

If the CSP blocks something after adding a new external service, extend `public/_headers` deliberately.
