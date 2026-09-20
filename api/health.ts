import { query, isHostedPostgres } from './_lib/db.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      database: isHostedPostgres() ? 'postgres-hosted' : 'postgres-ready',
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err?.message || 'Database error',
    });
  }
}
