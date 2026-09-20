// Storage for the Vercel serverless functions.
//
// The only data source is the repo's SQLite file (`data.db`) — no external
// Postgres, no extra services. Serverless functions run on a read-only
// filesystem, so on a cold start we copy the committed `data.db` into a
// writable `/tmp` file and open it with Node's built-in `node:sqlite`.
// Writes persist for the lifetime of that function instance.
//
// If `node:sqlite` is unavailable (older Node runtime) the store transparently
// falls back to an in-memory implementation so the API NEVER returns a 5xx for
// storage reasons.
//
// NOTE: this is best-effort by design. Data written on Vercel is NOT durable
// across function instances / cold starts — each fresh instance starts again
// from the committed `data.db`. Local development keeps using server.ts + the
// writable `data.db` at the repo root.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rowToVisitor, type Visitor, type VisitorRow } from './types';

const DB_PATH = path.join(process.cwd(), 'data.db');
const TMP_DB_PATH = path.join(os.tmpdir(), 'vercel-data.db');
const LEGACY_JSON_PATH = path.join(process.cwd(), 'data', 'visitors.json');

const SCHEMA_SQL = `
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
`;

export interface InsertVisitorInput {
  nickname: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
  user_agent?: string | null;
  ip_address?: string | null;
}

interface GeoEnrichment {
  displayName?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface VisitorStore {
  ensureSchema(): Promise<void>;
  insertVisitor(input: InsertVisitorInput): Promise<Visitor>;
  findRecentDuplicate(nickname: string, latitude: number, longitude: number): Promise<number | null>;
  enrichAddress(id: number, geo: GeoEnrichment): Promise<void>;
  getVisitorById(id: number): Promise<Visitor | null>;
  listVisitors(): Promise<Visitor[]>;
}

// ---------------------------------------------------------------------------
// SQLite implementation (primary): repo data.db seeded into writable /tmp.
// ---------------------------------------------------------------------------

type SqliteCtor = new (location: string) => any;

class SqliteStore implements VisitorStore {
  private db: any;

  constructor(Ctor: SqliteCtor) {
    try {
      if (!fs.existsSync(TMP_DB_PATH) && fs.existsSync(DB_PATH)) {
        fs.copyFileSync(DB_PATH, TMP_DB_PATH);
      }
    } catch (e) {
      console.warn('[db] seed copy of data.db failed, using in-memory SQLite:', e);
    }
    const openPath = fs.existsSync(TMP_DB_PATH) ? TMP_DB_PATH : ':memory:';
    this.db = new Ctor(openPath);
    this.db.exec(SCHEMA_SQL);
    this.migrateLegacyJsonIfEmpty();
  }

