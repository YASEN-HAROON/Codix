import { sql, ensureSchema } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('project[id] schema error:', err);
    return res.status(500).json({ error: err.message || 'Database is not configured yet.' });
  }

  const userId = requireAuth(req, res);
  if (!userId) return;

  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      const result = await sql`
        DELETE FROM projects WHERE id = ${id} AND user_id = ${userId} RETURNING id
      `;
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found.' });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('project DELETE error:', err);
      return res.status(500).json({ error: err.message || 'Could not delete the project.' });
    }
  }

  res.setHeader('Allow', 'DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
}
