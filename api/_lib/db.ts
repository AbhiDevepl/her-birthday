import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

const { Pool } = pg;

// Supabase Supavisor pooler (IPv4). The direct host db.<ref>.supabase.co is
// AAAA-only and Vercel functions have no IPv6 egress -> getaddrinfo ENOTFOUND.
const FALLBACK_DATABASE_URL =
  'postgresql://postgres.ixediwzgrjuzwubicmzt:CoNUNIEKrBll2R8m@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

export interface VisitorRecord {
  id: number | string;
  nickname: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: string | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  user_agent?: string | null;
  created_at: string;
}

// Global cached connection for serverless warm execution
let pgPool: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;
let dbInitialized = false;

function getPgPool(): pg.Pool | null {
  const databaseUrl = process.env.DATABASE_URL || FALLBACK_DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }
  if (!pgPool) {
    const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pgPool;
}

async function getPglite(): Promise<PGlite> {
  if (!pgliteInstance) {
    // Persistent PGlite directory for local dev when DATABASE_URL is not set
    pgliteInstance = new PGlite('./.pgdata');
  }
  return pgliteInstance;
}

/**
 * Execute SQL query across PostgreSQL Pool or PGlite instance
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[] }> {
  await initDb();

  const pool = getPgPool();
  if (pool) {
    const result = await pool.query(sql, params);
    return { rows: result.rows };
  }

  // Fallback to PGlite (real Postgres engine compiled to WASM)
  const pglite = await getPglite();
  const result = await pglite.query<T>(sql, params);
  return { rows: result.rows };
}

/**
 * Initialize schema and required indexes
 */
export async function initDb(): Promise<void> {
  if (dbInitialized) return;

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS visitors (
      id BIGSERIAL PRIMARY KEY,
      nickname VARCHAR(100) NOT NULL,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_visitors_created_at ON visitors (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_visitors_nickname ON visitors (nickname);
  `;

  const pool = getPgPool();
  if (pool) {
    await pool.query(createTableSql);
  } else {
    const pglite = await getPglite();
    await pglite.exec(createTableSql);
  }

  dbInitialized = true;
}

export function isHostedPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL || FALLBACK_DATABASE_URL);
}
