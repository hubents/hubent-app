import type { NextConfig } from "next";

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
  /* config options here */
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
      {
        source: "/dashboard/marketplace",
        destination: "/dashboard/partners",
        permanent: true,
      },
      {
        source: "/dashboard/marketplace/:path*",
        destination: "/dashboard/partners/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/events/:id/vendors",
        destination: "/dashboard/events/:id/partners",
        permanent: true,
      },
    ];
  },

};

export default nextConfig;
