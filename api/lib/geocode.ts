// Reverse geocoding proxy helper (Nominatim OSM) shared by the Vercel functions.
// Never blocks visitor persistence: callers save coordinates first, then enrich.

export interface GeoResult {
  displayName: string;
  area: string;
  city: string;
  state: string;
  country: string;
}

const REQUEST_TIMEOUT_MS = 3500;

export async function reverseGeocode(lat: number, lon: number): Promise<GeoResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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

    if (!response.ok) return null;
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
    return null;
  }
}