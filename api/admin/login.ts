const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'om1234';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
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

    const { username, password } = body;
    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      res.setHeader('Set-Cookie', 'admin_session=authenticated; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200');
      res.status(200).json({ ok: true });
      return;
    }

    res.status(401).json({ error: 'Invalid credentials' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Server error' });
  }
}
