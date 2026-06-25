import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  /** Browser map uses NEXT_PUBLIC_* — fall back to GOOGLE_MAPS_API_KEY on Vercel. */
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
      process.env.GOOGLE_MAPS_API_KEY?.trim() ||
      process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
      "",
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@supabase/supabase-js",
      "@supabase/ssr",
      "firebase/app",
      "firebase/storage",
    ],
  },
  async redirects() {
    return [
      {
        source: "/city-run",
        destination: "/cityrun",
        permanent: true,
      },
      {
        source: "/city-run/:path*",
        destination: "/cityrun/:path*",
        permanent: true,
      },
      {
        source: "/api/city-run/:path*",
        destination: "/api/cityrun/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
