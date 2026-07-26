import { sql, ensureSchema } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  await ensureSchema();
  const userId = requireAuth(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM tasks WHERE user_id = ${userId} ORDER BY created_at DESC`;
    return res.status(200).json(result.rows);
  }

  if (req.method === 'POST') {
    const { text, tag, projectId } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Task text is required.' });
    }
    const result = await sql`
      INSERT INTO tasks (user_id, project_id, text, tag, done)
      VALUES (${userId}, ${projectId || null}, ${text.trim()}, ${tag || 'General'}, false)
      RETURNING *
    `;
    return res.status(201).json(result.rows[0]);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
