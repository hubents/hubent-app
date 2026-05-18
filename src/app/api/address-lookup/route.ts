import { NextRequest, NextResponse } from "next/server";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type: string;
  class?: string;
  address: {
    road?: string;
    house_number?: string;
    amenity?: string;
    building?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const countrycode = req.nextUrl.searchParams.get("countrycode") ?? "";
  const mode = req.nextUrl.searchParams.get("mode") ?? "";

  if (q.length < 2) return NextResponse.json([]);

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "8",
    addressdetails: "1",
    "accept-language": "es",
  });
  if (countrycode) params.set("countrycodes", countrycode);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: { "User-Agent": "Hubents/1.0 (hola@hubents.com)" },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return NextResponse.json([]);

    const data: NominatimResult[] = await res.json();

    const results = data.map((item) => {
      const a = item.address;
      const street = [a.road, a.house_number].filter(Boolean).join(" ");
      const venueName = a.amenity || a.building || item.name || "";
      const city = a.city || a.town || a.village || a.municipality || a.county || "";

      return {
        displayName: item.display_name,
        street: street || venueName,
        venueName,
        city,
        region: a.state || "",
        state: a.state || "",
        postalCode: a.postcode || "",
        countryCode: (a.country_code ?? "").toUpperCase(),
        countryName: a.country || "",
        type: item.type,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      };
    });

    // mode=location: only return city/region level results (not street addresses)
    if (mode === "location") {
      const locationResults = results.filter((r) => r.city || r.region);
      // Deduplicate by city+countryCode
      const seen = new Set<string>();
      return NextResponse.json(
        locationResults.filter((r) => {
          const key = `${r.city}|${r.countryCode}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
      );
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
