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

// فونت نستعلیق — فقط برای متن‌های برند «سرای هنر و اندیشه»
const iranNastaliq = localFont({
  src: [
    { path: '../fonts/DimaShekasteh.woff2' },
  ],
  variable: '--font-nastaliq',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'محفل',
    template: '%s | محفل',
  },
  description:
    'سُها (سرای هنر و اندیشه) - پلتفرم پادکست، کتاب و ویدیو. محفل گفتگو، سها سیما و سیما فیلم؛ درس‌گفتارهای استاد اصغر طاهرزاده، مجموعه‌های ضیافت، فتح خون، تفکر قرآنی، روایت بعثت، انقلاب اسلامی انتظار وارستگی، اربعین و حاج قاسم سلیمانی، کتاب‌های ما و جهان تکنیک، راز مادری، بخت نوجوان، ما و راه کربلایی و دانش‌بنیان.',
  keywords: [
    'سرای هنر و اندیشه',
    'سُها',
    'سها',
    'محفل',
    'سها سیما',
    'سیما فیلم',
    'پادکست',
    'کتاب',
    'ویدیو',
    'استاد اصغر طاهرزاده',
    'ضیافت',
    'فتح خون',
    'تفکر قرآنی',
    'روایت بعثت',
    'انقلاب اسلامی انتظار وارستگی',
    'اربعین',
    'حاج قاسم سلیمانی',
    'عقل تکنیک',
    'روایت اقتصاد',
    'حیات متفکرانه زن',
    'کاما',
    'ملک سلیمانی',
    'سرانگشت فاطمی',
    'سالک روح‌الله',
    'پلاک 8',
    'منزل نهایی',
    'محرم راز',
    'ما و جهان تکنیک',
    'راز مادری',
    'بخت نوجوان',
    'ما و راه کربلایی',
    'دانش‌بنیان',
    'دو مقاله',
    'درس‌گفتار',
    'گفتگو',
    'معرفت',
    'فلسفه',
    'آموزش',
    'سخنرانی',
  ],
  authors: [{ name: 'سرای هنر و اندیشه' }, { name: 'EMAD CH' }],
  creator: 'سرای هنر و اندیشه',
  publisher: 'سرای هنر و اندیشه',
  category: 'فرهنگی و هنری',
  alternates: {
    canonical: 'https://soha-sima.ir',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'محفل',
    description:
      'محفل گفتگو، سها سیما و سیما فیلم؛ پادکست، کتاب و ویدیو از سرای هنر و اندیشه',
    type: 'website',
    locale: 'fa_IR',
    siteName: 'محفل',
    url: 'https://soha-sima.ir',
    images: [
      {
        url: 'https://soha-sima.ir/logo.png',
        width: 512,
        height: 512,
        alt: 'محفل',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'محفل',
    description: 'محفل، سها سیما و سیما فیلم؛ پادکست، کتاب و ویدیو',
    images: ['https://soha-sima.ir/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'محفل',
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  other: {
    'geo.region': 'IR',
    'geo.placename': 'Iran',
    'og:country-name': 'Iran',
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
      </head>
      <body suppressHydrationWarning>
        <StructuredData />
        <ExternalScripts />
        {children}
      </body>
    </html>
  );
}
