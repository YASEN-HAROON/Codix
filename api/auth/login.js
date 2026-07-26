import { sql, ensureSchema } from '../../lib/db.js';
import { comparePassword, signToken, setAuthCookie } from '../../lib/auth.js';

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

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await sql`
      SELECT id, full_name, display_name, email, password_hash
      FROM users WHERE email = ${normalizedEmail}
    `;
    const user = result.rows[0];

    // Same generic message whether the email doesn't exist or the password
    // is wrong — don't leak which one it was.
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user.id);
    setAuthCookie(req, res, token);

    return res.status(200).json({
      id: user.id,
      full_name: user.full_name,
      display_name: user.display_name,
      email: user.email,
      avatar_letter: avatarLetterOf(user.full_name),
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: err.message || 'Something went wrong logging in.' });
  }
}
