// api/me.js  ->  GET /api/me   (returns the logged-in user, needs the auth cookie)
import { getUserById } from '../lib/db.js';
import { getUserIdFromRequest } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
