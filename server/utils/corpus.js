import PublishedBook from '../models/PublishedBook.js';
import Book from '../models/Book.js';
import Podcast from '../models/Podcast.js';
import Video from '../models/Video.js';

const REFRESH_TTL = 30 * 60 * 1000;
const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 180;
const MAX_TEXT_PER_ITEM = 60000;

let cache = null;
let lastBuilt = 0;
let building = null;

const FA_NORMALIZE = { 'ظٹ': 'غŒ', 'ظƒ': 'ع©', 'ط£': 'ط§', 'ط¥': 'ط§', 'ط¢': 'ط§', 'ط©': 'ظ‡', 'غ€': 'ظ‡', 'ط¤': 'ظˆ', 'ط¦': 'غŒ' };

export function normalizePersian(text) {
  return (text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[ظٹظƒط£ط¥ط¢ط©غ€ط¤ط¦]/g, ch => FA_NORMALIZE[ch] || ch)
    .toLowerCase();
}

export function tokenize(text) {
  const tokens = normalizePersian(text).match(/[\u0600-\u06FF\u0750-\u077F]+/g) || [];
  return tokens.filter(t => t.length >= 2);
}

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const chunks = [];
  for (let i = 0; i < t.length; i += size - overlap) {
    chunks.push(t.slice(i, i + size));
  }
  if (chunks.length === 0) chunks.push(t);
  return chunks;
}

function buildDocs(pbooks, books, podcasts, videos) {
  const docs = [];

  for (const b of pbooks) {
    const text = [b.title, b.subtitle, b.description, b.tableOfContents, b.contentHtml]
      .filter(Boolean).join('\n').slice(0, MAX_TEXT_PER_ITEM);
    chunkText(text).forEach(part => docs.push({
      kind: 'ع©طھط§ط¨', title: b.title, author: b.authorName, text: part,
      meta: { id: String(b._id), type: 'book' },
    }));
  }

  for (const b of books) {
    const relatedTitles = (b.relatedEpisodes || []).map(re => re?.podcastId?.title).filter(Boolean);
    const text = [b.title, b.description, `ط¬ظ„ط³ط§طھ ظ…ط±طھط¨ط·: ${relatedTitles.join('طŒ ')}`].filter(Boolean).join('\n');
    chunkText(text).forEach(part => docs.push({
      kind: 'ظ…ط¬ظ…ظˆط¹ظ‡', title: b.title, author: '', text: part,
      meta: { id: String(b._id), type: 'library' },
    }));
  }

  for (const p of podcasts) {
    const episodes = (p.episodes || []).map(e => {
      const dt = `${e.title || ''} ${e.description || ''} ${e.fullText || ''}`.trim();
      return dt ? `ط¬ظ„ط³ظ‡: ${dt}` : '';
    }).filter(Boolean);
    const text = [p.title, p.description, ...episodes].filter(Boolean).join('\n').slice(0, MAX_TEXT_PER_ITEM);
    chunkText(text).forEach(part => docs.push({
      kind: 'ظ¾ط§ط¯ع©ط³طھ', title: p.title, author: '', text: part,
      meta: { id: String(p._id), type: 'podcast' },
    }));
  }

  for (const v of videos) {
    const text = [v.title, v.description, v.fullText].filter(Boolean).join('\n').slice(0, MAX_TEXT_PER_ITEM);
    chunkText(text).forEach(part => docs.push({
      kind: 'ظˆغŒط¯غŒظˆ', title: v.title, author: '', text: part,
      meta: { id: String(v._id), type: 'video' },
    }));
  }

  return docs;
}

async function buildIndex() {
  const [publishedBooks, shelfBooks, podcasts, videos] = await Promise.all([
    PublishedBook.find().lean(),
    Book.find().populate('relatedEpisodes.podcastId').lean(),
    Podcast.find().lean(),
    Video.find().lean(),
  ]);
  const docs = buildDocs(publishedBooks, shelfBooks, podcasts, videos);

  const postings = new Map();
  const lengths = [];
  docs.forEach((doc, d) => {
    const counts = new Map();
    doc.terms = counts;
    for (const token of tokenize(doc.text)) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
    lengths.push(doc.text.length);
    for (const [term, tf] of counts) {
      if (!postings.has(term)) postings.set(term, []);
      postings.get(term).push({ d, tf });
    }
  });

  return { docs, postings, lengths, N: docs.length };
}

export async function ensureIndex() {
  if (cache && Date.now() - lastBuilt < REFRESH_TTL) return cache;
  if (building) return building;
  building = buildIndex()
    .then(idx => { cache = idx; lastBuilt = Date.now(); building = null; return idx; })
    .catch(err => { building = null; throw err; });
  return building;
}

export async function forceRefresh() {
  cache = null;
  lastBuilt = 0;
  return ensureIndex();
}

export async function retrieve(query, topK = 5) {
  const idx = await ensureIndex();
  const { docs, postings, lengths, N } = idx;
  const terms = Array.from(new Set(tokenize(query)));
  if (!terms.length) return [];

  const scores = new Map();
  let totalIdf = 0;
  let matchedIdf = 0;

  for (const term of terms) {
    const posts = postings.get(term);
    if (!posts) continue;
    const df = posts.length;
    const idf = Math.log((N + 1) / (1 + df)) + 1;
    totalIdf += idf;
    matchedIdf += idf;
    for (const { d, tf } of posts) {
      const norm = Math.sqrt(Math.max(1, lengths[d]));
      scores.set(d, (scores.get(d) || 0) + (tf / norm) * idf);
    }
  }

  const matchRatio = matchedIdf / Math.max(0.001, totalIdf);
  const ranked = [...scores.entries()]
    .map(([d, score]) => ({ d, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return ranked.map(({ d, score }) => {
    const doc = docs[d];
    const snippet = doc.text.slice(0, 600);
    return {
      score: Math.round(score * 100) / 100,
      matchRatio: Math.round(matchRatio * 100) / 100,
      kind: doc.kind,
      title: doc.title,
      author: doc.author,
      snippet,
      meta: doc.meta,
      id: doc.meta.id,
    };
  });
}

export async function getCorpusStats() {
  const idx = await ensureIndex();
  const byKind = {};
  for (const doc of idx.docs) {
    byKind[doc.kind] = (byKind[doc.kind] || 0) + 1;
  }
  return {
    chunks: idx.docs.length,
    byKind,
    refreshedAt: lastBuilt,
    ttlSeconds: REFRESH_TTL / 1000,
    indexedAt: new Date(lastBuilt).toISOString(),
  };
}