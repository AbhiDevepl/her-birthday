import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const HOST = '0.0.0.0';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'om1234';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me';
const COOKIE_NAME = 'admin_session';

export interface Visitor {
  id: number;
  nickname: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  user_agent?: string;
  ip_address?: string;
  createdAt: string;
}

function rowToVisitor(r: any): Visitor {
  return {
    id: Number(r.id),
    nickname: String(r.nickname),
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    accuracy: r.accuracy != null ? Number(r.accuracy) : undefined,
    timestamp: r.timestamp ? String(r.timestamp) : undefined,
    address: r.address ? String(r.address) : undefined,
    area: r.area ? String(r.area) : undefined,
    city: r.city ? String(r.city) : undefined,
    state: r.state ? String(r.state) : undefined,
    country: r.country ? String(r.country) : undefined,
    user_agent: r.user_agent ? String(r.user_agent) : undefined,
    ip_address: r.ip_address ? String(r.ip_address) : undefined,
    createdAt: String(r.created_at),
  };
}

// ---------------------------------------------------------------------------
// Database: SQLite (data.db)
// ---------------------------------------------------------------------------
const DB_PATH = path.join(process.cwd(), 'data.db');
const db = new DatabaseSync(DB_PATH);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    timestamp TEXT,
    address TEXT,
    area TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_visitors_created_at ON visitors(created_at DESC);
