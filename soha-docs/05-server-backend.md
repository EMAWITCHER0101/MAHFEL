# بخش ۵: بک‌اند Express — تحلیل server.js و middleware ها

**مسیر فایل:** `server/server.js` — ۱۳۷ خط  
**هدف:** نقطه ورود سرور بک‌اند، زنجیره middleware، ثبت مسیرها، CORS، Rate Limiting و مدیریت خطا

---

## فهرست مطالب

1. [مقدمه و معماری کلی](#مقدمه-و-معماری-کلی)
2. [خط ۱ تا ۶: بارگذاری متغیرهای محیطی](#خط-۱-تا-۶-بارگذاری-متغیرهای-محیطی)
3. [خط ۷ تا ۱۲: واردکردن ماژول‌ها](#خط-۷-تا-۱۲-واردکردن-ماژول‌ها)
4. [خط ۱۴ تا ۳۵: واردکردن مسیرها (Route Imports)](#خط-۱۴-تا-۳۵-واردکردن-مسیرها)
5. [خط ۳۷ تا ۴۸: ساخت اپلیکیشن و middleware اولیه](#خط-۳۷-تا-۴۸-ساخت-اپلیکیشن-و-middleware-اولیه)
6. [خط ۵۰ تا ۵۵: لاگر خطای JSON](#خط-۵۰-تا-۵۵-لاگر-خطای-json)
7. [خط ۵۷ تا ۶۲: کش‌کنترل برای درخواست‌های GET](#خط-۵۷-تا-۶۲-کش‌کنترل-برای-درخواست‌های-get)
8. [خط ۶۴ تا ۶۹: Rate Limiting](#خط-۶۴-تا-۶۹-rate-limiting)
9. [خط ۷۱ تا ۹۴: مسیرهای سلامت و چک IP](#خط-۷۱-تا-۹۴-مسیرهای-سلامت-و-چک-ip)
10. [خط ۹۶ تا ۱۱۸: ثبت تمام مسیرهای API](#خط-۹۶-تا-۱۱۸-ثبت-تمام-مسیرهای-api)
11. [خط ۱۲۰ تا ۱۲۵: Middleware مدیریت خطای سراسری](#خط-۱۲۰-تا-۱۲۵-middleware-مدیریت-خطای-سراسری)
12. [خط ۱۲۷ تا ۱۳۳: مدیریت Promise Rejection و Exception](#خط-۱۲۷-تا-۱۳۳-مدیریت-promise-rejection-و-exception)
13. [خط ۱۳۵ تا ۱۳۷: راه‌اندازی سرور](#خط-۱۳۵-تا-۱۳۷-راه‌اندازی-سرور)
14. [تحلیل middleware/auth.js](#تحلیل-middlewareauthjs)
15. [تحلیل config/db.js](#تحلیل-configdbjs)
16. [الگوهای طراحی و اتصال به فایل‌های دیگر](#الگوهای-طراحی-و-اتصال-به-فایل‌های-دیگر)

---

## مقدمه و معماری کلی

فایل `server.js` نقطه ورود اصلی سرور بک‌اند پروژه محفل است. این سرور با استفاده از **Express.js** نوشته شده و وظیفه مدیریت تمام درخواست‌های HTTP را بر عهده دارد. معماری کلی به صورت زیر است:

```
Client (Next.js / React Native / Electron)
    ↓ HTTP Request
    ↓
┌─────────────────────────────────────┐
│          Express Server             │
│  ┌───────────────────────────────┐  │
│  │  Helmet (Security Headers)    │  │
│  │  Compression (gzip)          │  │
│  │  CORS (Origin Check)         │  │
│  │  JSON Parser (10mb limit)    │  │
│  │  JSON Error Handler          │  │
│  │  Cache Control               │  │
│  │  Rate Limiter (5000/15min)   │  │
│  │  Health / Check-IP           │  │
│  │  Route Handlers (20+ routers)│  │
│  │  Static Files (uploads)      │  │
│  │  Global Error Handler        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
    ↓
    ↓
┌─────────────────────────────────────┐
│     MongoDB (Mongoose ODM)          │
└─────────────────────────────────────┘
```

سرور از الگوی **Middleware Pipeline** استفاده می‌کند، به این معنی که هر درخواست HTTP از زنجیره‌ای از middleware ها عبور می‌کند و هر middleware یا کاری انجام می‌دهد یا درخواست را به middleware بعدی منتقل می‌کند.

---

## خط ۱ تا ۶: بارگذاری متغیرهای محیطی

```javascript
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '.env') });
```

**تحلیل:**

- **خط ۱:** ماژول `config` از پکیج `dotenv` وارد می‌شود. این ماژول وظیفه بارگذاری متغیرهای محیطی از فایل `.env` را دارد.
- **خط ۲-۵:** چون پروژه از **ES Module** استفاده می‌کند (`import/export`)، متغیرهای `__filename` و `__dirname` به صورت خودکار در دسترس نیستند. بنابراین با استفاده از `fileURLToPath` و `path.dirname` آن‌ها را به صورت دستی می‌سازیم.
- **خط ۶:** فایل `.env` که در کنار `server.js` قرار دارد، بارگذاری می‌شود. این فایل حاوی متغیرهای حیاتی مانند `MONGODB_URI`، `JWT_SECRET`، `OPENROUTER_API_KEY` و غیره است.

**نکته مهم:** متغیر `__dirname` برای ساخت مسیر دقیق فایل `.env` ضروری است، چون سرور ممکن است از هر دایرکتوری اجرا شود.

---

## خط ۷ تا ۱۲: واردکردن ماژول‌ها

```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
```

**تحلیل هر ماژول:**

| ماژول | نسخه | وظیفه |
|-------|------|-------|
| `express` | 4.x | فریمورک اصلی HTTP — ساخت روت‌ها و middleware |
| `cors` | 2.x | مدیریت Cross-Origin Resource Sharing |
| `helmet` | 7.x | اضافه کردن هدر‌های امنیتی HTTP |
| `compression` | 1.x | فشرده‌سازی gzip پاسخ‌ها برای کاهش حجم |
| `express-rate-limit` | 7.x | محدود کردن تعداد درخواست‌ها در بازه زمانی |
| `connectDB` | اختصاصی | اتصال به MongoDB از فایل `config/db.js` |

**اتصال به دیتابیس (خط ۴۰):**
```javascript
await connectDB();
```
از آنجا که کد از top-level `await` استفاده می‌کند، فایل `server.js` باید به صورت ES Module اجرا شود (که در `package.json` با `"type": "module"` تنظیم شده).

---

## خط ۱۴ تا ۳۵: واردکردن مسیرها (Route Imports)

```javascript
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
```

**تحلیل:** ۲۲ مسیر مختلف وارد شده‌اند. هر کدام یک `Router` اختصاصی Express هستند که در فایل جداگانه‌ای تعریف شده‌اند. این الگوی ** modular routing** نام دارد و مزایای زیر را دارد:

- **جداسازی مسئولیت‌ها:** هر بخش منطق تجاری خودش را دارد
- **قابلیت نگهداری:** تغییر در یک مسیر، بقیه را تحت تأثیر قرار نمی‌دهد
- **خوانایی:** هر فایل حداکثر چند صد خط است

**لیست کامل مسیرها و تعداد خطوط فایل مربوطه:**

| مسیر | فایل | توضیح |
|------|------|-------|
| `/api/auth` | auth.js (506 خط) | احراز هویت، OTP، ثبت‌نام |
| `/api/podcasts` | podcasts.js | مدیریت پادکست‌ها |
| `/api/videos` | videos.js | مدیریت ویدیوها |
| `/api/playlists` | playlists.js | لیست‌های پخش ویدیو |
| `/api/authors` | authors.js | نویسندگان |
| `/api/books` | books.js | کتاب‌های کتابخانه |
| `/api/published-books` | publishedBooks.js | کتاب‌های منتشر شده |
| `/api/posts` | posts.js (373 خط) | پست‌های محفل |
| `/api/comments` | comments.js | نظرات |
| `/api/proxy` | proxy.js | پراکسی محتوا |
| `/api/upload` | upload.js | آپلود فایل |
| `/api/admin` | admin.js (1083 خط) | پنل مدیریت |
| `/api/admin-roles` | adminRoles.js | مدیریت نقش‌ها |
| `/api/ai` | ai.js | هوش مصنوعی |
| `/api/notifications` | notifications.js | نوتیفیکیشن‌ها |
| `/api/app-update` | appUpdate.js | به‌روزرسانی اپ |
| `/api/purchase-requests` | purchaseRequests.js | درخواست‌های خرید |
| `/api/expenses` | expenses.js | هزینه‌ها |
| `/api/community` | community.js | تنظیمات جامعه |
| `/api/users` | users.js | پروفایل کاربران |
| `/api/support` | support.js | پشتیبانی |
| `/api/albums` | albums.js | آلبوم‌های شخصی |

---

## خط ۳۷ تا ۴۸: ساخت اپلیکیشن و middleware اولیه

```javascript
const app = express();
const PORT = process.env.PORT || 5000;

await connectDB();
```

### Helmet (خط ۴۲)

```javascript
app.use(helmet({ crossOriginResourcePolicy: false }));
```

**تحلیل:** `helmet` هدر‌های امنیتی زیر را به تمام پاسخ‌ها اضافه می‌کند:

- `X-Content-Type-Options: nosniff` — جلوگیری از MIME sniffing
- `X-Frame-Options: DENY` — جلوگیری از clickjacking
- `Strict-Transport-Security` — اجباری کردن HTTPS
- `X-XSS-Protection` — محافظت در برابر XSS
- و ده‌ها هدر امنیتی دیگر

گزینه `crossOriginResourcePolicy: false` برای غیرفعال کردن هدر CORP است، چون سرور فایل‌های استاتیک (تصاویر، ویدیوها) را برای کلاینت‌های مختلف ارسال می‌کند.

### Compression (خط ۴۳-۴۶)

```javascript
app.use(compression({ level: 6, threshold: 1024, filter: (req, res) => {
  if (req.headers['x-no-compression']) return false;
  return compression.filter(req, res);
}}));
```

**تحلیل:**
- **`level: 6`** — سطح فشرده‌سازی (۱ سریع‌ترین، ۹ بیشترین فشرده‌سازی). سطح ۶ تعادل خوبی بین سرعت و حجم ایجاد می‌کند.
- **`threshold: 1024`** — فقط پاسخ‌های بیشتر از ۱KB فشرده می‌شوند. پاسخ‌های کوچکتر فشرده نمی‌شوند چون سربار محاسباتی بیشتر از سود آن است.
- **`filter`** — اگر کلاینت هدر `x-no-compression` را ارسال کند، فشرده‌سازی غیرفعال می‌شود. این برای دیباگ یا کلاینت‌هایی که مشکل دارند مفید است.

### CORS (خط ۴۷)

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',     // Next.js dev
    'http://localhost:5173',     // Vite dev
    'http://87.107.165.104',     // سرور IP
    'https://87.107.165.104',    // سرور IP با HTTPS
    'http://87.248.145.44',      // سرور IP دوم
    'https://87.248.145.44',     // سرور IP دوم با HTTPS
    'http://soha-sima.ir',       // دامنه اصلی
    'https://soha-sima.ir',      // دامنه اصلی با HTTPS
    'https://app.soha-sima.ir',  // زیردامنه اپ
  ],
  credentials: true
}));
```

**تحلیل:** CORS مشخص می‌کند که کدام دامنه‌ها مجاز به ارسال درخواست به این سرور هستند. گزینه `credentials: true` اجازه ارسال کوکی و هدر `Authorization` را می‌دهد.

### JSON Parser (خط ۴۸)

```javascript
app.use(express.json({ limit: '10mb' }));
```

**تحلیل:** بدنه درخواست‌های JSON را پارس می‌کند. محدودیت `10mb` برای پشتیبانی از آپلود تصاویر Base64 در پست‌ها و نظرات ضروری است.

---

## خط ۵۰ تا ۵۵: لاگر خطای JSON

```javascript
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'فرمت JSON درخواست نادرست است' });
  }
  next(err);
});
```

**تحلیل:** این middleware اختصاصی مدیریت خطای `SyntaxError` در پارس JSON است. وقتی کلاینت JSON نامعتبر ارسال کند، Express به صورت پیش‌فرض خطای `SyntaxError` پرتاب می‌کند. این middleware آن را گرفته و پاسخ فارسی مناسب برمی‌گرداند.

**نکته:** این middleware باید قبل از middleware های دیگر قرار بگیرد تا خطاهای JSON زودتر مدیریت شوند.

---

## خط ۵۷ تا ۶۲: کش‌کنترل برای درخواست‌های GET

```javascript
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'public, max-age=30, s-maxage=60');
  }
  next();
});
```

**تحلیل:**
- فقط درخواست‌های `GET` که به مسیرهای `/api/` ختم می‌شوند کش می‌شوند
- **`max-age=30`** — مرورگر کلاینت پاسخ را ۳۰ ثانیه کش می‌کند
- **`s-maxage=60`** — سرور واسطه (مثل CDN یا Nginx) پاسخ را ۶۰ ثانیه کش می‌کند
- **`public`** — اجازه کش توسط هر سطحی از حافظه کش

**مزیت:** این کار فشار بر MongoDB را به شدت کاهش می‌دهد، مخصوصاً برای درخواست‌هایی که محتوای کمتر تغییر می‌کنند مثل لیست پادکست‌ها یا ویدیوها.

---

## خط ۶۴ تا ۶۹: Rate Limiting

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // ۱۵ دقیقه
  max: 5000,                  // حداکثر ۵۰۰۰ درخواست
  message: 'درخواست‌های زیادی ارسال شده. لطفاً بعداً تلاش کنید.',
});
app.use('/api/', limiter);
```

**تحلیل:**
- **`windowMs: 900000`** — بازه زمانی ۱۵ دقیقه (بر حسب میلی‌ثانیه)
- **`max: 5000`** — هر IP حداکثر ۵۰۰۰ درخواست در هر ۱۵ دقیقه می‌تواند ارسال کند
- **`message`** — پیام خطا به فارسی برای کاربران ایرانی

**نرخ واقعی:** ۵۰۰۰ درخواست در ۱۵ دقیقه = ۳۳۳ درخواست در دقیقه = ۵.۵ درخواست در ثانیه. این نرخ برای استفاده عادی بسیار بالاست و فقط جلوی حملات DoS را می‌گیرد.

---

## خط ۷۱ تا ۹۴: مسیرهای سلامت و چک IP

### مسیر سلامت (Health Check) — خط ۷۱-۷۳

```javascript
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

**تحلیل:** این مسیر توسط سیستم‌های مانیتورینگ (مثل UptimeRobot) برای بررسی سلامت سرور استفاده می‌شود. هر چند ثانیه یک درخواست GET ارسال می‌شود و اگر پاسخ `200` باشد، سرور فعال است.

### مسیر چک IP — خط ۷۵-۹۴

```javascript
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
```

**تحلیل:** این مسیر کشور کاربر را از روی IP تشخیص می‌دهد. از کتابخانه `geoip-lite` به صورت **dynamic import** استفاده می‌شود (خط ۸۵) تا اگر کتابخانه نصب نباشد، خطا رخ ندهد.

**نکات مهم:**
- IP واقعی از هدر `x-forwarded-for` خوانده می‌شود (چون Nginx به عنوان Reverse Proxy عمل می‌کند)
- IP های لوکال (`127.0.0.1`, `::1`) همیشه `IR` برگردانده می‌شوند
- در صورت خطا، پیش‌فرض `IR` بازمی‌گردد (چون مخاطبان اصلی ایرانی هستند)

---

## خط ۹۶ تا ۱۱۸: ثبت تمام مسیرهای API

```javascript
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
```

**تحلیل:**
- هر `app.use` یک مسیر پایه و یک Router اختصاصی را متصل می‌کند
- **آخرین خط** فایل‌های آپلود شده در پوشه `uploads/` را به صورت فایل استاتیک سرو می‌کند
- ترتیب مسیرها مهم نیست (چون هر کدام پیشوند متفاوتی دارند)

**الگوی عملکرد:** وقتی کلاینت درخواست `GET /api/podcasts` ارسال می‌کند، Express می‌بیند که پیشوند `/api/podcasts` با مسیر ثبت شده مطابقت دارد، بنابراین درخواست را به `podcastRoutes` تحویل می‌دهد.

---

## خط ۱۲۰ تا ۱۲۵: Middleware مدیریت خطای سراسری

```javascript
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'خطای داخلی سرور' });
  }
});
```

**تحلیل:** این آخرین middleware مدیریت خطا است. اگر خطایی در هیچ‌کدام از middleware ها یا route handler ها مدیریت نشده باشد، اینجا گرفته می‌شود.

**نکات مهم:**
- **`if (!res.headersSent)`** — بررسی می‌کند که آیا قبلاً پاسخی ارسال شده یا نه. اگر بله، نمی‌توان دوباره پاسخ داد (خطای `headers already sent` رخ می‌دهد)
- **`console.error`** — خطا در لاگ سرور ثبت می‌شود (فقط message، نه stack trace)
- **پاسخ فارسی** — کاربر پیام خطای فارسی می‌بیند، نه جزئیات فنی

---

## خط ۱۲۷ تا ۱۳۳: مدیریت Promise Rejection و Exception

```javascript
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});
```

**تحلیل:**

### `unhandledRejection`
وقتی یک Promise reject شود و هیچ `.catch()` یا `try/catch` آن را مدیریت نکند. مثال:

```javascript
// این rejection مدیریت نشده باقی می‌ماند
User.findById('invalid-id').then(user => {
  // ...
});
// اگر findById reject شود، unhandledRejection فراخوانی می‌شود
```

### `uncaughtException`
وقتی خطایی در هیچ try/catch ای گرفته نشود و باعث crash شود. این رویداد **باید** باعث خروج 프ریمجر شود چون وضعیت سرور ممکن است ناپایدار شده باشد.

**الگوی عملکرد:** هر دو handler فقط خطا را لاگ می‌کنند و اجازه می‌دهند سرور به کار خود ادامه دهد. در محیط Production، بهتر است از PM2 یا مشابه آن (process manager) استفاده شود که سرور را به صورت خودکار ریستارت کند.

---

## خط ۱۳۵ تا ۱۳۷: راه‌اندازی سرور

```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Soha API running on http://localhost:${PORT}`);
});
```

**تحلیل:**
- **`PORT`** — از متغیر محیطی `PORT` خوانده می‌شود، در غیر این صورت `5000` پیش‌فرض است
- **`0.0.0.0`** — سرور روی تمام کارت‌های شبکه گوش می‌دهد (نه فقط localhost). این برای دسترسی از خارج سرور ضروری است
- **پیام لاگ** — آدرس سرور در کنسول نمایش داده می‌شود

---

## تحلیل middleware/auth.js

فایل `server/middleware/auth.js` حاوی ۵ middleware و ۱ تابع کمکی است:

### ۱. `auth` (خط ۵-۳۵) — احراز هویت اختیاری

```javascript
export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const ip = getClientIP(req);
    req.clientIP = ip;
    req.isIranianIP = isIranianIP(ip);
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      req.user = null;
      return next();
    }
    if (user.muted && user.mutedUntil && new Date() > user.mutedUntil) {
      user.muted = false;
      user.mutedUntil = null;
      user.mutedReason = '';
      await user.save();
    }
    req.user = user;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};
