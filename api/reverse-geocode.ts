export default async function handler(req: any, res: any) {
  // CORS support
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  const queryParams = req.query || {};
  const lat = Number(queryParams.latitude ?? queryParams.lat);
  const lon = Number(queryParams.longitude ?? queryParams.lon);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    res.status(400).json({ error: 'Valid latitude (-90..90) and longitude (-180..180) required' });
    return;
  }

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
      res.json({ ok: false, error: 'Reverse geocode service returned non-200 status' });
      return;
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

    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.json({ ok: true, data: { displayName, area, city, state, country } });
  } catch (err: any) {
    res.json({ ok: false, error: err?.message || 'Failed to fetch reverse geocode' });
  } finally {
    clearTimeout(timeoutId);
  }
}
