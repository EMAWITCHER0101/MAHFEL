import { Router } from 'express';
import { Readable } from 'stream';
import https from 'https';

const router = Router();

const ALLOWED_HOSTS = ['dl.soha-sima.ir'];

// dl.soha-sima.ir served an expired cert (since 2026-08-07) while content is fine.
// Use a relaxed TLS agent for this host so playback keeps working until the cert is renewed.
const relaxedAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Try strict fetch first; on TLS failure (expired cert) fall back to a
// relaxed node:https request that streams the response directly.
const fetchWithTlsFallback = (url, fetchOpts) => {
  return fetch(url, fetchOpts).catch(() => {
    const parsed = new URL(url);
    return new Promise((resolve, reject) => {
      const req = https.request(
        parsed,
        { method: 'GET', headers: fetchOpts.headers || {}, agent: relaxedAgent },
        (res) => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            isNodeStream: true,
            headers: { get: (name) => res.headers[name.toLowerCase()] || null },
            body: res,
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  });
};

router.get('/audio', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
      const parsed = new URL(url);
      if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
        return res.status(403).json({ error: 'Forbidden host' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const range = req.headers.range;
    const fetchOpts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    };

    if (range) {
      fetchOpts.headers['Range'] = range;
    }

    let originRes = await fetchWithTlsFallback(url, fetchOpts);

    if (!originRes.ok && originRes.status !== 206) {
      return res.status(originRes.status).json({ error: 'Failed to fetch audio' });
    }

    const contentType = originRes.headers.get('content-type') || 'audio/mpeg';
    const contentLength = originRes.headers.get('content-length');
    const contentRange = originRes.headers.get('content-range');

    if (range && originRes.status === 206) {
      res.status(206);
      if (contentRange) res.set('Content-Range', contentRange);
    }

    res.set('Content-Type', contentType);
    if (contentLength) res.set('Content-Length', contentLength);
    res.set('Accept-Ranges', 'bytes');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Access-Control-Allow-Origin', '*');

    if (originRes.isNodeStream) {
      originRes.body.on('error', (err) => {
        console.error('Stream error:', err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream error' });
        } else {
          res.end();
        }
      });
      originRes.body.pipe(res);
    } else {
      const stream = Readable.fromWeb(originRes.body);
      stream.on('error', (err) => {
        console.error('Stream error:', err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream error' });
        } else {
          res.end();
        }
      });
      stream.pipe(res);
    }
  } catch (error) {
    console.error('Proxy error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy error' });
    }
  }
});

export default router;