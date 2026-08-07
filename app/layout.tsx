import './globals.css';
import localFont from 'next/font/local';
import ExternalScripts from '../components/ExternalScripts';
import StructuredData from '../components/StructuredData';
import type { Metadata, Viewport } from 'next';

const vazir = localFont({
  src: '../fonts/Vazirmatn-Regular.ttf',
  variable: '--font-vazir',
  display: 'swap',
  weight: '400',
});

const iranNastaliq = localFont({
  src: [
    { path: '../fonts/DimaShekasteh.woff2' },
  ],
  variable: '--font-nastaliq',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'MAHFEL - محفل',
    template: '%s | MAHFEL - محفل',
  },
  description: 'پلتفرم پادکست، کتاب و ویدیو - محفل',
  keywords: ['پادکست', 'کتاب', 'ویدیو', 'محفل', 'آموزش', 'فلسفه', 'عرفان'],
  authors: [{ name: 'EMAD CH' }],
  icons: {
    icon: '/favicon.svg',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'MAHFEL - محفل',
    description: 'پلتفرم پادکست، کتاب و ویدیو',
    type: 'website',
    locale: 'fa_IR',
    siteName: 'MAHFEL - محفل',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MAHFEL - محفل',
    description: 'پلتفرم پادکست، کتاب و ویدیو',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MAHFEL - محفل',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#06b6d4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${iranNastaliq.variable}`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/font-awesome/all.min.css" />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(regs) {
              regs.forEach(function(r) { r.unregister(); });
            });
            if ('caches' in window) {
              caches.keys().then(function(names) {
                names.forEach(function(n) { caches.delete(n); });
              });
            }
          }
        `}} />
      </head>
      <body suppressHydrationWarning>
        <StructuredData />
        <ExternalScripts />
        {children}
      </body>
    </html>
  );
}
