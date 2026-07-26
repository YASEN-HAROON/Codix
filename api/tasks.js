import { sql, ensureSchema } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('tasks schema error:', err);
    return res.status(500).json({ error: err.message || 'Database is not configured yet.' });
  }

  const userId = requireAuth(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT id, text, tag, done
        FROM tasks WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      return res.status(200).json(result.rows);
    } catch (err) {
      console.error('tasks GET error:', err);
      return res.status(500).json({ error: err.message || 'Could not load your tasks.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { text, tag, projectId } = req.body || {};
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Task text is required.' });
      }
      const result = await sql`
        INSERT INTO tasks (user_id, project_id, text, tag, done)
        VALUES (${userId}, ${projectId || null}, ${text.trim()}, ${tag || 'General'}, FALSE)
        RETURNING id, text, tag, done
      `;
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('tasks POST error:', err);
      return res.status(500).json({ error: err.message || 'Could not create the task.' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed.' });
}
