import { verifyAdminSession } from '../_lib/auth.js';
import { query, VisitorRecord } from '../_lib/db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  const session = verifyAdminSession(req);
  if (!session.authenticated) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const sql = `
      SELECT
        id,
        nickname,
        latitude,
        longitude,
        accuracy,
        timestamp,
        address,
        area,
        city,
        state,
        country,
        user_agent,
        created_at as "createdAt"
      FROM visitors
      ORDER BY created_at DESC, id DESC;
    `;

    const result = await query<VisitorRecord & { createdAt: string }>(sql);

    // Return the actual visitors list formatted cleanly
    const formatted = result.rows.map((row) => ({
      id: Number(row.id) || row.id,
      nickname: row.nickname,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      accuracy: row.accuracy != null ? Number(row.accuracy) : null,
      timestamp: row.timestamp || null,
      address: row.address || null,
      area: row.area || null,
      city: row.city || null,
      state: row.state || null,
      country: row.country || null,
      user_agent: row.user_agent || null,
      createdAt: row.createdAt || row.created_at,
    }));

    res.status(200).json({ visitors: formatted });
  } catch (err: any) {
    console.error('[API /api/admin/visitors] Database query error:', err);
    res.status(500).json({ error: 'Failed to retrieve visitors.' });
  }
}
