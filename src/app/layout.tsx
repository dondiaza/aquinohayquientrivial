import type { Metadata, Viewport } from 'next';
import { Anton, Caveat, Courier_Prime, Inter } from 'next/font/google';

import { Recolector } from '@/components/analitica/Recolector';
import { OfflineNotice } from '@/components/layout/OfflineNotice';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BRAND } from '@/domain/copy/ui';
import { AudioProvider } from '@/lib/audio/AudioProvider';

import './globals.css';

/*
  Tipografías: todas de licencia abierta (OFL/Apache) y auto-alojadas por next/font, así
  que no hay peticiones a terceros en runtime. Ver docs/DESIGN-SYSTEM.md §2.
*/
const cartel = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--fuente-cartel',
  display: 'swap',
});

const cuerpo = Inter({
  subsets: ['latin'],
  variable: '--fuente-cuerpo',
  display: 'swap',
});

const sello = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--fuente-sello',
  display: 'swap',
});

const mano = Caveat({
  subsets: ['latin'],
  variable: '--fuente-mano',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.short}`,
  },
  description: BRAND.tagline,
  applicationName: BRAND.name,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: BRAND.short,
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#1e4b3e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${cartel.variable} ${cuerpo.variable} ${sello.variable} ${mano.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <AudioProvider>
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:border-2 focus:border-tinta focus:bg-mostaza focus:px-3 focus:py-2"
          >
            Saltar al contenido
          </a>
          <OfflineNotice />
          <Recolector />
          <SiteHeader />
          <main id="contenido" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </AudioProvider>
      </body>
    </html>
  );
}
