import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

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
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
// Orchids restart: 1771157295160
// Restart: Thu Jan 29 18:52:42 UTC 2026
// Restart: Thu Jan 29 18:53:28 UTC 2026
// Sync: 1769712825
// Force restart Thu Jan 29 18:56:49 UTC 2026
// Force restart 1769713047
// Cache break 1769713068
