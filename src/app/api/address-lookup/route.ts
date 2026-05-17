import { NextRequest, NextResponse } from "next/server";

interface NominatimResult {
  display_name: string;
  name?: string;
  type: string;
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

  if (q.length < 3) return NextResponse.json([]);

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "6",
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
      const city =
        a.city || a.town || a.village || a.municipality || a.county || "";

      return {
        displayName: item.display_name,
        street: street || venueName,
        venueName,
        city,
        state: a.state || "",
        postalCode: a.postcode || "",
        countryCode: (a.country_code ?? "").toUpperCase(),
        countryName: a.country || "",
        type: item.type,
      };
    });

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
