# gratafy — backend (Vercel-ready)

This is the Vercel-compatible version of the backend: serverless functions
in `/api` instead of a long-running Express server, and a hosted Postgres
database (via Neon) instead of a local SQLite file (SQLite's file doesn't
survive between serverless invocations, so it can't be used on Vercel).

## Structure

```
index.html, signup.html, main.css, app.js, dashboard.html   <- static front-end (served from root)
api/
  signup.js     POST /api/signup
  login.js      POST /api/login
  me.js         GET  /api/me
  logout.js     POST /api/logout
lib/
  db.js         Postgres queries (createUser, getUserByEmail, getUserById)
  auth.js       JWT + cookie helpers shared by the /api functions
```

## Deploy steps

1. **Push this project to a Git repo** (GitHub/GitLab/Bitbucket), then
   import it in the Vercel dashboard — or run `vercel` from this folder
   with the Vercel CLI.

2. **Add a Postgres database**: in your Vercel project, go to
   **Storage -> Marketplace**, install **Neon**, and connect it to this
   project (Vercel's own Postgres offering is deprecated in favor of
   this native Neon integration). It automatically sets the
   `DATABASE_URL` environment variable for you — you don't need to type
   it in yourself.

3. **Set `JWT_SECRET`**: Project -> **Settings -> Environment Variables**
   -> add `JWT_SECRET` with a long random value (e.g. run
   `openssl rand -base64 32` locally and paste the result).

4. **Redeploy** (Vercel does this automatically after you add env vars,
   or trigger it manually from the dashboard).

That's it — `index.html` is your login page, and it calls `/api/login`
and `/api/signup` on the same domain, no extra configuration needed.

## Local development

```bash
npm install -g vercel   # if you don't have it
npm install
vercel dev
```
`vercel dev` reproduces the serverless environment locally and reads
`DATABASE_URL` / `JWT_SECRET` from a `.env` file — run `vercel env pull`
to fetch the real values from your linked project, or copy `DATABASE_URL`
from Storage -> your Neon database -> **Connection Details** in the
dashboard.

## API

| Method | Route          | Body                                              |
|--------|----------------|----------------------------------------------------|
| POST   | `/api/signup`  | `full_name, email, password, confirm_password`     |
| POST   | `/api/login`   | `email, password`                                   |
| GET    | `/api/me`      | — (reads the session cookie)                        |
| POST   | `/api/logout`  | —                                                    |

## How auth works

- Passwords are hashed with **bcrypt**.
- Login/signup sign a **JWT** and send it back as an `httpOnly` cookie,
  so front-end JavaScript can't read it (protects against XSS).
- Every `/api` function is its own isolated process on Vercel, so the
  cookie/JWT logic lives in `lib/auth.js` and gets imported by whichever
  function needs it — there's no shared server instance to attach
  middleware to like there was with Express.

## Notes

- There's no built-in rate limiting in this version (the Express
  version had one via `express-rate-limit`, but that only works with a
  persistent process). If you want brute-force protection on Vercel,
  use [Vercel Firewall / rate limiting rules](https://vercel.com/docs/security/vercel-waf/rate-limiting)
  from the dashboard, or add a small check against a KV store (e.g.
  Vercel KV / Upstash Redis) in `lib/auth.js`.
- No email verification or password reset yet — natural next steps.
