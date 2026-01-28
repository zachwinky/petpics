import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Increase body size limit for image uploads (default is 4MB)
    // Allow up to 100MB for multiple training images
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
