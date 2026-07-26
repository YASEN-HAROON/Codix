import { clearAuthCookie } from '../../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  clearAuthCookie(res);
  res.status(200).json({ ok: true });
}
