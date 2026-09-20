// Shared public shape of a visitor, identical across server.ts (Express/SQLite)
// and the Vercel serverless functions. Do not silently drop fields between
// frontend -> API -> database -> admin.

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

// Database row (snake_case columns). Postgres bigint ids are normalized to number.
export interface VisitorRow {
  id: number;
  nickname: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string | null;
  address: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
}

export function rowToVisitor(r: VisitorRow): Visitor {
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