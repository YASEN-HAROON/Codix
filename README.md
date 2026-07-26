# Codix – Backend & Database (Vercel-ready)

Full-stack version of the Codix project management UI.

- **Frontend**: existing static HTML/CSS (served from `public/`)
- **Backend**: Next.js 14 App Router API routes
- **Database**: PostgreSQL via Prisma
- **Auth**: JWT in httpOnly cookie (jose + bcryptjs)

## Features

| Area | Endpoints |
|------|-----------|
| Auth | `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Dashboard | `GET /api/dashboard` |
| Projects | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/[id]` |
| Tasks | `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/[id]` |
| Profile | `GET/PATCH/DELETE /api/profile` |
| Settings | `GET/PATCH /api/settings` |

## Quick start (local)

### 1. Install

```bash
cd codix
npm install
```

### 2. Database

Create a free Postgres database (any of these works):

- [Vercel Postgres](https://vercel.com/storage/postgres)
- [Neon](https://neon.tech) (recommended for local + Vercel)
- [Supabase](https://supabase.com)

Copy `.env.example` → `.env` and set:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
JWT_SECRET="generate-a-long-random-string"
```

Then:

```bash
npx prisma db push
npm run db:seed
```

Seed creates:

- **alex@codix.app** / **password123** (main demo user with projects & tasks)
- Extra teammates for the leaderboard / avatars

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → login page.

## Deploy on Vercel

1. Push this folder to a GitHub repo.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add environment variables in the Vercel project settings:
   - `DATABASE_URL` – your Postgres connection string
   - `JWT_SECRET` – strong random secret
4. (Optional) Link **Vercel Postgres** storage – it injects `DATABASE_URL` automatically.
5. Deploy. On first deploy, run migrations:

   ```bash
   # From Vercel CLI or a one-off job
   npx prisma db push
   npx tsx prisma/seed.ts   # optional demo data
   ```

   Or add a Vercel build command:

   ```
   prisma generate && prisma db push && next build
   ```

   (Use `db push` for simplicity; switch to `migrate deploy` for production teams.)

## Project structure

```
codix/
├── prisma/
│   ├── schema.prisma      # Users, Projects, Tasks, Members
│   └── seed.ts
├── public/                # Original HTML + CSS + app.js client
├── src/
│   ├── app/
│   │   └── api/           # Route handlers
│   └── lib/
│       ├── auth.ts        # JWT + bcrypt helpers
│       ├── prisma.ts
│       └── validation.ts  # Zod schemas
├── package.json
├── next.config.js         # Rewrites for clean URLs
└── .env.example
```

## Data model (simplified)

- **User** – profile, hashed password, JSON settings
- **Project** – name, status (`IN_PROGRESS` | `COMPLETED` | `ON_HOLD`), progress %, color, owner
- **ProjectMember** – many-to-many users ↔ projects
- **Task** – title, completed, tag, optional project link, assignee

## Notes

- Cookies are `httpOnly` + `Secure` in production; CORS is same-origin by default.
- SQLite is **not** used – serverless filesystems on Vercel are ephemeral.
- Client script (`public/app.js`) loads data on each page and wires forms to the API.
- “Hours logged” is derived from completed tasks (demo metric); replace with real time tracking later if needed.
