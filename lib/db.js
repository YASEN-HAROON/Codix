import { sql } from '@vercel/postgres';

// Creates all tables if they don't exist yet. Safe to call on every request —
// CREATE TABLE IF NOT EXISTS is a cheap no-op once the schema is in place.
export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      display_name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      bio TEXT,
      location TEXT,
      timezone TEXT DEFAULT 'Pacific Time (PT)',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  // If the "users" table already existed from an earlier deploy (e.g. before
  // these columns were added to this schema), CREATE TABLE IF NOT EXISTS
  // above is a no-op and the columns would silently be missing. These
  // ALTER TABLE statements backfill them safely — each is a no-op once the
  // column is already there.
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Pacific Time (PT)'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;

  await sql`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      email_notifications BOOLEAN DEFAULT TRUE,
      push_notifications BOOLEAN DEFAULT TRUE,
      weekly_summary BOOLEAN DEFAULT FALSE,
      marketing_emails BOOLEAN DEFAULT FALSE,
      theme TEXT DEFAULT 'Dark',
      density TEXT DEFAULT 'Comfortable',
      reduce_motion BOOLEAN DEFAULT FALSE,
      two_factor BOOLEAN DEFAULT FALSE,
      show_online_status BOOLEAN DEFAULT TRUE,
      public_profile BOOLEAN DEFAULT TRUE
    );
  `;

  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS weekly_summary BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'Dark'`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS density TEXT DEFAULT 'Comfortable'`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS two_factor BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT TRUE`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS public_profile BOOLEAN DEFAULT TRUE`;

  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#6366f1',
      status TEXT DEFAULT 'progress',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT`;
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1'`;
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'progress'`;
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      tag TEXT DEFAULT 'General',
      done BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
  `;

  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT 'General'`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`;
}

export { sql };
