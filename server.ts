import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const HOST = '0.0.0.0';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'om1234';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me';
const COOKIE_NAME = 'admin_session';

interface Visitor {
  id: number;
  nickname: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

const visitorsMap = new Map<string, Visitor>();

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'visitors.json');

try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const items = JSON.parse(raw);
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item && item.id) {
          visitorsMap.set(String(item.id), item);
        }
      }
    }
  }
} catch {
  // in-memory fallback
}

function persistVisitors() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(Array.from(visitorsMap.values()), null, 2), 'utf-8');
  } catch {
    // ignore disk write errors
  }
}

const hmac = (v: string) => crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('hex');
const sign = (v: string) => `${v}.${hmac(v)}`;
const verifyToken = (token?: string): boolean => {
  if (!token || !SESSION_SECRET) return false;
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
};

function getAuthToken(req: Request): string | undefined {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const rawCookie = req.headers.cookie;
  if (rawCookie) {
    const match = rawCookie
      .split(';')
      .map((c) => c.trim().split('='))
      .find(([k]) => k === COOKIE_NAME);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  return undefined;
}

function isRequestAdmin(req: Request): boolean {
  const token = getAuthToken(req);
  return verifyToken(token);
}

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.post('/api/visitors', (req: Request, res: Response) => {
    const body = req.body || {};
    const name =
      typeof body.nickname === 'string'
        ? body.nickname.trim().replace(/[\p{Cc}<>]/gu, '')
        : '';
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);

    if (!name || name.length > 60) {
      res.status(400).json({ error: 'Nickname is required (max 60 characters).' });
      return;
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      res.status(400).json({ error: 'Invalid latitude.' });
      return;
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'Invalid longitude.' });
      return;
    }

    const createdAt = new Date().toISOString();
    const record: Visitor = {
      id: Date.now(),
      nickname: name,
      latitude: lat,
      longitude: lon,
      createdAt,
    };

    visitorsMap.set(`${record.id}`, record);
    persistVisitors();

    res.status(201).json({ ok: true });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      username !== ADMIN_USER ||
      password.length !== ADMIN_PASSWORD.length ||
      !crypto.timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PASSWORD))
    ) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = sign(`${ADMIN_USER}|${Date.now() + 12 * 3600e3}`);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      path: '/',
      maxAge: 43200 * 1000,
      sameSite: 'lax',
    });

    res.json({ ok: true });
  });

  app.post('/api/admin/logout', (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  });

  app.get('/api/admin/me', (req: Request, res: Response) => {
    if (isRequestAdmin(req)) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  });

  app.get('/api/admin/visitors', (req: Request, res: Response) => {
    if (!isRequestAdmin(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const list = Array.from(visitorsMap.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );

    res.json({ visitors: list });
  });

  // Frontend integration (Vite dev middleware or Static bundle serving)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
