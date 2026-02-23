import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
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
  serverExternalPackages: ['@whiskeysockets/baileys', 'pino', 'jimp', 'sharp'],
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
