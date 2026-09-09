import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { CartProvider } from '@/components/CartProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { site, distributor } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — water softeners & filtration systems`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: `${site.name} — water softeners & filtration systems`,
    description: site.description,
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  other: {
    'catalog-source': distributor.site,
  },
};

export const viewport: Viewport = {
  themeColor: '#0d6b8a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-screen flex-col">
        <CartProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-card"
          >
            Skip to content
          </a>
          {/* SearchBar reads useSearchParams, so the header needs a boundary. */}
          <Suspense fallback={<div className="h-16 border-b border-ink/10 bg-white" />}>
            <Header />
          </Suspense>
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
