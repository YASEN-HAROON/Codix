import { sql, ensureSchema } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('task[id] schema error:', err);
    return res.status(500).json({ error: err.message || 'Database is not configured yet.' });
  }

  const userId = requireAuth(req, res);
  if (!userId) return;

  const { id } = req.query;

  if (req.method === 'PATCH') {
    try {
      const { done } = req.body || {};
      const result = await sql`
        UPDATE tasks SET
          done = ${!!done},
          completed_at = CASE WHEN ${!!done} THEN NOW() ELSE NULL END
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id, text, tag, done
      `;
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found.' });
      }
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('task PATCH error:', err);
      return res.status(500).json({ error: err.message || 'Could not update the task.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await sql`
        DELETE FROM tasks WHERE id = ${id} AND user_id = ${userId} RETURNING id
      `;
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found.' });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('task DELETE error:', err);
      return res.status(500).json({ error: err.message || 'Could not delete the task.' });
    }
  }

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
}
