interface GeoResult {
  lat: number;
  lon: number;
}

/**
 * Geocodifica una ciudad + país usando Nominatim (OpenStreetMap).
 * Devuelve null si no encuentra resultado.
 */
export async function geocodeCity(
  city: string,
  country: string
): Promise<GeoResult | null> {
  const q = [city, country].filter(Boolean).join(", ");
  if (!q) return null;

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "1",
    "accept-language": "es",
  });
  if (country) params.set("countrycodes", country.toLowerCase());

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: { "User-Agent": "Hubents/1.0 (hola@hubents.com)" },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}
