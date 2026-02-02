import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OSYS 2026',
    short_name: 'OSYS',
    description: 'ONE-SYSTEM Kembara Sufi Travel & Tours Sdn Bhd',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/next.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