```

**تحلیل جزئی:**
- **توکن اختیاری:** اگر توکنی ارسال نشود یا نامعتبر باشد، `req.user = null` تنظیم شده و درخواست ادامه می‌یابد
- **تشخیص IP ایرانی:** هر درخواست IP کلاینت را بررسی کرده و `req.isIranianIP` را تنظیم می‌کند
- **آنبلاک خودکار:** اگر مدت سکوت کاربر تمام شده باشد، به صورت خودکار `muted=false` می‌شود

### ۲. `requireAuth` (خط ۳۷-۵۹) — احراز هویت اجباری

```javascript
export const requireAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'احراز هویت لازم است' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'کاربر یافت نشد' });
    if (user.banned) return res.status(403).json({ error: 'شما از سایت اخراج شده‌اید.', banned: true });

    // ... مدیریت muted
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'توکن نامعتبر است' });
  }
};
```

**تفاوت با `auth`:** اگر کاربر احراز هویت نشده باشد، درخواست با خطای 401 یا 403 متوقف می‌شود (نه اینکه ادامه یابد).

### ۳. `requireRole` (خط ۶۱-۷۰) — بررسی نقش

```javascript
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'احراز هویت لازم است' });
    if (req.user.role === 'superadmin') return next();
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    next();
  };
};
```

**تحلیل:** یک closure است که لیست نقش‌های مجاز را دریافت کرده و middleware برمی‌گرداند. `superadmin` همیشه دسترسی دارد.

**نمونه استفاده:** `requireRole('admin', 'superadmin')`

### ۴. `requireSuperAdmin` (خط ۷۲-۷۸) — فقط مدیر سیستم

```javascript
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'احراز هویت لازم است' });
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'فقط مدیر سیستم دسترسی دارد' });
  }
  next();
};
```

### ۵. `requireAdminPermission` (خط ۸۰-۹۲) — بررسی مجوز اختصاصی

```javascript
export const requireAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'احراز هویت لازم است' });
    if (req.user.role === 'superadmin') return next();
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    if (!req.user.adminPermissions || !req.user.adminPermissions.includes(permission)) {
      return res.status(403).json({ error: `دسترسی «${permission}» ندارید` });
    }
    next();
  };
};
```

**تحلیل:** این middleware سیستم **مجوزهای ریز (Granular Permissions)** را پیاده‌سازی می‌کند. هر ادمین می‌تواند فقط دسترسی‌های خاصی داشته باشد (مثلاً فقط `users` یا فقط `analytics`).

### ۶. `generateToken` (خط ۹۴-۹۸) — تولید JWT

```javascript
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};
```

**تحلیل:**
- **Payload:** فقط شامل `id` کاربر است (هیچ اطلاعات حساسی ذخیره نمی‌شود)
- **انقضا:** به صورت پیش‌فرض ۷ روز — قابل تغییر از متغیر محیطی `JWT_EXPIRES_IN`

---

## تحلیل config/db.js

فایل `server/config/db.js` فقط ۱۳ خط است اما یکی از حیاتی‌ترین فایل‌های پروژه است:

```javascript
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export default connectDB;
```

**تحلیل:**
- **`mongoose.connect(process.env.MONGODB_URI)`** — اتصال به MongoDB با استفاده از URI که در فایل `.env` تعریف شده
- **`process.exit(1)`** — اگر اتصال برقرار نشود، سرور فوراً خارج می‌شود (کد خروج ۱ = خطا)
- **عدم پیکربندی اضافی:** Mongoose با تنظیمات پیش‌فرض استفاده شده که شامل `useNewUrlParser` و `useUnifiedTopology` به صورت خودکار است

**اتصال به دیگر فایل‌ها:** `connectDB` در خط ۴۰ `server.js` فراخوانی می‌شود. از آنجا که top-level `await` است، کل اجرای سرور تا برقراری اتصال صبر می‌کند.

---

## الگوهای طراحی و اتصال به فایل‌های دیگر

### الگوی Middleware Pipeline

زنجیره middleware در `server.js` به ترتیب اجرا می‌شود:

```
درخواست ورودی
    ↓
