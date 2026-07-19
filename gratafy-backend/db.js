// db.js
// Sets up a local SQLite database file (gratafy.db) and the `users` table.
// SQLite is used because it needs zero setup (no server to install/run) —
// swap this file out for a Postgres/MySQL client later without touching
// the rest of the app, as long as you keep the same function names.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'gratafy.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// --- Prepared statements (fast + safe from SQL injection) ---

const insertUserStmt = db.prepare(`
  INSERT INTO users (full_name, email, password_hash)
  VALUES (@full_name, @email, @password_hash)
`);

const findByEmailStmt = db.prepare(`
  SELECT * FROM users WHERE email = ?
`);

const findByIdStmt = db.prepare(`
  SELECT id, full_name, email, created_at FROM users WHERE id = ?
`);

function createUser({ full_name, email, password_hash }) {
  const info = insertUserStmt.run({ full_name, email, password_hash });
  return findByIdStmt.get(info.lastInsertRowid);
}

function getUserByEmail(email) {
  return findByEmailStmt.get(email.toLowerCase());
}

function getUserById(id) {
  return findByIdStmt.get(id);
}

module.exports = { db, createUser, getUserByEmail, getUserById };
