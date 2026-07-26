import { sql, ensureSchema } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  await ensureSchema();
  const userId = requireAuth(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const result = await sql`
      SELECT id, name, description, color, status, progress, updated_at,
        (SELECT COUNT(*) FROM tasks WHERE tasks.project_id = projects.id) AS task_count,
        (SELECT COUNT(*) FROM tasks WHERE tasks.project_id = projects.id AND tasks.done = true) AS done_count
      FROM projects
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `;
    return res.status(200).json(result.rows);
  }

  if (req.method === 'POST') {
    const { name, description, color, status } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required.' });
    }
    const result = await sql`
      INSERT INTO projects (user_id, name, description, color, status, progress)
      VALUES (${userId}, ${name.trim()}, ${description || ''}, ${color || '#6366f1'}, ${status || 'progress'}, 0)
      RETURNING *
    `;
    return res.status(201).json(result.rows[0]);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
