import { Podcast, Video, Post, PublishedBook, Author } from '../types';

const OPENROUTER_API_KEY = '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';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function chat(messages: Array<{ role: string; content: string }>, model = 'google/gemini-2.5-flash'): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://mahfel.app',
      'X-Title': 'MAHFEL AI'
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096 })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `خطای سرور: ${res.status}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'AI Error');
  return data.choices?.[0]?.message?.content || 'پاسخی دریافت نشد.';
}

function buildFullCatalog(data: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[]; authors: Author[] }): string {
  const lines: string[] = [];

  lines.push('=== پادکست‌ها (با جزئیات کامل) ===');
  data.podcasts.forEach((p, i) => {
    lines.push(`\n🎙️ پادکست ${i + 1}: "${p.title}"`);
    lines.push(`   ID: ${p.id || (p as any)._id}`);
    lines.push(`   توضیحات: ${p.description || 'ندارد'}`);
    lines.push(`   تعداد جلسات: ${p.episodes.length}`);
    lines.push(`   جلسات:`);
    p.episodes.forEach((ep, j) => {
      lines.push(`     جلسه ${j + 1}: "${ep.title}"`);
      lines.push(`       توضیحات: ${ep.description || 'ندارد'}`);
      lines.push(`       مدت: ${ep.duration || 'نامشخص'}`);
    });
  });

  lines.push('\n=== ویدیوها (با جزئیات کامل) ===');
  data.videos.forEach((v, i) => {
    lines.push(`\n📹 ویدیو ${i + 1}: "${v.title}"`);
    lines.push(`   ID: ${v.id || (v as any)._id}`);
    lines.push(`   توضیحات: ${v.description || 'ندارد'}`);
    lines.push(`   مدت: ${v.duration || 'نامشخص'}`);
  });

  lines.push('\n=== کتاب‌ها (با جزئیات کامل) ===');
  data.books.forEach((b, i) => {
    lines.push(`\n📚 کتاب ${i + 1}: "${b.title}"`);
    lines.push(`   ID: ${b.id || (b as any)._id}`);
    lines.push(`   نویسنده: ${b.author || 'ناشناس'}`);
    lines.push(`   توضیحات: ${b.description || 'ندارد'}`);
  });

  lines.push('\n=== نویسندگان ===');
  data.authors.forEach((a, i) => {
    lines.push(`${i + 1}. ${a.name} - ${a.bio || 'بدون بیوگرافی'}`);
  });

  lines.push('\n=== پست‌ها ===');
  data.posts.forEach((p, i) => {
    lines.push(`${i + 1}. "${p.title || 'بدون عنوان'}" - ${p.content?.slice(0, 200) || ''}`);
  });

  return lines.join('\n');
}

function getSystemPrompt(data: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[]; authors: Author[] }): string {
  const catalog = buildFullCatalog(data);

  const podcastIds = data.podcasts.map(p => `${p.id || (p as any)._id}: ${p.title}`).join(', ');
  const videoIds = data.videos.map(v => `${v.id || (v as any)._id}: ${v.title}`).join(', ');
  const bookIds = data.books.map(b => `${b.id || (b as any)._id}: ${b.title}`).join(', ');

  const episodeLines: string[] = [];
  data.podcasts.forEach(p => {
    p.episodes.forEach((ep, j) => {
      episodeLines.push(`${p.title} -> جلسه ${j + 1}: "${ep.title}" - ${ep.description || ''} [مدت: ${ep.duration || 'نامشخص'}]`);
    });
  });

  return `تو "محفل AI" هستی، دستیار هوشمند پلتفرم "محفل" (سرای هنر و اندیشه). یک پلتفرم پادکست، ویدیو و کتاب فارسی.

تو یک دستیار هوشمند همه‌فن‌حریف هستی. دو نوع کار انجام میدی:

۱. پاسخ به سوالات عمومی (هر موضوعی):
- سوالات علمی، فرهنگی، تاریخی، فلسفی، دینی، فنی و ...
- تحلیل عمیق سوال با جزئیات کامل
- توضیح روان و قابل فهم با مثال
- پیشنهاد سوالات مرتبط و جالب برای ادامه گفتگو

۲. کمک با محتوای محفل:
- جستجو، معرفی، خلاصه و تحلیل پادکست‌ها، ویدیوها و کتاب‌ها

