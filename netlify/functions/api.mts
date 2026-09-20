import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';

// Server-side only, never bundled into the client.
// Set these in Netlify → Site settings → Environment variables (no .env files).
const ADMIN_USER = process.env.ADMIN_USER || 'admin'; // change this in production!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'om1234'; // change this in production!
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me'; // change this in production!

const COOKIE = 'admin_session';
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const hmac = (v: string) => crypto.createHmac('sha256', SESSION_SECRET!).update(v).digest('hex');
const sign = (v: string) => `${v}.${hmac(v)}`;
const verify = (token?: string) => {
  if (!token || !SESSION_SECRET) return false;
  const i = token.lastIndexOf('.');
  if (i < 0) return false;
  const value = token.slice(0, i);
  const mac = token.slice(i + 1);
  const expected = hmac(value);
  if (mac.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false;
  return Number(value.split('|')[1]) > Date.now();
};

const readCookie = (req: Request, name: string) => {
  const raw = (req.headers.get('cookie') || '')
    .split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === name)?.[1];
  return raw ? decodeURIComponent(raw) : undefined;
};

const isAdmin = (req: Request) => verify(readCookie(req, COOKIE));

// Netlify Blobs: persistent across invocations and deploys (Functions' own filesystem
// is ephemeral, so SQLite is not an option here). One blob per visitor keeps concurrent
// writes race-free — no read-modify-write of a shared document.
const store = () => getStore({ name: 'visitors', consistency: 'strong' });

interface Visitor {
  id: number;
  nickname: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export default async (req: Request, _context: Context) => {
  const { pathname } = new URL(req.url);

  if (pathname === '/api/visitors' && req.method === 'POST') {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const name =
      typeof body.nickname === 'string' ? body.nickname.trim().replace(/[\p{Cc}<>]/gu, '') : '';
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);
    if (!name || name.length > 60)
      return json({ error: 'Nickname is required (max 60 characters).' }, 400);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return json({ error: 'Invalid latitude.' }, 400);
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) return json({ error: 'Invalid longitude.' }, 400);
    const createdAt = new Date().toISOString();
    try {
      const record: Visitor = { id: Date.now(), nickname: name, latitude: lat, longitude: lon, createdAt };
      await store().setJSON(`${createdAt}-${crypto.randomUUID()}`, record);
    } catch (e) {
      console.error(e);
      return json({ error: 'Could not save your details. Please try again.' }, 500);
    }
    return json({ ok: true }, 201); // never echo stored data back to the client
  }

  if (pathname === '/api/admin/login' && req.method === 'POST') {
    if (!ADMIN_PASSWORD || !SESSION_SECRET) {
      console.error('ADMIN_PASSWORD / SESSION_SECRET environment variables are not configured.');
      return json({ error: 'Admin login is not configured.' }, 503);
    }
    const { username, password } = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const ok =
      typeof password === 'string' &&
      username === ADMIN_USER &&
      password.length === ADMIN_PASSWORD.length &&
      crypto.timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PASSWORD));
    if (!ok) return json({ error: 'Invalid credentials' }, 401);
    const token = sign(`${ADMIN_USER}|${Date.now() + 12 * 3600e3}`);
    return json({ ok: true }, 200, {
      'Set-Cookie': `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`,
    });
  }

  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    return json({ ok: true }, 200, {
      'Set-Cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
    });
  }

  if (pathname === '/api/admin/me' && req.method === 'GET') {
    return isAdmin(req) ? json({ ok: true }) : json({ error: 'Unauthorized' }, 401);
  }

  if (pathname === '/api/admin/visitors' && req.method === 'GET') {
    if (!isAdmin(req)) return json({ error: 'Unauthorized' }, 401);
    try {
      const s = store();
      const { blobs } = await s.list();
      const visitors = (
        await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' }) as Promise<Visitor>))
      )
        .filter(Boolean)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return json({ visitors });
    } catch (e) {
      console.error(e);
      return json({ error: 'Could not load visitors.' }, 500);
    }
  }

  return json({ error: 'Not found' }, 404);
};

export const config: Config = {
  path: [
    '/api/visitors',
    '/api/admin/login',
    '/api/admin/logout',
    '/api/admin/me',
    '/api/admin/visitors',
  ],
};
