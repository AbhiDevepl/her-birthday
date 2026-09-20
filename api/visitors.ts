import type { IncomingMessage, ServerResponse } from 'node:http';

interface Visitor {
  id: number;
  nickname: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
  address?: string;
  createdAt: string;
}

// In-memory list for serverless instance lifetime
const visitors: Visitor[] = [];

export default async function handler(req: any, res: any) {
  // CORS support
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
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

      const name =
        typeof body.nickname === 'string'
          ? body.nickname.trim().replace(/[\p{Cc}<>]/gu, '')
          : '';
      const lat = Number(body.latitude);
      const lon = Number(body.longitude);
      const accuracy = Number.isFinite(Number(body.accuracy)) ? Math.round(Number(body.accuracy)) : undefined;
      const clientTimestamp = typeof body.timestamp === 'string' ? body.timestamp : undefined;

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

      const record: Visitor = {
        id: Date.now(),
        nickname: name,
        latitude: lat,
        longitude: lon,
        accuracy,
        timestamp: clientTimestamp,
        createdAt: new Date().toISOString(),
      };

      visitors.push(record);

      res.status(201).json({ ok: true });
      return;
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Server error' });
      return;
    }
  }

  if (req.method === 'GET') {
    res.status(200).json({ visitors });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
