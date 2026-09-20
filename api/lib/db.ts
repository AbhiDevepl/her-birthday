// Persistent storage for the Vercel serverless functions.
//
// A filesystem SQLite file (data.db) does not survive serverless cold starts or
// scale across instances, so production persistence is delegated to an external
// Postgres database. The connection is env-driven — configure ONE of:
//   POSTGRES_URL  (Vercel Postgres / Neon)
//   DATABASE_URL  (Neon / Supabase / RDS / etc.)
//
// When neither is configured the operators surface an explicit 503
// ("storage not configured") instead of silently using volatile in-memory
// storage. Local development keeps using server.ts + data.db (SQLite) unchanged.

import postgres from 'postgres';
import { rowToVisitor, type Visitor, type VisitorRow } from './types';

let client: postgres.Sql | null = null;

// Thrown when no persistent database is configured.
export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      'Persistent storage is not configured for the Vercel API. Set the POSTGRES_URL ' +
        '(Vercel Postgres/Neon) or DATABASE_URL environment variable.'
    );
    this.name = 'StorageNotConfiguredError';
  }
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

function db(): postgres.Sql {
  if (client) return client;
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new StorageNotConfiguredError();
  client = postgres(url, { max: 1, onnotice: () => {} });
  return client;
}

export async function ensureSchema(): Promise<void> {
  await db().unsafe(`
    CREATE TABLE IF NOT EXISTS visitors (
      id SERIAL PRIMARY KEY,
      nickname TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      accuracy DOUBLE PRECISION,
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
    CREATE INDEX IF NOT EXISTS idx_visitors_created_at ON visitors (created_at DESC);
  `);
}

export async function insertVisitor(input: {
  nickname: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
  user_agent?: string | null;
  ip_address?: string | null;
}): Promise<Visitor> {
  const rows = await db()<VisitorRow[]>`
    INSERT INTO visitors (nickname, latitude, longitude, accuracy, timestamp, user_agent, ip_address, created_at)
    VALUES (${input.nickname}, ${input.latitude}, ${input.longitude}, ${input.accuracy ?? null}, ${input.timestamp ?? null}, ${input.user_agent ?? null}, ${input.ip_address ?? null}, ${new Date().toISOString()})
    RETURNING *
  `;
  return rowToVisitor(rows[0]);
}

export async function findRecentDuplicate(
  nickname: string,
  latitude: number,
  longitude: number
): Promise<number | null> {
  const rows = await db()<{ id: number; created_at: string }[]>`
    SELECT id, created_at FROM visitors
    WHERE nickname = ${nickname}
      AND ABS(latitude - ${latitude}) < 0.0001
      AND ABS(longitude - ${longitude}) < 0.0001
    ORDER BY id DESC
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const created = Date.parse(rows[0].created_at);
  if (!Number.isFinite(created)) return rows[0].id;
  return Date.now() - created < 5000 ? rows[0].id : null;
}

export async function enrichAddress(id: number, geo: {
  displayName?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
}): Promise<void> {
  await db()`
    UPDATE visitors
    SET address = ${geo.displayName ?? null},
        area = ${geo.area ?? null},
        city = ${geo.city ?? null},
        state = ${geo.state ?? null},
        country = ${geo.country ?? null}
    WHERE id = ${id}
  `;
}

export async function getVisitorById(id: number): Promise<Visitor | null> {
  const rows = await db()<VisitorRow[]>`
    SELECT * FROM visitors WHERE id = ${id} LIMIT 1
  `;
  return rows.length ? rowToVisitor(rows[0]) : null;
}

export async function listVisitors(): Promise<Visitor[]> {
  const rows = await db()<VisitorRow[]>`
    SELECT * FROM visitors ORDER BY id DESC
  `;
  return rows.map(rowToVisitor);
}