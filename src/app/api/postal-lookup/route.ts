import { NextRequest, NextResponse } from "next/server";

// Patterns for postal formats that unambiguously identify a country
function detectCountryCode(postal: string): string | null {
  const p = postal.trim().toUpperCase();
  if (/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(p)) return "GB";         // UK: SW1A 1AA
  if (/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/.test(p)) return "CA";                   // Canada: A1A 1A1
  if (/^\d{4}-\d{3}$/.test(p)) return "PT";                                 // Portugal: 1234-567
  if (/^\d{5}-\d{3}$/.test(p)) return "BR";                                 // Brazil: 12345-678
  if (/^\d{4}\s?[A-Z]{2}$/.test(p)) return "NL";                            // Netherlands: 1234 AB
  if (/^[A-Z]\d{4}[A-Z]{3}$/.test(p)) return "AR";                          // Argentina: A4400WWW
  if (/^\d{6}$/.test(p)) return "CO";                                        // Colombia: 6 digits
  if (/^\d{7}$/.test(p)) return "CL";                                        // Chile: 7 digits
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const postalCode = searchParams.get("postalCode")?.trim();
  const countryCode = searchParams.get("countryCode")?.trim();

  if (!postalCode) {
    return NextResponse.json({ error: "postalCode required" }, { status: 400 });
  }

  const resolvedCountry = countryCode || detectCountryCode(postalCode);

  try {
    const params = new URLSearchParams({
      postalcode: postalCode,
      format: "json",
      limit: "1",
      addressdetails: "1",
      "accept-language": "es",
    });
    if (resolvedCountry) params.set("countrycodes", resolvedCountry.toLowerCase());

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        "User-Agent": "Hubents/1.0 (contact@hubents.com)",
        "Accept": "application/json",
      },
      // 4 second timeout via AbortSignal
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
    }

    const data = await res.json();
    if (!data[0]?.address) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const addr = data[0].address;
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
    const detectedCode = (addr.country_code || resolvedCountry || "").toUpperCase();

    return NextResponse.json({
      city,
      state: addr.state || addr.region || "",
      countryCode: detectedCode,
      countryName: addr.country || "",
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
