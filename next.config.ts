import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large file uploads (videos up to 100MB, photos up to 8MB)
  // Server Actions body size limit
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
