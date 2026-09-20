import { verifyAdminSession } from '../_lib/auth.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

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
    res.status(401).json({ authenticated: false, error: 'Unauthorized' });
    return;
  }

  res.status(200).json({
    authenticated: true,
    user: session.user,
  });
}
