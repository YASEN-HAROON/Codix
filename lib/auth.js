import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';
const COOKIE_NAME = 'codix_token';

export function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function isHttps(req) {
  // On Vercel (and most proxies) the original protocol is only visible via
  // this header — req itself always looks like plain HTTP to the function.
  return req && req.headers && req.headers['x-forwarded-proto'] === 'https';
}

export function setAuthCookie(res, token, req) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isHttps(req),
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  );
}

export function clearAuthCookie(res, req) {
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
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

// Returns userId, or writes a 401 and returns null if not authenticated.
export function requireAuth(req, res) {
  const userId = getUserIdFromReq(req);
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return userId;
}
