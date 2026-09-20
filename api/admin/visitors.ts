import { isRequestAdmin } from '../lib/auth';
import { listVisitors } from '../lib/db';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!isRequestAdmin(req)) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  try {
    const visitors = await listVisitors();
    res.statusCode = 200;
    res.end(JSON.stringify({ visitors }));
  } catch (err: any) {
    console.error('[admin/visitors] failed:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to load visitors' }));
  }
}