/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    typedRoutes: true,
    serverActions: {
      bodySizeLimit: "5mb",
    },
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    const longCacheHeaders = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];

    return [
      {
        source: "/_next/static/:path*",
        headers: longCacheHeaders,
      },
      {
        source: "/assets/:path*",
        headers: longCacheHeaders,
      },
      {
        source: "/logo.svg",
        headers: longCacheHeaders,
      },
      {
        source: "/favicon.ico",
        headers: longCacheHeaders,
      },
    ];
  },
};

export default config;
