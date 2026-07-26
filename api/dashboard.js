import { sql, ensureSchema } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  await ensureSchema();
  const userId = requireAuth(req, res);
  if (!userId) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const projectsCountResult = await sql`SELECT COUNT(*) FROM projects WHERE user_id = ${userId}`;
  const teamResult = await sql`SELECT COUNT(*) FROM users`;
  const tasksDoneResult = await sql`SELECT COUNT(*) FROM tasks WHERE user_id = ${userId} AND done = true`;

  const projectsCount = Number(projectsCountResult.rows[0].count);
  const teamMembers = Number(teamResult.rows[0].count);
  const tasksDone = Number(tasksDoneResult.rows[0].count);
  // Hours logged is an estimate derived from completed tasks (no time-tracking exists yet).
  const hoursLogged = Math.round(tasksDone * 1.8);

  const topProjects = await sql`
    SELECT id, name, color, status, progress FROM projects
    WHERE user_id = ${userId}
    ORDER BY progress DESC
    LIMIT 4
  `;

  const tasks = await sql`
    SELECT * FROM tasks WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 8
  `;

  const leaderboard = await sql`
    SELECT users.id, users.display_name, users.avatar_letter,
      COUNT(tasks.id) FILTER (WHERE tasks.done = true) AS completed
    FROM users
    LEFT JOIN tasks ON tasks.user_id = users.id
    GROUP BY users.id, users.display_name, users.avatar_letter
    ORDER BY completed DESC
    LIMIT 5
  `;

  res.status(200).json({
    stats: { projectsCount, teamMembers, tasksDone, hoursLogged },
    topProjects: topProjects.rows,
    tasks: tasks.rows,
    leaderboard: leaderboard.rows,
  });
}
