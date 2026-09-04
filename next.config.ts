import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd()
  },
  // Origins allowed to invoke Server Actions (local dev + production host)
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "192.168.178.136:3000", "dark.2pohl.de"]
    }
  },
  devIndicators: false
};

export default nextConfig;
