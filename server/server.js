import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '.env') });
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';

import authRoutes from './routes/auth.js';
import podcastRoutes from './routes/podcasts.js';
import videoRoutes from './routes/videos.js';
import playlistRoutes from './routes/playlists.js';
import authorRoutes from './routes/authors.js';
import bookRoutes from './routes/books.js';
import publishedBookRoutes from './routes/publishedBooks.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import proxyRoutes from './routes/proxy.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';
import adminRolesRoutes from './routes/adminRoles.js';
import aiRoutes from './routes/ai.js';
import notificationRoutes from './routes/notifications.js';
import appUpdateRoutes from './routes/appUpdate.js';
import purchaseRequestRoutes from './routes/purchaseRequests.js';
import expenseRoutes from './routes/expenses.js';
import communityRoutes from './routes/community.js';
import userProfileRoutes from './routes/users.js';
import supportRoutes from './routes/support.js';
import albumRoutes from './routes/albums.js';

const app = express();
const PORT = process.env.PORT || 5000;

await connectDB();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression({ level: 6, threshold: 1024, filter: (req, res) => {
  if (req.headers['x-no-compression']) return false;
  return compression.filter(req, res);
}}));
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173', 'http://87.107.165.104', 'https://87.107.165.104', 'http://87.248.145.44', 'https://87.248.145.44', 'http://soha-sima.ir', 'https://soha-sima.ir', 'https://app.soha-sima.ir'], credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'فرمت JSON درخواست نادرست است' });
  }
  next(err);
});

app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'public, max-age=30, s-maxage=60');
  }
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: 'درخواست‌های زیادی ارسال شده. لطفاً بعداً تلاش کنید.',
});
app.use('/api/', limiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/check-ip', async (req, res) => {
  try {
    const queryIP = req.query.ip;
    let clientIP = queryIP || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';

    if (clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1' || !clientIP) {
      return res.json({ countryCode: 'IR', ip: clientIP, local: true });
    }

    try {
      const geoip = await import('geoip-lite');
      const geo = geoip.default.lookup(clientIP);
      return res.json({ countryCode: geo?.country || 'IR', ip: clientIP });
    } catch {
      return res.json({ countryCode: 'IR', ip: clientIP });
    }
  } catch {
    res.json({ countryCode: 'IR', ip: '' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/podcasts', podcastRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/published-books', publishedBookRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-roles', adminRolesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/app-update', appUpdateRoutes);
app.use('/api/purchase-requests', purchaseRequestRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/users', userProfileRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/albums', albumRoutes);
app.use('/uploads', express.static(path.resolve('uploads')));

app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'خطای داخلی سرور' });
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Soha API running on http://localhost:${PORT}`);
});
