import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow all local dev origins
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "192.168.178.136:3000"]
    }
  }
};

export default nextConfig;
