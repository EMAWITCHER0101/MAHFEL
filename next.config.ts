import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: http: https: *",
      "media-src 'self' http: https: data: blob: dl.soha-sima.ir",
      "connect-src 'self' http://localhost:5000 https://soha-sima.ir http://soha-sima.ir https://openrouter.ai https://api.openrouter.ai",
      "frame-src 'self' https://www.aparat.com https://aparat.com https://player.aparat.com",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  turbopack: {},
  devIndicators: {
    position: 'top-left',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'soha-sima.ir' },
      { protocol: 'https', hostname: 'dl.soha-sima.ir' },
      { protocol: 'https', hostname: '*.soha-sima.ir' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'fonts.googleapis.com' },
      { protocol: 'https', hostname: 'fonts.gstatic.com' },
      { protocol: 'https', hostname: 'aparat.com' },
      { protocol: 'https', hostname: 'i.aparat.com' },
      { protocol: 'https', hostname: '**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/fonts/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/logo.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/font-awesome/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: process.env.NODE_ENV === 'production' ? 'public, max-age=31536000, immutable' : 'no-store' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5000/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
