import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookie from 'cookie';

const COOKIE_NAME = 'codix_token';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fail loudly and clearly instead of silently signing tokens with
    // "undefined" — that would make every login look like it "works" while
    // every session check fails right after.
    throw new Error(
      'JWT_SECRET is not set. Add it in Vercel → Settings → Environment Variables.'
    );
  }
  return secret;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(userId) {
  return jwt.sign({ userId }, getSecret(), { expiresIn: '30d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

// Vercel deployments (production AND preview) are always served over HTTPS,
// so the cookie should be Secure. `vercel dev` on localhost is plain HTTP,
// so we detect that via the forwarded proto header rather than hardcoding it.
function isHttps(req) {
  return req.headers['x-forwarded-proto'] === 'https';
}

export function setAuthCookie(req, res, token) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isHttps(req),
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE_SECONDS,
    })
  );
}

export function clearAuthCookie(req, res) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(COOKIE_NAME, '', {
      httpOnly: true,
      secure: isHttps(req),
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  );
}

export function getUserIdFromReq(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const payload = verifyToken(token);
  return payload ? payload.userId : null;
}

// Call at the top of any protected handler. Returns the userId, or null
// after already sending a 401 response (so the caller should just `return`).
export function requireAuth(req, res) {
  const userId = getUserIdFromReq(req);
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated.' });
    return null;
  }
  return userId;
}
