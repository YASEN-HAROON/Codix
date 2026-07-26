import { sql, ensureSchema } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('projects schema error:', err);
    return res.status(500).json({ error: err.message || 'Database is not configured yet.' });
  }

  const userId = requireAuth(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT
          p.id, p.name, p.description, p.color, p.status, p.updated_at,
          COUNT(t.id)::int AS task_count,
          COUNT(t.id) FILTER (WHERE t.done)::int AS done_count,
          CASE WHEN COUNT(t.id) = 0 THEN 0
               ELSE ROUND(COUNT(t.id) FILTER (WHERE t.done)::numeric / COUNT(t.id) * 100)
          END AS progress
        FROM projects p
        LEFT JOIN tasks t ON t.project_id = p.id
        WHERE p.user_id = ${userId}
        GROUP BY p.id
        ORDER BY p.updated_at DESC
      `;
      return res.status(200).json(result.rows);
    } catch (err) {
      console.error('projects GET error:', err);
      return res.status(500).json({ error: err.message || 'Could not load your projects.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, color } = req.body || {};
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Project name is required.' });
      }
      const result = await sql`
        INSERT INTO projects (user_id, name, description, color, status)
        VALUES (${userId}, ${name.trim()}, ${description || ''}, ${color || '#6366f1'}, 'progress')
        RETURNING id, name, description, color, status, updated_at
      `;
      return res.status(201).json({ ...result.rows[0], task_count: 0, done_count: 0, progress: 0 });
    } catch (err) {
      console.error('projects POST error:', err);
      return res.status(500).json({ error: err.message || 'Could not create the project.' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed.' });
}
