import { sql, ensureSchema } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  await ensureSchema();
  const userId = requireAuth(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const result = await sql`
      SELECT email_notifications, push_notifications, weekly_summary, marketing_emails,
             theme, density, reduce_motion, two_factor, show_online_status, public_profile
      FROM users WHERE id = ${userId}
    `;
    return res.status(200).json(result.rows[0]);
  }

  if (req.method === 'PUT') {
    const {
      emailNotifications, pushNotifications, weeklySummary, marketingEmails,
      theme, density, reduceMotion, twoFactor, showOnlineStatus, publicProfile,
    } = req.body || {};

    await sql`
      UPDATE users SET
        email_notifications = ${!!emailNotifications},
        push_notifications = ${!!pushNotifications},
        weekly_summary = ${!!weeklySummary},
        marketing_emails = ${!!marketingEmails},
        theme = ${theme || 'Dark'},
        density = ${density || 'Comfortable'},
        reduce_motion = ${!!reduceMotion},
        two_factor = ${!!twoFactor},
        show_online_status = ${!!showOnlineStatus},
        public_profile = ${!!publicProfile}
      WHERE id = ${userId}
    `;
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
