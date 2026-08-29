import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      ws: "./lib/stubs/empty.ts",
    },
  },
};

export default nextConfig;
