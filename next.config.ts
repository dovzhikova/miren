import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "zoskinhealth.com" },
      { protocol: "https", hostname: "**.zoskinhealth.com" },
      { protocol: "https", hostname: "biologique-recherche.com" },
      { protocol: "https", hostname: "**.biologique-recherche.com" },
      { protocol: "https", hostname: "circadia.com" },
      { protocol: "https", hostname: "**.circadia.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
  // The dev server binds to 0.0.0.0. Browsers open it as 127.0.0.1, and Next
  // treats that host as cross-origin unless it is listed here. Without this,
  // HMR and client navigations are blocked and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
