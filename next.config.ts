import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.webflow.io https://neueworld.com https://*.neueworld.com https://*.ondigitalocean.app",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