قوانین پاسخ‌دهی:
- اگه سوال درباره محتوای محفله → از داده‌های زیر تحلیل کن
- اگه سوال عمومیه → با دانش خودت پاسخ بده، دقیق و کامل
- همیشه تحلیل کن: چرا؟ چطور؟ چه تاثیری؟
- پاسخ رو با ساختار مرتب بده (تیتر، لیست، پاراگراف)
- در انتهای هر پاسخ، ۲-۳ سوال پیشنهادی مرتبط بده
- به فارسی روان، تحلیلی و مودب پاسخ بده
- از ایموجی مناسب استفاده کن

⚡ کدهای دکمه (فقط وقتی محتوای محفل پیدا کردی):

وقتی پادکست کامل پیدا کردی: [PODCAST:ID]
وقتی جلسه خاصی از پادکست: [EPISODE:PODCAST_ID:SHOMARE_JALSE]
وقتی ویدیو پیدا کردی: [VIDEO:ID]
وقتی کتاب پیدا کردی: [BOOK:ID]

ID پادکست‌ها: ${podcastIds}
ID ویدیوها: ${videoIds}
ID کتاب‌ها: ${bookIds}

جلسات:
${episodeLines.join('\n')}

محتوای موجود در محفل:
${catalog}`;
}

export async function aiAssistant(message: string, data: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[]; authors: Author[] }): Promise<string> {
  return chat([
    { role: 'system', content: getSystemPrompt(data) },
    { role: 'user', content: message }
  ]);
}

export async function summarizePodcast(podcast: Podcast, episodeIndex?: number): Promise<string> {
  const episode = episodeIndex != null ? podcast.episodes[episodeIndex] : null;
  const context = episode
    ? `پادکست: ${podcast.title}\nجلسه: ${episode.title}\nتوضیحات: ${episode.description || 'ندارد'}\nمدت: ${episode.duration || 'نامشخص'}`
    : `پادکست: ${podcast.title}\nتعداد جلسات: ${podcast.episodes.length}\nجلسات:\n${podcast.episodes.map((e, i) => `${i + 1}. ${e.title} - ${e.description || ''}`).join('\n')}`;

  return chat([
    { role: 'system', content: 'تو دستیار هوشمند محفل هستی. خلاصه محتوا رو به فارسی روان و مختصر بنویس.' },
    { role: 'user', content: `لطفاً این پادکست رو خلاصه کن:\n\n${context}` }
  ]);
}

export async function summarizeVideo(video: Video): Promise<string> {
  const context = `ویدیو: ${video.title}\nتوضیحات: ${video.description || 'ندارد'}\nمدت: ${video.duration || 'نامشخص'}`;
  return chat([
    { role: 'system', content: 'تو دستیار هوشمند محفل هستی. خلاصه محتوا رو به فارسی روان و مختصر بنویس.' },
    { role: 'user', content: `لطفاً این ویدیو رو خلاصه کن:\n\n${context}` }
  ]);
}

export async function summarizeBook(book: PublishedBook): Promise<string> {
  const context = `کتاب: ${book.title}\nنویسنده: ${book.author || 'ناشناس'}\nتوضیحات: ${book.description || 'ندارد'}`;
  return chat([
    { role: 'system', content: 'تو دستیار هوشمند محفل هستی. خلاصه محتوا رو به فارسی روان و مختصر بنویس.' },
    { role: 'user', content: `لطفاً این کتاب رو خلاصه کن:\n\n${context}` }
  ]);
}

export async function smartSearch(query: string, data: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[] }): Promise<string> {
  const catalog = buildFullCatalog({ ...data, authors: [] });
  return chat([
    { role: 'system', content: 'تو دستیار هوشمند محفل هستی. بر اساس کاتالوگ محتوا، نتایج مرتبط رو به فارسی نشون بده. هر نتیجه رو با جزئیات کامل معرفی کن.' },
    { role: 'user', content: `جستجو: ${query}\n\nکاتالوگ موجود:\n${catalog}` }
  ]);
}

export async function generateTags(content: string): Promise<string> {
  return chat([
    { role: 'system', content: 'تو تگ‌های مناسب برای محتوا پیشنهاد میدی. ۵ تا تگ کوتاه و مرتبط به فارسی برگردون.' },
    { role: 'user', content: `برای این محتوا تگ پیشنهاد بده:\n${content}` }
  ]);
}

export async function smartReply(comment: string, context: string): Promise<string> {
  return chat([
    { role: 'system', content: 'تو دستیار هوشمند محفل هستی. یک پاسخ مناسب، مودبانه و مرتبط به فارسی بنویس.' },
    { role: 'user', content: `نظر: ${comment}\nموضوع: ${context}` }
  ]);
}
