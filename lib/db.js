import { sql } from '@vercel/postgres';

let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      bio TEXT,
      phone TEXT,
      location TEXT,
      timezone TEXT DEFAULT 'Pacific Time (PT)',
      avatar_letter TEXT,
      theme TEXT DEFAULT 'Dark',
      density TEXT DEFAULT 'Comfortable',
      reduce_motion BOOLEAN DEFAULT false,
      email_notifications BOOLEAN DEFAULT true,
      push_notifications BOOLEAN DEFAULT true,
      weekly_summary BOOLEAN DEFAULT false,
      marketing_emails BOOLEAN DEFAULT false,
      two_factor BOOLEAN DEFAULT false,
      show_online_status BOOLEAN DEFAULT true,
      public_profile BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#6366f1',
      status TEXT DEFAULT 'progress',
      progress INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      text TEXT NOT NULL,
      tag TEXT DEFAULT 'General',
      done BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT now()
    )
  `;

  schemaReady = true;
}

export { sql };
