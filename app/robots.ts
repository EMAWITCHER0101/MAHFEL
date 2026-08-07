import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/uploads/', '/_next/'],
      },
    ],
    sitemap: 'https://soha-sima.ir/sitemap.xml',
  };
}
