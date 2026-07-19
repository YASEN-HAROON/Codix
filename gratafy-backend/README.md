# gratafy — backend

A small Express + SQLite backend for the login/signup pages, plus the
front-end wired up to it.

## What's inside

- **`server.js`** — Express API: signup, login, session check, logout
- **`db.js`** — SQLite database setup (creates `gratafy.db` automatically, no install needed)
- **`public/`** — your original `index.html`, `signup.html`, `main.css`, plus
  `app.js` (connects the forms to the API) and `dashboard.html` (a simple
  "you're logged in" page)

## Setup

```bash
npm install
cp .env.example .env   # then edit JWT_SECRET
npm start
```

Open **http://localhost:3000** — that's the login page, served by the same
server that runs the API.

## API

| Method | Route          | Body                                              | Notes                         |
|--------|----------------|----------------------------------------------------|--------------------------------|
| POST   | `/api/signup`  | `full_name, email, password, confirm_password`     | Creates a user, sets a session cookie |
| POST   | `/api/login`   | `email, password`                                   | Sets a session cookie          |
| GET    | `/api/me`      | —                                                    | Returns the logged-in user (needs cookie) |
| POST   | `/api/logout`  | —                                                    | Clears the session cookie      |

## How auth works

- Passwords are hashed with **bcrypt** (never stored in plain text).
- On login/signup, the server signs a **JWT** and sends it as an
  `httpOnly` cookie — JavaScript in the browser can't read it, which
  protects it from XSS attacks.
- `/api/me` and any future protected route just check that cookie via
  the `requireAuth` middleware in `server.js`.

## The database

SQLite, stored in a single file (`gratafy.db`) that's created the first
time you run the server — nothing to install or configure. One table:

```
users(id, full_name, email UNIQUE, password_hash, created_at)
```

To peek at the data:

```bash
npx better-sqlite3-cli gratafy.db   # or just: sqlite3 gratafy.db "select id, full_name, email from users;"
```

### Moving to Postgres/MySQL later

Everything DB-specific lives in `db.js` (`createUser`, `getUserByEmail`,
`getUserById`). Swap the top of that file for a Postgres/MySQL client and
keep those three function signatures the same — `server.js` doesn't need
to change.

## Notes / next steps

- Rate limiting is in place on `/api/signup` and `/api/login` (20
  requests / 15 min) to slow down brute-force attempts.
- There's no email verification or password-reset flow yet — the obvious
  next additions once you're ready to go further.
- For production, set `NODE_ENV=production` (this makes the auth cookie
  `secure`, i.e. HTTPS-only) and use a strong, random `JWT_SECRET`.
