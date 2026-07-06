import express from 'express';
const router = express.Router();

const OPENROUTER_API_KEY = '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';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'google/gemini-2.0-flash-001' } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages is required' });
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://mahfel.app',
        'X-Title': 'MAHFEL AI'
      },
      body: JSON.stringify({ model, messages, max_tokens: 2048 })
    });

    const data = await response.json();
    if (data.error) {
      return res.status(400).json({ error: data.error.message || 'AI Error' });
    }
    res.json(data);
  } catch (e) {
    console.error('AI Proxy Error:', e.message);
    res.status(500).json({ error: e.message || 'خطا در ارتباط با هوش مصنوعی' });
  }
});

export default router;
