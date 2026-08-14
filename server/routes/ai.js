import express from 'express';
import { chatCompletion } from '../utils/aiClient.js';
import { retrieve, forceRefresh, getCorpusStats } from '../utils/corpus.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'google/gemini-2.0-flash-001', grounding = true, maxTokens } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages is required' });
    }

    let final = [...messages];
    let sources = [];

    if (grounding) {
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      if (lastUser && (lastUser.content || '').trim().length > 8) {
        const hits = await retrieve(lastUser.content, 5);
        if (hits.length) {
          const context = hits
            .map((h, i) => `[سند ${i + 1} — ${h.kind} «${h.title}»${h.author ? ` (${h.author})` : ''}]\n${h.snippet}`)
            .join('\n\n---\n\n');
          const existingSystem = final.find(m => m.role === 'system')?.content || '';
          const groundedSystem = `تو دستیار هوشمند «سها سیما» هستی که روی کتاب‌ها، پادکست‌ها و ویدیوهای سها سیما آموزش دیده است.\n\nقوانین:\n- اگر سوال کاربر درباره محتوای سها سیماست، پاسخ را فقط بر اساس «مستندات سها سیما» بده و عنوان منبع را ذکر کن.\n- اگر مستندات مرتبطی وجود نداشت، با دانش خودت پاسخ بده و صادقانه بگو که مطلب مستقیمی در مستندات پیدا نشده.\n- پاسخ روان و مرتب فارسی بده.\n\nمستندات سها سیما (منابع یادگیری):\n${context}`;
          final = [
            { role: 'system', content: existingSystem ? `${groundedSystem}\n\n${existingSystem}` : groundedSystem },
            ...final.filter(m => m.role !== 'system'),
          ];
          sources = hits.map(h => ({
            type: h.kind,
            title: h.title,
            author: h.author,
            id: h.id,
            score: h.score,
            snippet: h.snippet.slice(0, 200),
          }));
        }
      }
    }

    const data = await chatCompletion(final, model, maxTokens);
    data.sources = sources;
    data.grounded = sources.length > 0;
    res.json(data);
  } catch (e) {
    console.error('AI Proxy Error:', e.message);
    res.status(500).json({ error: e.message || 'خطا در ارتباط با هوش مصنوعی' });
  }
});

router.get('/corpus', async (req, res) => {
  try {
    res.json(await getCorpusStats());
  } catch (e) {
    res.status(500).json({ error: e.message || 'خطای سرور' });
  }
});

router.post('/corpus/refresh', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const idx = await forceRefresh();
    res.json({ success: true, chunks: idx.docs.length });
  } catch (e) {
    res.status(500).json({ error: e.message || 'خطای سرور' });
  }
});

export default router;