import { Podcast, Video, Post, PublishedBook, Author } from '../types';
import { getApiBase } from './api';

const AI_CHAT_URL = () => `${getApiBase()}/ai/chat`;

interface ChatMessage { role: string; content: string }

let lastSources: any[] = [];
export function getLastRagSources(): any[] { return lastSources; }

async function chatViaServer(messages: ChatMessage[], options?: { grounding?: boolean; model?: string; maxTokens?: number }): Promise<{ content: string; sources: any[]; grounded: boolean }> {
  const res = await fetch(AI_CHAT_URL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      grounding: options?.grounding ?? false,
      model: options?.model || 'google/gemini-2.0-flash-001',
      maxTokens: options?.maxTokens || 4096,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `خطای سرور: ${res.status}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'AI Error');
  lastSources = data.sources || [];
  const content = data.choices?.[0]?.message?.content || 'پاسخی دریافت نشد.';
  return { content, sources: lastSources, grounded: !!data.grounded };
}

function buildCompactCatalog(data: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[]; authors: Author[] }): string {
  const lines: string[] = [];

  lines.push('=== پادکست‌ها ===');
  data.podcasts.forEach((p, i) => {
    const eps = p.episodes.map((ep, j) => `${j + 1}.${ep.title}`).join(', ');
    lines.push(`${i + 1}. [${p.id || (p as any)._id}] "${p.title}" - ${p.description?.slice(0, 80) || ''} (${p.episodes.length}جلسه: ${eps})`);
  });

  lines.push('\n=== ویدیوها ===');
  data.videos.forEach((v, i) => {
    lines.push(`${i + 1}. [${v.id || (v as any)._id}] "${v.title}" - ${v.description?.slice(0, 80) || ''} (${v.duration || ''})`);
  });

  lines.push('\n=== کتاب‌ها ===');
  data.books.forEach((b, i) => {
    lines.push(`${i + 1}. [${b.id || (b as any)._id}] "${b.title}" - ${b.author || 'ناشناس'} - ${b.description?.slice(0, 80) || ''}`);
  });

  if (data.posts.length > 0) {
    lines.push('\n=== پست‌ها ===');
    data.posts.slice(0, 15).forEach((p, i) => {
      lines.push(`${i + 1}. "${p.title || 'بدون عنوان'}" - ${p.content?.slice(0, 60) || ''}`);
    });
  }

  return lines.join('\n');
}

function getSystemPrompt(data: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[]; authors: Author[] }): string {
  const catalog = buildCompactCatalog(data);

  return `تو "محفل AI" هستی، دستیار هوشمند پلتفرم "محفل" (سرای هنر و اندیشه). یک پلتفرم پادکست، ویدیو و کتاب فارسی.

تو دو نوع کار انجام میدی:
۱. پاسخ به سوالات عمومی (هر موضوعی)
۲. کمک با محتوای محفل (جستجو، معرفی، خلاصه و تحلیل)

قوانین:
- اگه سوال درباره محتوای محفله → از داده‌های زیر تحلیل کن
- اگه سوال عمومیه → با دانش خودت پاسخ بده
- پاسخ رو مرتب و تحلیلی بده
- در انتهای هر پاسخ، ۲-۳ سوال پیشنهادی مرتبط بده
- به فارسی روان پاسخ بده

⚡ کدهای دکمه (وقتی محتوای محفل پیدا کردی):
[PODCAST:ID] | [EPISODE:PODCAST_ID:شماره_جلسه] | [VIDEO:ID] | [BOOK:ID]

محتوای محفل:
${catalog}`;
}

async function chat(messages: Array<{ role: string; content: string }>, model = 'google/gemini-2.0-flash-001'): Promise<string> {
  const { content } = await chatViaServer(messages, { grounding: true, model, maxTokens: 8192 });
  return content;
}

export async function aiAssistant(message: string, data: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[]; authors: Author[] }): Promise<string> {
  return chat([
    { role: 'system', content: getSystemPrompt(data) },
    { role: 'user', content: message }
  ]);
}

export async function ragChat(message: string, data?: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[]; authors: Author[] }): Promise<{ content: string; sources: any[]; grounded: boolean }> {
  return chatViaServer([
    ...(data ? [{ role: 'system' as const, content: getSystemPrompt(data) }] : []),
    { role: 'user' as const, content: message },
  ], { grounding: true });
}

export async function summarizePodcast(podcast: Podcast, episodeIndex?: number): Promise<string> {
  const episode = episodeIndex != null ? podcast.episodes[episodeIndex] : null;
  const context = episode
    ? `پادکست: ${podcast.title}\nجلسه: ${episode.title}\nتوضیحات: ${episode.description || 'ندارد'}\nمدت: ${episode.duration || 'نامشخص'}`
    : `پادکست: ${podcast.title}\nتعداد جلسات: ${podcast.episodes.length}\nجلسات:\n${podcast.episodes.map((e, i) => `${i + 1}. ${e.title} - ${e.description || ''}`).join('\n')}`;

  return (await chatViaServer([
    { role: 'system', content: 'تو دستیار هوشمند محفل هستی. خلاصه محتوا رو به فارسی روان و مختصر بنویس. فقط خلاصه رو برگردون.' },
    { role: 'user', content: `لطفاً این پادکست رو خلاصه کن:\n\n${context}` }
  ], { grounding: false, maxTokens: 8192 })).content;
}

export async function summarizeVideo(video: Video): Promise<string> {
  const context = `ویدیو: ${video.title}\nتوضیحات: ${video.description || 'ندارد'}\nمدت: ${video.duration || 'نامشخص'}`;
  return (await chatViaServer([
    { role: 'system', content: 'تو دستیار هوشمند محفل هستی. خلاصه محتوا رو به فارسی روان و مختصر بنویس. فقط خلاصه رو بده.' },
    { role: 'user', content: `لطفاً این ویدیو رو خلاصه کن:\n\n${context}` }
  ], { grounding: false })).content;
}

export async function summarizeBook(book: PublishedBook): Promise<string> {
  const context = `کتاب: ${book.title}\nنویسنده: ${book.author || 'ناشناس'}\nتوضیحات: ${book.description || 'ندارد'}`;
  return (await chatViaServer([
    { role: 'system', content: 'تو دستیار هوشمند محفل هستی. خلاصه محتوا رو به فارسی روان و مختصر بنویس. فقط خلاصه رو بده.' },
    { role: 'user', content: `لطفاً این کتاب رو خلاصه کن:\n\n${context}` }
  ], { grounding: false })).content;
}

export async function smartSearch(query: string, data: { podcasts: Podcast[]; videos: Video[]; posts: Post[]; books: PublishedBook[] }): Promise<string> {
  const catalog = buildCompactCatalog({ ...data, authors: [] });
  return (await chatViaServer([
    { role: 'system', content: 'تو دستیار هوشمند محفل هستی. بر اساس کاتالوگ محتوا، نتایج مرتبط رو به فارسی نشون بده. هر نتیجه رو با جزئیات کامل معرفی کن.' },
    { role: 'user', content: `جستجو: ${query}\n\nکاتالوگ موجود:\n${catalog}` }
  ], { grounding: false })).content;
}

export async function generateTags(content: string): Promise<string> {
  return (await chatViaServer([
    { role: 'system', content: 'تو تگ‌های مناسب برای محتوا پیشنهاد میدی. ۵ تا تگ کوتاه و مرتبط به فارسی برگردون.' },
    { role: 'user', content: `برای این محتوا تگ پیشنهاد بده:\n${content}` }
  ], { grounding: false })).content;
}

export async function smartReply(comment: string, context: string): Promise<string> {
  return (await chatViaServer([
    { role: 'system', content: 'تو دستیار هوشمند محفل هستی. یک پاسخ مناسب، مودبانه و مرتبط به فارسی بنویس.' },
    { role: 'user', content: `نظر: ${comment}\nموضوع: ${context}` }
  ], { grounding: false })).content;
}