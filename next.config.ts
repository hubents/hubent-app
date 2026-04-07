import type { NextConfig } from "next";

function getR2RemotePatterns(): NonNullable<
  NextConfig["images"]
>["remotePatterns"] {
  const raw = process.env.R2_PUBLIC_URL;
  if (!raw?.trim()) return [];
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return [];
    return [
      {
        protocol: "https",
        hostname: u.hostname,
        pathname: "/**",
      },
    ];
  } catch {
    return [];
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
