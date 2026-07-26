import { sql, ensureSchema } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('settings schema error:', err);
    return res.status(500).json({ error: err.message || 'Database is not configured yet.' });
  }

  const userId = requireAuth(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    try {
      await sql`INSERT INTO user_settings (user_id) VALUES (${userId}) ON CONFLICT (user_id) DO NOTHING`;
      const result = await sql`SELECT * FROM user_settings WHERE user_id = ${userId}`;
      const { user_id, ...settings } = result.rows[0];
      return res.status(200).json(settings);
    } catch (err) {
      console.error('settings GET error:', err);
      return res.status(500).json({ error: err.message || 'Could not load your settings.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        emailNotifications, pushNotifications, weeklySummary, marketingEmails,
        theme, density, reduceMotion, twoFactor, showOnlineStatus, publicProfile,
      } = req.body || {};

      await sql`
        INSERT INTO user_settings (
          user_id, email_notifications, push_notifications, weekly_summary, marketing_emails,
          theme, density, reduce_motion, two_factor, show_online_status, public_profile
        ) VALUES (
          ${userId}, ${!!emailNotifications}, ${!!pushNotifications}, ${!!weeklySummary}, ${!!marketingEmails},
          ${theme || 'Dark'}, ${density || 'Comfortable'}, ${!!reduceMotion}, ${!!twoFactor}, ${!!showOnlineStatus}, ${!!publicProfile}
        )
        ON CONFLICT (user_id) DO UPDATE SET
          email_notifications = EXCLUDED.email_notifications,
          push_notifications = EXCLUDED.push_notifications,
          weekly_summary = EXCLUDED.weekly_summary,
          marketing_emails = EXCLUDED.marketing_emails,
          theme = EXCLUDED.theme,
          density = EXCLUDED.density,
          reduce_motion = EXCLUDED.reduce_motion,
          two_factor = EXCLUDED.two_factor,
          show_online_status = EXCLUDED.show_online_status,
          public_profile = EXCLUDED.public_profile
      `;

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('settings PUT error:', err);
      return res.status(500).json({ error: err.message || 'Could not save your settings.' });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed.' });
}
