import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // allowedDevOrigins: ['betsey-bidentate-munificently.ngrok-free.dev'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
