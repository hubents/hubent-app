import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  images: {
    remotePatterns: [],
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
    ];
  },

};

export default nextConfig;
