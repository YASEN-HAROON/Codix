import { sql, ensureSchema } from '../../lib/db.js';
import { requireAuth, clearAuthCookie } from '../../lib/auth.js';

function avatarLetterOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

export default async function handler(req, res) {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('me schema error:', err);
    return res.status(500).json({ error: err.message || 'Database is not configured yet.' });
  }

  const userId = requireAuth(req, res);
  if (!userId) return; // requireAuth already sent the 401

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT id, full_name, display_name, email FROM users WHERE id = ${userId}
      `;
      const user = result.rows[0];
      if (!user) {
        clearAuthCookie(req, res);
        return res.status(401).json({ error: 'Account no longer exists.' });
      }
      return res.status(200).json({
        id: user.id,
        full_name: user.full_name,
        display_name: user.display_name,
        email: user.email,
        avatar_letter: avatarLetterOf(user.full_name),
      });
    } catch (err) {
      console.error('me GET error:', err);
      return res.status(500).json({ error: err.message || 'Could not load your session.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await sql`DELETE FROM users WHERE id = ${userId}`;
      clearAuthCookie(req, res);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('me DELETE error:', err);
      return res.status(500).json({ error: err.message || 'Could not delete your account.' });
    }
  }

  res.setHeader('Allow', 'GET, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
}
