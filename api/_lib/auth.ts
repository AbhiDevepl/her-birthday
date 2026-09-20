import crypto from 'node:crypto';

export const ADMIN_USER = process.env.ADMIN_USER || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'om1234';
export const SESSION_SECRET = process.env.SESSION_SECRET || 'secret-key-scrapbook-prod';

const COOKIE_NAME = 'admin_session';
const MAX_AGE_SECONDS = 43200; // 12 hours

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      list[key] = decodeURIComponent(val);
    }
  });

  return list;
}

export function createSessionToken(username: string): string {
  const timestamp = Date.now();
  const payload = `${username}:${timestamp}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token?: string): { valid: boolean; user?: string } {
  if (!token) return { valid: false };

  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return { valid: false };

  const payload = token.substring(0, lastDot);
  const signature = token.substring(lastDot + 1);

  const parts = payload.split(':');
  if (parts.length !== 2) return { valid: false };

  const [username, tsStr] = parts;
  const timestamp = Number(tsStr);

  if (!Number.isFinite(timestamp) || Date.now() - timestamp > MAX_AGE_SECONDS * 1000) {
    return { valid: false }; // Expired
  }

  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  if (
    signature.length !== expectedSig.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
  ) {
    return { valid: false };
  }

  return { valid: true, user: username };
}

export function verifyAdminSession(req: any): { authenticated: boolean; user?: string } {
  const cookies = req.cookies || parseCookies(req.headers?.cookie);
  const token = cookies[COOKIE_NAME];
  const result = verifySessionToken(token);
  return { authenticated: result.valid, user: result.user };
}

export function buildSetCookieHeader(token: string): string {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  return `${COOKIE_NAME}=${encodeURIComponent(
    token
  )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${isProduction ? '; Secure' : ''}`;
}

export function buildClearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
