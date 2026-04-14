import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // CSP frame-ancestors replaces X-Frame-Options (more flexible, supports domain whitelisting)
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://kembarasufi.com https://*.kembarasufi.com http://kembarasufi.com http://*.kembarasufi.com https://*.orchids.cloud",
          },
          // Allow camera, microphone, geolocation inside iframe
          {
            key: "Permissions-Policy",
            value: "camera=*, microphone=*, geolocation=*",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  outputFileTracingRoot: path.resolve(__dirname),
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['@whiskeysockets/baileys', 'pino', 'jimp', 'sharp', 'jspdf', 'resend', 'jsonwebtoken', 'semver'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        jimp: false,
        sharp: false,
      };
    }
    return config;
  },
};

export default nextConfig;
// Orchids restart: 1771869774785
