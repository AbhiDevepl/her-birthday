import crypto from 'node:crypto';
import { ADMIN_USER, ADMIN_PASSWORD, createSessionToken, buildSetCookieHeader } from '../_lib/auth.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const { username, password } = body;

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password.trim() ||
      username !== ADMIN_USER ||
      password.length !== ADMIN_PASSWORD.length ||
      !crypto.timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PASSWORD))
    ) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = createSessionToken(username);
    res.setHeader('Set-Cookie', buildSetCookieHeader(token));
    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[API /api/admin/login] Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
