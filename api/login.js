// api/login.js  ->  POST /api/login
import bcrypt from 'bcryptjs';
import { getUserByEmail } from '../lib/db.js';
import { signToken, authCookieHeader } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await getUserByEmail(email);
    // Same error for "no user" and "wrong password" so we don't leak which emails exist
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.setHeader('Set-Cookie', authCookieHeader(token));

    return res.status(200).json({
      user: { id: user.id, full_name: user.full_name, email: user.email },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
