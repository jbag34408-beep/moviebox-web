import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // proxy the Spring backend so the browser stays same-origin (no CORS needed)
  rewrites: async () => [
    { source: "/api/:path*", destination: "https://moviebox-v7ku.onrender.com/api/:path*" },
  ],
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
