import { NextRequest, NextResponse } from "next/server";

// Maps our country codes to OpenCorporates jurisdiction codes
const JURISDICTION_MAP: Record<string, string> = {
  ES: "es", MX: "mx", AR: "ar", BR: "br", CO: "co", CL: "cl",
  PE: "pe", VE: "ve", EC: "ec", BO: "bo", PY: "py", UY: "uy",
  CR: "cr", PA: "pa", GT: "gt", HN: "hn", SV: "sv", NI: "ni",
  DO: "do", PR: "us_pr",
  US: "us_de", CA: "ca_on", GB: "gb", FR: "fr", DE: "de",
  IT: "it", PT: "pt", NL: "nl", CH: "ch",
};

interface OcCompany {
  name: string;
  company_number: string;
  jurisdiction_code: string;
  registered_address_in_full?: string;
  registered_address?: {
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const countryCode = searchParams.get("countryCode")?.toUpperCase() ?? "ES";

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const jurisdiction = JURISDICTION_MAP[countryCode] ?? "es";

  try {
    const params = new URLSearchParams({
      q,
      jurisdiction_code: jurisdiction,
      per_page: "8",
      order: "score",
    });

    const res = await fetch(
      `https://api.opencorporates.com/v0.4/companies/search?${params}`,
      {
        headers: { "Accept": "application/json", "User-Agent": "Hubents/1.0" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) return NextResponse.json({ results: [] });

    const data = await res.json();
    const companies: OcCompany[] = (data?.results?.companies ?? []).map(
      (item: { company: OcCompany }) => item.company
    );

    const results = companies.map((c) => ({
      name: c.name,
      taxId: c.company_number ?? "",
      address: c.registered_address?.street_address ?? "",
      city: c.registered_address?.locality ?? "",
      state: c.registered_address?.region ?? "",
      postalCode: c.registered_address?.postal_code ?? "",
      country: c.registered_address?.country ?? "",
      jurisdictionCode: c.jurisdiction_code,
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
