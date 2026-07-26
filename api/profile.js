import { sql, ensureSchema } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  await ensureSchema();
  const userId = requireAuth(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const result = await sql`
      SELECT full_name, display_name, email, phone, bio, location, timezone, avatar_letter, created_at
      FROM users WHERE id = ${userId}
    `;
    return res.status(200).json(result.rows[0]);
  }

  if (req.method === 'PUT') {
    const { fullName, displayName, email, phone, bio, location, timezone } = req.body || {};
    if (!fullName || !email) {
      return res.status(400).json({ error: 'Full name and email are required.' });
    }
    const avatarLetter = fullName.trim()[0].toUpperCase();
    try {
      await sql`
        UPDATE users SET
          full_name = ${fullName.trim()},
          display_name = ${displayName || fullName.trim().split(' ')[0]},
          email = ${email.trim().toLowerCase()},
          phone = ${phone || null},
          bio = ${bio || null},
          location = ${location || null},
          timezone = ${timezone || 'Pacific Time (PT)'},
          avatar_letter = ${avatarLetter}
        WHERE id = ${userId}
      `;
      return res.status(200).json({ ok: true });
    } catch (err) {
      if (String(err.message || '').includes('duplicate key')) {
        return res.status(409).json({ error: 'That email is already in use.' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Something went wrong saving your profile.' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
