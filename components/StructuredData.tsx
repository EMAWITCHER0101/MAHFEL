'use client';

const BRAND_NAMES = ['سُها', 'سرای هنر و اندیشه', 'Soha Art & Thought', 'محفل', 'سها سیما', 'سیما فیلم'];
const BOOK_NAMES = [
  'ما و جهان تکنیک',
  'راز مادری',
  'بخت نوجوان',
  'ما و راه کربلایی شهید رئیسی',
  'دانش‌بنیان',
  'دو مقاله',
];

export default function StructuredData() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'سرای هنر و اندیشه',
    alternateName: ['سُها', 'سها', 'Soha Art & Thought', 'محفل', 'سها سیما', 'سیما فیلم'],
    url: 'https://soha-sima.ir',
    description: 'پلتفرم پادکست، کتاب و ویدیو - محفل، سها سیما و سیما فیلم',
    inLanguage: 'fa-IR',
    publisher: {
      '@type': 'Organization',
      name: 'سرای هنر و اندیشه',
      url: 'https://soha-sima.ir',
      logo: 'https://soha-sima.ir/logo.png',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://soha-sima.ir/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'سرای هنر و اندیشه',
    alternateName: BRAND_NAMES,
    url: 'https://soha-sima.ir',
    logo: 'https://soha-sima.ir/logo.png',
    image: 'https://soha-sima.ir/logo.png',
    foundingDate: '2024',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IR',
    },
    sameAs: [],
  };

  const podcastJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'پادکست‌های سرای هنر و اندیشه',
    alternateName: ['پادکست سُها', 'پادکست سها'],
    description:
      'مجموعه درس‌گفتارها و گفتگوهای سرای هنر و اندیشه؛ ضیافت، فتح خون، تفکر قرآنی، روایت بعثت، انقلاب اسلامی انتظار وارستگی، اربعین و حاج قاسم سلیمانی',
    url: 'https://soha-sima.ir',
    inLanguage: 'fa-IR',
    isPartOf: {
      '@type': 'WebSite',
      name: 'سرای هنر و اندیشه',
      url: 'https://soha-sima.ir',
    },
  };

  const bookJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'کتاب‌های سرای هنر و اندیشه',
    alternateName: 'کتاب‌های سُها',
    description: 'کتاب‌های صوتی و متنی سرای هنر و اندیشه',
    url: 'https://soha-sima.ir',
    inLanguage: 'fa-IR',
    mainEntity: BOOK_NAMES.map((title, i) => ({
      '@type': 'Book',
      name: title,
      inLanguage: 'fa-IR',
      url: 'https://soha-sima.ir',
      position: i + 1,
    })),
  };

  const videoJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'سها سیما - ویدیوهای سرای هنر و اندیشه',
    alternateName: ['سها سیما', 'سیما فیلم', 'ویدیو سُها'],
    description:
      'فیلم‌های مستند و سخنرانی‌های سرای هنر و اندیشه؛ ضیافت، فتح خون، روایت بعثت، سرانگشت فاطمی، سالک روح‌الله، کاما و مجموعه‌های اربعین و حاج قاسم سلیمانی',
    url: 'https://soha-sima.ir',
    inLanguage: 'fa-IR',
    isPartOf: {
      '@type': 'WebSite',
      name: 'سرای هنر و اندیشه',
      url: 'https://soha-sima.ir',
    },
  };

  return (
    <>
      {[jsonLd, organizationJsonLd, podcastJsonLd, bookJsonLd, videoJsonLd].map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
    </>
  );
}