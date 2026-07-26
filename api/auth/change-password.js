import { sql, ensureSchema } from '../../lib/db.js';
import { requireAuth, comparePassword, hashPassword } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    await ensureSchema();
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const result = await sql`SELECT password_hash FROM users WHERE id = ${userId}`;
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });

    const valid = await comparePassword(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await hashPassword(newPassword);
    await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${userId}`;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('change-password error:', err);
    return res.status(500).json({ error: err.message || 'Could not change your password.' });
  }
}
