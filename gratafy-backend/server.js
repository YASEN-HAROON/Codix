// server.js
// Backend API for the gratafy login/signup pages.
//
// Endpoints:
//   POST /api/signup   { full_name, email, password }  -> creates a user
//   POST /api/login     { email, password }              -> logs in
//   GET  /api/me                                          -> current user (needs auth cookie)
//   POST /api/logout                                     -> clears the auth cookie
//
// Run with:  npm install && npm start   (see README.md)

require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { createUser, getUserByEmail, getUserById } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// Serve the front-end (index.html / signup.html / main.css / app.js)
app.use(express.static(path.join(__dirname, 'public')));

// Basic brute-force protection on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

// ---------- helpers ----------

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.userId = jwt.verify(token, JWT_SECRET).sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

// ---------- routes ----------

app.post('/api/signup', authLimiter, (req, res) => {
  const full_name = (req.body?.full_name || '').trim();
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';
  const confirm_password = req.body?.confirm_password;

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

  if (getUserByEmail(email)) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const password_hash = bcrypt.hashSync(password, 12);
  const user = createUser({ full_name, email, password_hash });

  const token = signToken(user);
  setAuthCookie(res, token);

  res.status(201).json({
    user: { id: user.id, full_name: user.full_name, email: user.email },
  });
});

app.post('/api/login', authLimiter, (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = getUserByEmail(email);
  // Same error for "no user" and "wrong password" so we don't leak which emails exist
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  setAuthCookie(res, token);

  res.json({
    user: { id: user.id, full_name: user.full_name, email: user.email },
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`gratafy backend running at http://localhost:${PORT}`);
});
