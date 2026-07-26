import { sql, ensureSchema } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  await ensureSchema();
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { id } = req.query;

  const owned = await sql`SELECT id FROM tasks WHERE id = ${id} AND user_id = ${userId}`;
  if (owned.rows.length === 0) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  if (req.method === 'PATCH') {
    const { done, text, tag } = req.body || {};
    const result = await sql`
      UPDATE tasks SET
        done = COALESCE(${done}, done),
        text = COALESCE(${text}, text),
        tag = COALESCE(${tag}, tag)
      WHERE id = ${id}
      RETURNING *
    `;
    return res.status(200).json(result.rows[0]);
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM tasks WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
