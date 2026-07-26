import { sql, ensureSchema } from '../../lib/db.js';
import { requireAuth, clearAuthCookie } from '../../lib/auth.js';

export default async function handler(req, res) {
  await ensureSchema();
  const userId = requireAuth(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const result = await sql`
      SELECT id, full_name, email, display_name, avatar_letter, created_at
      FROM users WHERE id = ${userId}
    `;
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.status(200).json(user);
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM users WHERE id = ${userId}`;
    clearAuthCookie(res, req);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
