import { sql, ensureSchema } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  await ensureSchema();
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { id } = req.query;

  const owned = await sql`SELECT id FROM projects WHERE id = ${id} AND user_id = ${userId}`;
  if (owned.rows.length === 0) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  if (req.method === 'PUT') {
    const { name, description, color, status, progress } = req.body || {};
    const result = await sql`
      UPDATE projects SET
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        color = COALESCE(${color}, color),
        status = COALESCE(${status}, status),
        progress = COALESCE(${progress}, progress),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;
    return res.status(200).json(result.rows[0]);
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM projects WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