  private migrateLegacyJsonIfEmpty(): void {
    try {
      const countRow = this.db.prepare('SELECT COUNT(*) as cnt FROM visitors').get() as { cnt: number } | undefined;
      if (countRow && countRow.cnt > 0) return;
      if (!fs.existsSync(LEGACY_JSON_PATH)) return;
      const items = JSON.parse(fs.readFileSync(LEGACY_JSON_PATH, 'utf-8'));
      if (!Array.isArray(items) || items.length === 0) return;
      const stmt = this.db.prepare(`
        INSERT INTO visitors (nickname, latitude, longitude, accuracy, timestamp, address, area, city, state, country, user_agent, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of items) {
        if (item && item.nickname && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) {
          stmt.run(
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
    } catch (e) {
      console.warn('[db] legacy migration check notice:', e);
    }
  }

  async ensureSchema(): Promise<void> {
    this.db.exec(SCHEMA_SQL);
  }

  async insertVisitor(input: InsertVisitorInput): Promise<Visitor> {
    const result = this.db.prepare(`
      INSERT INTO visitors (nickname, latitude, longitude, accuracy, timestamp, user_agent, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.nickname,
      input.latitude,
      input.longitude,
      input.accuracy != null ? input.accuracy : null,
      input.timestamp || null,
      input.user_agent || null,
      input.ip_address || null,
      new Date().toISOString()
    );
    const id = Number(result.lastInsertRowid);
    const row = this.db.prepare('SELECT * FROM visitors WHERE id = ?').get(id) as VisitorRow | undefined;
    return row ? rowToVisitor(row) : rowToVisitor({ ...rowFromDb(input), id });
  }

  async findRecentDuplicate(nickname: string, latitude: number, longitude: number): Promise<number | null> {
    const row = this.db.prepare(`
      SELECT id FROM visitors
      WHERE nickname = ? AND ABS(latitude - ?) < 0.0001 AND ABS(longitude - ?) < 0.0001
      AND datetime(created_at) >= datetime('now', '-5 seconds')
      LIMIT 1
    `).get(nickname, latitude, longitude) as { id: number | bigint } | undefined;
    return row ? Number(row.id) : null;
  }

  async enrichAddress(id: number, geo: GeoEnrichment): Promise<void> {
    this.db.prepare(`
      UPDATE visitors
      SET address = ?, area = ?, city = ?, state = ?, country = ?
      WHERE id = ?
    `).run(
      geo.displayName || null,
      geo.area || null,
      geo.city || null,
      geo.state || null,
      geo.country || null,
      id
    );
  }

  async getVisitorById(id: number): Promise<Visitor | null> {
    const row = this.db.prepare('SELECT * FROM visitors WHERE id = ?').get(id) as VisitorRow | undefined;
    return row ? rowToVisitor(row) : null;
  }

  async listVisitors(): Promise<Visitor[]> {
    const rows = this.db.prepare('SELECT * FROM visitors ORDER BY id DESC').all() as VisitorRow[];
    return rows.map(rowToVisitor);
  }
}

function rowFromDb(input: InsertVisitorInput): VisitorRow {
  return {
    id: 0,
    nickname: input.nickname,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy != null ? input.accuracy : null,
    timestamp: input.timestamp || null,
    address: null,
    area: null,
    city: null,
    state: null,
    country: null,
    user_agent: input.user_agent || null,
    ip_address: input.ip_address || null,
    created_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// In-memory implementation (fallback): keeps the API working on any runtime.
// ---------------------------------------------------------------------------

class MemoryStore implements VisitorStore {
  private rows: VisitorRow[];
  private nextId: number;

  constructor() {
    this.rows = [];
    this.nextId = 1;
  }

  async ensureSchema(): Promise<void> {}

  async insertVisitor(input: InsertVisitorInput): Promise<Visitor> {
    const row: VisitorRow = { ...rowFromDb(input), id: this.nextId++ };
    this.rows.push(row);
    return rowToVisitor(row);
  }

  async findRecentDuplicate(nickname: string, latitude: number, longitude: number): Promise<number | null> {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      const row = this.rows[i];
      if (row.nickname !== nickname) continue;
      if (Math.abs(row.latitude - latitude) >= 0.0001) continue;
      if (Math.abs(row.longitude - longitude) >= 0.0001) continue;
      const created = Date.parse(row.created_at);
      if (Number.isFinite(created) && Date.now() - created < 5000) {
        return Number(row.id);
      }
      return null;
    }
    return null;
  }

  async enrichAddress(id: number, geo: GeoEnrichment): Promise<void> {
    const row = this.rows.find((r) => Number(r.id) === Number(id));
    if (!row) return;
    row.address = geo.displayName || null;
    row.area = geo.area || null;
    row.city = geo.city || null;
    row.state = geo.state || null;
    row.country = geo.country || null;
  }

  async getVisitorById(id: number): Promise<Visitor | null> {
    const row = this.rows.find((r) => Number(r.id) === Number(id));
    return row ? rowToVisitor(row) : null;
  }

  async listVisitors(): Promise<Visitor[]> {
    return [...this.rows].sort((a, b) => Number(b.id) - Number(a.id)).map(rowToVisitor);
  }
}

// ---------------------------------------------------------------------------
// Public facade: lazy singleton store, resolved once per function instance.
// ---------------------------------------------------------------------------

let storePromise: Promise<VisitorStore> | null = null;

async function getStore(): Promise<VisitorStore> {
  if (!storePromise) storePromise = initStore();
  return storePromise;
}

async function initStore(): Promise<VisitorStore> {
  try {
    const { DatabaseSync } = await import('node:sqlite');
    return new SqliteStore(DatabaseSync);
  } catch (e) {
    console.warn('[db] node:sqlite unavailable — using in-memory store:', e);
    return new MemoryStore();
  }
}

export async function ensureSchema(): Promise<void> {
  return (await getStore()).ensureSchema();
}

export async function insertVisitor(input: InsertVisitorInput): Promise<Visitor> {
  return (await getStore()).insertVisitor(input);
}

export async function findRecentDuplicate(
  nickname: string,
  latitude: number,
  longitude: number
): Promise<number | null> {
  return (await getStore()).findRecentDuplicate(nickname, latitude, longitude);
}

export async function enrichAddress(id: number, geo: GeoEnrichment): Promise<void> {
  return (await getStore()).enrichAddress(id, geo);
}

export async function getVisitorById(id: number): Promise<Visitor | null> {
  return (await getStore()).getVisitorById(id);
}

export async function listVisitors(): Promise<Visitor[]> {
  return (await getStore()).listVisitors();
}