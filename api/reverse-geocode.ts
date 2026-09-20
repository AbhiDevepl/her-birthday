export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const lat = Number(req.query?.latitude ?? req.query?.lat);
  const lon = Number(req.query?.longitude ?? req.query?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.status(400).json({ error: 'Valid latitude and longitude required' });
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'BirthdayScrapbookApp/1.0',
          'Accept-Language': 'en',
        },
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      res.json({ ok: false, error: 'Reverse geocode provider response not ok' });
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

    res.json({ ok: true, data: { displayName, area, city, state, country } });
  } catch (err: any) {
    res.json({ ok: false, error: err?.message || 'Failed to fetch reverse geocode' });
  }
}
