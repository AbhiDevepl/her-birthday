import { reverseGeocode } from './lib/geocode';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const lat = Number((req as any).query?.latitude ?? (req as any).query?.lat);
  const lon = Number((req as any).query?.longitude ?? (req as any).query?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Valid latitude and longitude required' }));
    return;
  }

  const geo = await reverseGeocode(lat, lon);
  res.setHeader('Content-Type', 'application/json');
  if (geo) {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, data: geo }));
  } else {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: false, error: 'Reverse geocode provider response not ok' }));
  }
}