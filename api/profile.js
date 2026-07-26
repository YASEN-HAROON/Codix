import { sql, ensureSchema } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('profile schema error:', err);
    return res.status(500).json({ error: err.message || 'Database is not configured yet.' });
  }

  const userId = requireAuth(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT full_name, display_name, email, phone, bio, location, timezone, created_at
        FROM users WHERE id = ${userId}
      `;
      const profile = result.rows[0];
      if (!profile) return res.status(404).json({ error: 'Profile not found.' });
      return res.status(200).json(profile);
    } catch (err) {
      console.error('profile GET error:', err);
      return res.status(500).json({ error: err.message || 'Could not load your profile.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { fullName, displayName, email, phone, bio, location, timezone } = req.body || {};
      if (!fullName || !fullName.trim()) {
        return res.status(400).json({ error: 'Full name is required.' });
      }
      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email is required.' });
      }
      const normalizedEmail = email.trim().toLowerCase();

      const clash = await sql`
        SELECT id FROM users WHERE email = ${normalizedEmail} AND id <> ${userId}
      `;
      if (clash.rows.length > 0) {
        return res.status(409).json({ error: 'That email is already in use by another account.' });
      }

      await sql`
        UPDATE users SET
          full_name = ${fullName.trim()},
          display_name = ${displayName ? displayName.trim() : null},
          email = ${normalizedEmail},
          phone = ${phone ? phone.trim() : null},
          bio = ${bio ? bio.trim() : null},
          location = ${location ? location.trim() : null},
          timezone = ${timezone || 'Pacific Time (PT)'}
        WHERE id = ${userId}
      `;

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('profile PUT error:', err);
      return res.status(500).json({ error: err.message || 'Could not save your profile.' });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed.' });
}