`);

// Migrate any legacy data/visitors.json if database table is empty
try {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM visitors').get() as { cnt: number } | undefined;
  if (!countRow || countRow.cnt === 0) {
    const legacyFile = path.join(process.cwd(), 'data', 'visitors.json');
    if (fs.existsSync(legacyFile)) {
      const raw = fs.readFileSync(legacyFile, 'utf-8');
      const items = JSON.parse(raw);
      if (Array.isArray(items) && items.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO visitors (nickname, latitude, longitude, accuracy, timestamp, address, area, city, state, country, user_agent, ip_address, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of items) {
          if (item && item.nickname && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) {
            insertStmt.run(
              String(item.nickname),
              Number(item.latitude),
              Number(item.longitude),
              item.accuracy != null ? Number(item.accuracy) : null,
              item.timestamp ? String(item.timestamp) : null,
              item.address ? String(item.address) : null,
              item.area ? String(item.area) : null,
              item.city ? String(item.city) : null,
              item.state ? String(item.state) : null,
              item.country ? String(item.country) : null,
              item.user_agent ? String(item.user_agent) : null,
              item.ip_address ? String(item.ip_address) : null,
              item.createdAt ? String(item.createdAt) : new Date().toISOString()
            );
          }
        }
      }
    }
  }
} catch (e) {
  console.warn('[DB] Legacy migration check notice:', e);
}

// ---------------------------------------------------------------------------
// Reverse Geocoding Cache & Handler
// ---------------------------------------------------------------------------
interface GeoResult {
  displayName: string;
  area: string;
  city: string;
  state: string;
  country: string;
}

const geocodeCache = new Map<string, GeoResult>();

async function resolveReverseGeocode(lat: number, lon: number): Promise<GeoResult | null> {
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'BirthdayScrapbookApp/1.0',
          'Accept-Language': 'en',
        },
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const data = await response.json();
    const address = data.address || {};
    const area =
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.residential ||
      address.commercial ||
      address.hamlet ||
      '';
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      '';
    const state = address.state || address.province || address.region || '';
    const country = address.country || '';
    const displayName =
      data.display_name ||
      (city ? `${city}${state ? `, ${state}` : ''}, ${country}` : country) ||
      '';
    const result: GeoResult = { displayName, area, city, state, country };

    geocodeCache.set(cacheKey, result);
    if (geocodeCache.size > 1000) {
      const firstKey = geocodeCache.keys().next().value;
      if (firstKey) geocodeCache.delete(firstKey);
    }
    return result;
  } catch {
    return null;
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

  // Security: Block direct HTTP downloads of database files
  app.use((req: Request, res: Response, next) => {
    const p = req.path.toLowerCase();
    if (p === '/data.db' || p.endsWith('.db') || p.endsWith('.sqlite')) {
      res.status(403).json({ error: 'Access to database file is forbidden.' });
      return;
    }
    next();
  });

  // API Routes
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/reverse-geocode', async (req: Request, res: Response) => {
    const lat = Number(req.query.latitude ?? req.query.lat);
    const lon = Number(req.query.longitude ?? req.query.lon);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      res.status(400).json({ error: 'Valid latitude (-90..90) and longitude (-180..180) required' });
      return;
    }

    const geo = await resolveReverseGeocode(lat, lon);
    if (geo) {
      res.json({ ok: true, data: geo });
    } else {
      res.json({ ok: false, error: 'Reverse geocode unavailable' });
    }
  });

  app.post('/api/visitors', async (req: Request, res: Response) => {
    console.log('[VISITOR] Request received');
    const body = req.body || {};
    const name =
      typeof body.nickname === 'string'
        ? body.nickname.trim().replace(/[\p{Cc}<>]/gu, '')
        : '';
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);
    const accuracy = Number.isFinite(Number(body.accuracy))
      ? Math.round(Number(body.accuracy))
      : undefined;
    const clientTimestamp =
      typeof body.timestamp === 'string' && !isNaN(Date.parse(body.timestamp))
        ? body.timestamp
        : undefined;

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

    console.log('[VISITOR] Payload validated');

    const createdAt = new Date().toISOString();
    const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress || null;

    // Deduplication check: identical record submitted within the last 5 seconds
    try {
      const recent = db
        .prepare(`
          SELECT id FROM visitors
          WHERE nickname = ? AND ABS(latitude - ?) < 0.0001 AND ABS(longitude - ?) < 0.0001
          AND datetime(created_at) >= datetime('now', '-5 seconds')
          LIMIT 1
        `)
        .get(name, lat, lon) as { id: number | bigint } | undefined;

      if (recent) {
        console.log('[VISITOR] Duplicate request ignored within 5s deduplication window');
        const existing = db
          .prepare('SELECT * FROM visitors WHERE id = ?')
          .get(recent.id) as any;
        res.status(200).json({
          ok: true,
          deduplicated: true,
          visitor: existing ? rowToVisitor(existing) : { id: Number(recent.id) },
        });
        return;
      }
    } catch {
      // Continue if deduplication check fails
    }

    // Persist coordinates immediately; reverse geocoding must not block saving.
    let insertedId: number;
    try {
      const insertStmt = db.prepare(`
        INSERT INTO visitors (nickname, latitude, longitude, accuracy, timestamp, user_agent, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = insertStmt.run(
        name,
        lat,
        lon,
        accuracy != null ? accuracy : null,
        clientTimestamp || null,
        userAgent,
        ipAddress,
        createdAt
      );
      insertedId = Number(result.lastInsertRowid);
      console.log('[VISITOR] Database insert successful (id=%s)', insertedId);
    } catch (dbErr) {
      console.error('[VISITOR] Database insert error:', dbErr);
      res.status(500).json({ error: 'Failed to record visitor.' });
      return;
    }

    // Reverse geocoding afterwards: enrich the stored row if possible, never block on it.
    const geo = await resolveReverseGeocode(lat, lon).catch(() => null);
    if (geo) {
      try {
        db.prepare(`
          UPDATE visitors
          SET address = ?, area = ?, city = ?, state = ?, country = ?
          WHERE id = ?
        `).run(
          geo.displayName || null,
          geo.area || null,
          geo.city || null,
          geo.state || null,
          geo.country || null,
          insertedId
        );
      } catch (e) {
        console.warn('[VISITOR] Reverse geocode enrichment update failed:', e);
      }
    }

    // Return the authoritative persisted record (id + all stored fields).
    const saved = db.prepare('SELECT * FROM visitors WHERE id = ?').get(insertedId) as any;
    res.status(201).json({
      ok: true,
      visitor: saved ? rowToVisitor(saved) : { id: insertedId },
    });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username ||
      !password ||
      username !== ADMIN_USER ||
      password.length !== ADMIN_PASSWORD.length ||
      !crypto.timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PASSWORD))
    ) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = sign(`${ADMIN_USER}|${Date.now() + 12 * 3600e3}`);
    res.set('Cache-Control', 'no-store');
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      path: '/',
      maxAge: 43200 * 1000,
      sameSite: 'lax',
    });

    res.json({ ok: true });
  });

  app.post('/api/admin/logout', (_req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  });

  app.get('/api/admin/me', (req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    if (isRequestAdmin(req)) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  });

  app.get('/api/admin/visitors', (req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    if (!isRequestAdmin(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const stmt = db.prepare(`SELECT * FROM visitors ORDER BY id DESC`);
      const rows = stmt.all() as any[];
      const list: Visitor[] = rows.map(rowToVisitor);

      res.json({ visitors: list });
    } catch (err) {
      console.error('[ADMIN] Error fetching visitors:', err);
      res.status(500).json({ error: 'Failed to retrieve visitors' });
    }
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

  // Central error handler: log any uncaught error server-side and return a
  // JSON body so a failure is never a silent `500 ()`.
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[SERVER] Unhandled error on /api:', err);
    if (res.headersSent) {
      return;
    }
    res.status(500).json({
      error: 'Internal server error',
      detail: err?.message ? String(err.message) : String(err),
    });
  });

  app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
