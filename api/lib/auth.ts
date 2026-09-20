// Admin session auth for the Vercel serverless functions, mirroring server.ts:
// an HMAC-signed `<username>|<expiry>.hexmac` token stored in the `admin_session`
// cookie (or sent as a `Bearer` token). The unsigned `admin_session=authenticated`
// cookie from the old api/admin/login.ts is no longer produced or accepted.

import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const COOKIE_NAME = 'admin_session';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'om1234';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me';

const SESSION_TTL_MS = 12 * 3600e3; // 12 hours, same as server.ts

function hmac(v: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('hex');
}

function sign(value: string): string {
  return `${value}.${hmac(value)}`;
}

function verifyToken(token?: string): boolean {
  if (!token) return false;
  const i = token.lastIndexOf('.');
  if (i < 0) return false;
  const value = token.slice(0, i);
  const mac = token.slice(i + 1);
  const expected = hmac(value);
  if (mac.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false;
  const parts = value.split('|');
  if (parts.length < 2) return false;
  const expires = Number(parts[1]);
  return Number.isFinite(expires) && expires > Date.now();
}

export function getAuthToken(req: IncomingMessage): string | undefined {
  const rawCookie = req.headers.cookie;
  if (rawCookie) {
    const match = rawCookie
      .split(';')
      .map((c) => c.trim().split('='))
      .find(([k]) => k === COOKIE_NAME);
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]);
      if (verifyToken(decoded)) return decoded;
    }
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (verifyToken(token)) return token;
  }
  return undefined;
}

export function isRequestAdmin(req: IncomingMessage): boolean {
  return verifyToken(getAuthToken(req));
}

export function credentialsMatch(username: unknown, password: unknown): boolean {
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    !username ||
    !password ||
    username !== ADMIN_USER ||
    password.length !== ADMIN_PASSWORD.length
  ) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PASSWORD));
}

export function issueSessionToken(): string {
  return sign(`${ADMIN_USER}|${Date.now() + SESSION_TTL_MS}`);
}

export function setSessionCookie(res: ServerResponse, token: string): void {
  const value = encodeURIComponent(token);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`
  );
}

export function clearSessionCookie(res: ServerResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}