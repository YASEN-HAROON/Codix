import bcrypt from 'bcryptjs';
import { sql, ensureSchema } from '../../lib/db.js';
import { signToken, setAuthCookie } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await ensureSchema();

  const { fullName, email, password, confirmPassword } = req.body || {};

  if (!fullName || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const displayName = fullName.trim().split(' ')[0];
    const avatarLetter = fullName.trim()[0].toUpperCase();

    const result = await sql`
      INSERT INTO users (full_name, email, password_hash, display_name, avatar_letter)
      VALUES (${fullName.trim()}, ${normalizedEmail}, ${passwordHash}, ${displayName}, ${avatarLetter})
      RETURNING id
    `;
    const userId = result.rows[0].id;

    // Seed a starter project + task so new accounts aren't empty.
    await sql`
      INSERT INTO projects (user_id, name, description, color, status, progress)
      VALUES (${userId}, 'My First Project', 'Getting started with Codix.', '#6366f1', 'progress', 10)
    `;
    await sql`
      INSERT INTO tasks (user_id, text, tag, done)
      VALUES (${userId}, 'Explore your new dashboard', 'General', false)
    `;

    const token = signToken(userId);
    setAuthCookie(res, token, req);

    res.status(201).json({ id: userId, fullName: fullName.trim(), email: normalizedEmail, displayName, avatarLetter });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
}
