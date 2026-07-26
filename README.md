> **Note:** this zip includes the full backend (`/api` + `/lib`). It was
> missing from the previous upload, which is why login kept bouncing back
> to the sign-in page — there was no server code to create the session
> cookie in the first place. Everything below now matches what's actually
> in this folder.

# Codix — now with a real backend

This turns the static mockup into a working app: real accounts, real
sessions, and real data, backed by Postgres and deployed as Vercel
serverless functions.

## What's real now

- **Auth** — `signup.html` / `index.html` create real accounts (bcrypt-hashed
  passwords) and log in with an httpOnly JWT cookie session.
- **Profile** — editable and persisted (name, email, phone, bio, location,
  timezone). Delete-account really deletes the row (and cascades projects/tasks).
- **Settings** — every toggle/select (notifications, theme, density, 2FA
  flag, privacy toggles) is saved to the database. "Change password" and
  "Request export" (downloads a JSON file of your data) both work.
- **Projects** — create, delete, filter, and search are real; each card's
  task counts and "updated" time come from the database.
- **Tasks** — add, check off, and delete; persisted per user.
- **Dashboard** — stats, "Best Project This Week", and the leaderboard are
  computed live from the database. The leaderboard ranks every registered
  user by completed tasks — the more people sign up, the more real it gets.

One honesty note: there's no time-tracking anywhere yet, so "Hours Logged"
is a labeled estimate (`completed tasks × 1.8`), not a real timer.

## Project layout

```
/index.html, signup.html, dashboard.html, profile.html, projects.html, settings.html
/main.css, pages.css, app.js       ← frontend, now calling the API below
/api/**                            ← Vercel serverless functions (the backend)
/lib/db.js, lib/auth.js            ← shared DB + auth helpers
```

## Deploy to Vercel

### 1. Get the code into a git repo
```bash
cd codix
git init
git add .
git commit -m "Codix with real backend"
```
Push it to GitHub (or GitLab/Bitbucket) — Vercel deploys straight from a repo.

### 2. Import into Vercel
Go to https://vercel.com/new, import the repo. Framework preset: **Other**
(no build step needed — it's plain HTML/CSS/JS + serverless functions).

### 3. Add a Postgres database
In the new project: **Storage** tab → **Create Database** → choose
**Postgres** (this provisions a Neon-backed database and automatically
injects `POSTGRES_URL` and related env vars — you don't set those by hand).

### 4. Add one environment variable
**Settings → Environment Variables**:
- `JWT_SECRET` — any long random string (e.g. run `openssl rand -hex 32`
  locally and paste the result). This signs login sessions.

### 5. Deploy
Trigger a deploy (or it'll redeploy automatically after adding the env var/DB).
The database tables are created automatically on first request — no manual
migration step.

### 6. Try it
Visit your `*.vercel.app` URL → you'll land on the login page → click
"Sign up" → create an account → you're in.

## Running locally (optional)
```bash
npm install -g vercel   # if you don't have it
cd codix
vercel dev
```
`vercel dev` will ask you to link the project (so it can pull the
`POSTGRES_URL` env var from your Vercel project) and then serve everything,
including `/api`, at `http://localhost:3000`.

## Notes / things you may want to extend
- No password-reset-via-email flow (no email provider is wired up).
- Two-factor authentication is stored as a toggle but not actually enforced
  at login — enabling it doesn't yet gate sign-in.
- The leaderboard is global across all signups on your deployment (there's
  no team/workspace concept), which matches the original mock's "everyone
  on one board" feel.
