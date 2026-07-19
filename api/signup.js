// api/signup.js  ->  POST /api/signup
import bcrypt from 'bcryptjs';
import { createUser, getUserByEmail } from '../lib/db.js';
import { signToken, authCookieHeader } from '../lib/auth.js';

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const full_name = (body.full_name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const confirm_password = body.confirm_password;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email and password are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (confirm_password !== undefined && confirm_password !== password) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const password_hash = bcrypt.hashSync(password, 12);
    const user = await createUser({ full_name, email, password_hash });

    const token = signToken(user);
    res.setHeader('Set-Cookie', authCookieHeader(token));

    return res.status(201).json({
      user: { id: user.id, full_name: user.full_name, email: user.email },
    });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
