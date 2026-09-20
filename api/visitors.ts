import type { IncomingMessage } from 'node:http';
import {
  findRecentDuplicate,
  getVisitorById,
  insertVisitor,
  enrichAddress,
  listVisitors,
} from './lib/db';
import { reverseGeocode } from './lib/geocode';

function getClientIp(req: IncomingMessage): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded.length) return String(forwarded[0]).split(',')[0].trim();
  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'POST') {
    try {
      let body: any = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }
      body = body || {};

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
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Nickname is required (max 60 characters).' }));
        return;
      }
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid latitude.' }));
        return;
      }
      if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid longitude.' }));
        return;
      }

      // Deduplicate identical submissions within a 5 second window.
      try {
        const existingId = await findRecentDuplicate(name, lat, lon);
        if (existingId != null) {
          const existing = await getVisitorById(existingId);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: true,
              deduplicated: true,
              visitor: existing ? existing : { id: existingId },
            })
          );
          return;
        }
      } catch {
        // Continue if deduplication check fails.
      }

      // Persist coordinates immediately; reverse geocoding must not block saving.
      const saved = await insertVisitor({
        nickname: name,
        latitude: lat,
        longitude: lon,
        accuracy,
        timestamp: clientTimestamp,
        user_agent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
        ip_address: getClientIp(req),
      });

      // Enrich the stored row with address data if geocoding succeeds.
      const geo = await reverseGeocode(lat, lon);
      let visitorToReturn = saved;
      if (geo) {
        await enrichAddress(saved.id, geo).catch(() => {});
        const refreshed = await getVisitorById(saved.id);
        if (refreshed) visitorToReturn = refreshed;
      }

      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, visitor: visitorToReturn }));
      return;
    } catch (err: any) {
      console.error('[visitors] POST failed:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err?.message || 'Server error' }));
      return;
    }
  }

  if (req.method === 'GET') {
    try {
      const visitors = await listVisitors();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ visitors }));
      return;
    } catch (err: any) {
      console.error('[visitors] GET failed:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to load visitors' }));
      return;
    }
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}