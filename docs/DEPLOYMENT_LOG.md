# First deployment — what we did and what went wrong

Date: 2026-09-29. Stack: Supabase (Postgres + Auth) + Cloudflare (Workers static assets) + GitHub Actions.
See [DEPLOYMENT.md](DEPLOYMENT.md) for the clean step-by-step; this file is the story with the pitfalls.

## What we did

1. **Supabase project** created; signups disabled (invite-only app); first user created manually in
   Authentication → Users.
2. **GitHub Actions secrets** (7): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`,
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE`.
   - `SUPABASE_DB_URL` must be the **Session pooler** connection string (direct connections are IPv6-only, which
     GitHub-hosted runners can't reach). URL-encode special characters in the password.
   - `BACKUP_PASSPHRASE` is a random string kept in a password manager; backups are GPG-encrypted with it because
     workflow artifacts of a public repo are downloadable by anyone.
3. **Code pushed to GitHub** (`main`), then the repo was connected to Cloudflare.
4. **Cloudflare build**: `npm run build`, `NODE_VERSION=24`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   set as build variables (they are inlined at build time, so changing them requires a new build).
5. Result: https://sonyashyk.lementsov.workers.dev

## Problems we hit

### 1. `Failed: error occurred while fetching repository`
- **Cause:** the local repo had no commits, so the GitHub repo was empty and there was nothing to clone.
- **Fix:** make the initial commit and `git push -u origin main`, then retry the deployment. If it still fails,
  check that the Cloudflare GitHub app has access to the repository (GitHub → Settings → Applications).

### 2. `Invalid _redirects configuration: Infinite loop detected` (code 100324)
- **Cause:** Cloudflare created a **Workers** project (deploy command `npx wrangler deploy`), not a classic Pages
  project. Workers static assets reject the usual SPA rule `/* /index.html 200`.
- **Fix:** delete `public/_redirects` and add `wrangler.jsonc` with
  `"assets": { "directory": "./dist", "not_found_handling": "single-page-application" }`.
  `public/_headers` (CSP, HSTS, …) keeps working unchanged.

### 3. "Which email do I log in with?"
- **Cause:** the app is invite-only and uses email + password; there is no self-signup.
- **Fix:** Supabase → Authentication → Users → Add user → Create new user, with **Auto Confirm User** ticked, then
  sign in with those credentials. ("Invite user" depends on email/Site URL settings, so it is less predictable.)

### Smaller notes
- `openssl` is not available on Windows by default; generate the passphrase in PowerShell:
  `$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)`
- The Supabase Project URL is not always easy to find in the new dashboard; it is always
  `https://<project-ref>.supabase.co`.
- Wrangler warns that `workers_dev` and `preview_urls` are enabled by default; set `"preview_urls": false` in
  `wrangler.jsonc` if preview URLs are not wanted.
- The main JS chunk is ~770 kB (warning above 500 kB); fine for now, code-split later.

## Checklist for the next deployment

- [ ] Repo has commits and is pushed; Cloudflare has repo access.
- [ ] No `public/_redirects`; `wrangler.jsonc` is present.
- [ ] All 7 GitHub secrets set; `VITE_*` variables set in Cloudflare.
- [ ] First user created with Auto Confirm.
- [ ] Run the `backup` workflow once manually to validate `SUPABASE_DB_URL`.
