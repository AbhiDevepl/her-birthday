import { query, VisitorRecord } from './_lib/db.js';

interface ReverseGeocodeResult {
  displayName: string;
  area: string;
  city: string;
  state: string;
  country: string;
}

async function resolveReverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&addressdetails=1`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BirthdayScrapbookApp/1.0 (contact: admin@example.com)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

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

    return { displayName, area, city, state, country };
  } catch {
    return null; // Graceful failure: reverse geocoding error must not block visitor creation
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req: any, res: any) {
  // CORS support
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

    const rawName = typeof body.nickname === 'string' ? body.nickname : '';
    const name = rawName.trim().replace(/[\p{Cc}<>]/gu, '');

    const lat = Number(body.latitude);
    const lon = Number(body.longitude);
    const accuracy =
      body.accuracy != null && Number.isFinite(Number(body.accuracy))
        ? Math.round(Number(body.accuracy))
        : null;
    const clientTimestamp = typeof body.timestamp === 'string' ? body.timestamp : null;

    if (!name || name.length > 60) {
      res.status(400).json({ error: 'Nickname is required and must be 1 to 60 characters.' });
      return;
    }

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      res.status(400).json({ error: 'Valid latitude between -90 and 90 is required.' });
      return;
    }

    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'Valid longitude between -180 and 180 is required.' });
      return;
    }

    // Deduplication check: check if identical record was submitted in last 5 seconds
    try {
      const duplicateQuery = `
        SELECT id FROM visitors
        WHERE nickname = $1
          AND ABS(latitude - $2) < 0.0001
          AND ABS(longitude - $3) < 0.0001
          AND created_at >= NOW() - INTERVAL '5 seconds'
        LIMIT 1;
      `;
      const duplicateRes = await query<{ id: number | string }>(duplicateQuery, [name, lat, lon]);
      if (duplicateRes.rows.length > 0) {
        res.status(200).json({ ok: true, deduplicated: true, id: duplicateRes.rows[0].id });
        return;
      }
    } catch {
      // Continue if deduplication check fails
    }

    const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
    const createdAt = new Date().toISOString();

    // Reverse geocode asynchronously server-side (fails gracefully)
    const geo = await resolveReverseGeocode(lat, lon);

    const insertSql = `
      INSERT INTO visitors (
        nickname, latitude, longitude, accuracy, timestamp,
        address, area, city, state, country,
        user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, nickname, latitude, longitude, accuracy, timestamp, address, area, city, state, country, user_agent, created_at;
    `;

    const insertParams = [
      name,
      lat,
      lon,
      accuracy,
      clientTimestamp,
      geo?.displayName || null,
      geo?.area || null,
      geo?.city || null,
      geo?.state || null,
      geo?.country || null,
      userAgent,
      createdAt,
    ];

    const result = await query<VisitorRecord>(insertSql, insertParams);
    const createdVisitor = result.rows[0];

    res.status(201).json({
      ok: true,
      id: createdVisitor?.id,
      visitor: createdVisitor,
    });
  } catch (err: any) {
    console.error('[API /api/visitors] Error recording visitor:', err);
    res.status(500).json({ error: 'Failed to record visitor.' });
  }
}
