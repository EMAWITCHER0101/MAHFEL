const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function chatCompletion(messages, model = 'google/gemini-2.0-flash-001', maxTokens = 2048) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://mahfel.app',
      'X-Title': 'MAHFEL AI',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'AI Error');
  return data;
}

export async function generateText(prompt, systemInstruction, model = 'google/gemini-2.0-flash-001') {
  const data = await chatCompletion([
    { role: 'system', content: systemInstruction },
    { role: 'user', content: prompt },
  ], model);
  return data?.choices?.[0]?.message?.content || '';
}