Helmet (امنیت)
    ↓
Compression (فشرده‌سازی)
    ↓
CORS (اجازه دسترسی)
    ↓
JSON Parser (پارس بدنه)
    ↓
JSON Error Handler (خطای JSON)
    ↓
Cache Control (کش)
    ↓
Rate Limiter (محدودیت)
    ↓
Health / Check-IP (مسیرهای عمومی)
    ↓
Route Handlers (مسیرهای API)
    ↓
Static Files (فایل‌های آپلود)
    ↓
Global Error Handler (خطای سراسری)
```

### اتصال به فایل‌های دیگر

| فایل | اتصال |
|------|-------|
| `server/middleware/auth.js` | در route handler ها استفاده می‌شود (مثلاً `requireAuth`) |
| `server/config/db.js` | در خط ۴۰ `server.js` فراخوانی می‌شود |
| `server/routes/*.js` | در خطوط ۱۴-۳۵ وارد شده و در خطوط ۹۶-۱۱۷ ثبت شده‌اند |
| `server/utils/broadcast.js` | در route handler ها برای اطلاع‌رسانی لحظه‌ای استفاده می‌شود |
| `server/utils/webpush.js` | در route handler ها برای ارسال نوتیفیکیشن استفاده می‌شود |

### نکات امنیتی

1. **CORS محدود:** فقط دامنه‌های مشخص شده مجاز هستند
2. **Rate Limiting:** جلوگیری از حملات Brute Force
3. **Helmet:** محافظت در برابر XSS، clickjacking و سایر حملات
4. **JSON Limit:** محدودیت حجم بدنه درخواست
5. **Error Masking:** جزئیات خطاهای داخلی به کلاینت نمایش داده نمی‌شود

### اتصال به سیستم‌های خارجی

- **MongoDB:** اتصال اصلی دیتابیس از طریق `config/db.js`
- **WebSocket Server:** اطلاع‌رسانی لحظه‌ای از طریق `utils/broadcast.js` (پورت ۵۰۰۱)
- **GeoIP:** تشخیص کشور کاربر از IP
- **Firebase Admin SDK:** ارسال نوتیفیکیشن FCM (در `utils/webpush.js`)

---

**تعداد خطوط کل فایل:** ۱۳۷ خط  
**تعداد middleware ها:** ۸ عدد (شامل route handlers)  
**تعداد مسیرهای API:** ۲۲ مسیر  
**پورت پیش‌فرض:** ۵۰۰۰
