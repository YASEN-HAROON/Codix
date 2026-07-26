import { sql, ensureSchema } from '../../lib/db.js';
import { hashPassword, signToken, setAuthCookie } from '../../lib/auth.js';

function avatarLetterOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    await ensureSchema();

    const { fullName, email, password, confirmPassword } = req.body || {};

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await hashPassword(password);

    const inserted = await sql`
      INSERT INTO users (full_name, display_name, email, password_hash)
      VALUES (${fullName.trim()}, ${fullName.trim().split(' ')[0]}, ${normalizedEmail}, ${passwordHash})
      RETURNING id, full_name, display_name, email
    `;
    const user = inserted.rows[0];

    await sql`
      INSERT INTO user_settings (user_id)
      VALUES (${user.id})
      ON CONFLICT (user_id) DO NOTHING
    `;

    const token = signToken(user.id);
    setAuthCookie(req, res, token);

    return res.status(201).json({
      id: user.id,
      full_name: user.full_name,
      display_name: user.display_name,
      email: user.email,
      avatar_letter: avatarLetterOf(user.full_name),
    });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ error: err.message || 'Something went wrong creating your account.' });
  }
}
