import './globals.css';
import { ReactNode } from 'react';
import Script from 'next/script';
import { Providers } from '@/components/Providers';
import { Metadata, Viewport } from 'next';
import { SWRegistration } from '@/components/SWRegistration';

export const metadata: Metadata = {
  title: 'OSYS 2026',
  description: 'ONE-SYSTEM Kembara Sufi Travel & Tours Sdn Bhd',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OSYS 2026',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SWRegistration />
        <Script
          id="orchids-browser-logs"
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
          strategy="afterInteractive"
          data-orchids-project-id="b2c451c0-a884-462d-8ea5-cd5b7c2043ca"
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}