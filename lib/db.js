// lib/db.js
// Database layer for Vercel: uses Neon Postgres (hosted, persistent —
// unlike a local SQLite file, which gets wiped between serverless
// invocations and doesn't work on Vercel).
//
// @vercel/postgres is deprecated; Vercel now offers Postgres through a
// native Neon integration instead. To connect: Vercel project dashboard
// -> Storage -> Marketplace -> Neon -> install & link to this project.
// That sets a DATABASE_URL env var automatically, which the Neon
// serverless driver below reads.

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      full_name     TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  schemaReady = true;
}

export async function createUser({ full_name, email, password_hash }) {
  await ensureSchema();
  const rows = await sql`
    INSERT INTO users (full_name, email, password_hash)
    VALUES (${full_name}, ${email}, ${password_hash})
    RETURNING id, full_name, email, created_at;
  `;
  return rows[0];
}

export async function getUserByEmail(email) {
  await ensureSchema();
  const rows = await sql`
    SELECT * FROM users WHERE email = ${email.toLowerCase()};
  `;
  return rows[0] || null;
}

export async function getUserById(id) {
  await ensureSchema();
  const rows = await sql`
    SELECT id, full_name, email, created_at FROM users WHERE id = ${id};
  `;
  return rows[0] || null;
}
