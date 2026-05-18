import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function getR2RemotePatterns(): NonNullable<
  NextConfig["images"]
>["remotePatterns"] {
  // Always allow Cloudflare R2 public-dev hostnames (`pub-<hash>.r2.dev`).
  // R2 buckets are tenant-isolated by hash, so wildcarding *.r2.dev is safe
  // and avoids needing R2_PUBLIC_URL set in every environment.
  const fallback: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    {
      protocol: "https",
      hostname: "*.r2.dev",
      pathname: "/**",
    },
  ];

  const raw = process.env.R2_PUBLIC_URL;
  if (!raw?.trim()) return fallback;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return fallback;
    return [
      {
        protocol: "https",
        hostname: u.hostname,
        pathname: "/**",
      },
      ...fallback,
    ];
  } catch {
    return fallback;
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,

  images: {
    remotePatterns: getR2RemotePatterns(),
  },

  async headers() {
    return [
      {
        source: "/f/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Locale-aware redirects for dashboard marketplace → partners
      {
        source: "/:locale/dashboard/marketplace",
        destination: "/:locale/dashboard/partners",
        permanent: true,
      },
      {
        source: "/:locale/dashboard/marketplace/:path*",
        destination: "/:locale/dashboard/partners/:path*",
        permanent: true,
      },
      {
        source: "/:locale/dashboard/events/:id/vendors",
        destination: "/:locale/dashboard/events/:id/partners",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
