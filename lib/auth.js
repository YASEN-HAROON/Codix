// lib/auth.js
// Shared helpers for signing/reading the session cookie across the
// separate serverless functions in /api (each function is its own
// isolated process, so this logic can't live on a shared "app" instance
// like it did with Express — every function that needs auth imports
// this file instead).

import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;
const SEVEN_DAYS = 7 * 24 * 60 * 60;

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function authCookieHeader(token) {
  return serialize('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SEVEN_DAYS,
  });
}

export function clearCookieHeader() {
  return serialize('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function getUserIdFromRequest(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET).sub;
  } catch {
    return null;
  }
}
