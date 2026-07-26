import { sql, ensureSchema } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

function avatarLetterOf(name) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    await ensureSchema();
  } catch (err) {
    console.error('dashboard schema error:', err);
    return res.status(500).json({ error: err.message || 'Database is not configured yet.' });
  }

  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    const projectsCountResult = await sql`SELECT COUNT(*)::int AS n FROM projects WHERE user_id = ${userId}`;
    const teamMembersResult = await sql`SELECT COUNT(*)::int AS n FROM users`;
    const tasksDoneResult = await sql`
      SELECT COUNT(*)::int AS n FROM tasks WHERE user_id = ${userId} AND done = TRUE
    `;

    const projectsCount = projectsCountResult.rows[0].n;
    const teamMembers = teamMembersResult.rows[0].n;
    const tasksDone = tasksDoneResult.rows[0].n;
    const hoursLogged = Math.round(tasksDone * 1.8 * 10) / 10; // one decimal place

    const topProjectsResult = await sql`
      SELECT
        p.id, p.name, p.color, p.status, p.updated_at,
        COUNT(t.id)::int AS task_count,
        COUNT(t.id) FILTER (WHERE t.done)::int AS done_count,
        CASE WHEN COUNT(t.id) = 0 THEN 0
             ELSE ROUND(COUNT(t.id) FILTER (WHERE t.done)::numeric / COUNT(t.id) * 100)
        END AS progress
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.user_id = ${userId}
      GROUP BY p.id
      ORDER BY progress DESC, p.updated_at DESC
      LIMIT 3
    `;

    const leaderboardResult = await sql`
      SELECT
        u.display_name, u.full_name,
        COUNT(t.id) FILTER (WHERE t.done)::int AS completed
      FROM users u
      LEFT JOIN tasks t ON t.user_id = u.id
      GROUP BY u.id
      ORDER BY completed DESC, u.id ASC
      LIMIT 5
    `;
    const leaderboard = leaderboardResult.rows.map((r) => ({
      display_name: r.display_name || r.full_name,
      avatar_letter: avatarLetterOf(r.display_name || r.full_name),
      completed: r.completed,
    }));

    const tasksResult = await sql`
      SELECT id, text, tag, done FROM tasks WHERE user_id = ${userId} ORDER BY created_at DESC
    `;

    return res.status(200).json({
      stats: { projectsCount, teamMembers, tasksDone, hoursLogged },
      topProjects: topProjectsResult.rows,
      leaderboard,
      tasks: tasksResult.rows,
    });
  } catch (err) {
    console.error('dashboard error:', err);
    return res.status(500).json({ error: err.message || 'Could not load your dashboard.' });
  }
}
