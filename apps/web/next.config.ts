const config = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
} satisfies import("next").NextConfig;

export default config;
