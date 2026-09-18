# بخش ۱۰: ابزارهای سرور — تحلیل utils/

**مسیر فایل‌ها:** `server/utils/*.js`  
**هدف:** تحلیل جزئی تمام ابزارهای کمکی سرور شامل AI Client، Corpus، Broadcast، Web Push و سایر ابزارها

---

## فهرست مطالب

1. [مقدمه](#مقدمه)
2. [aiClient.js — کلاینت OpenRouter AI (۲۷ خط)](#aiclientjs-کلاینت-openrouter-ai-۲۷-خط)
3. [corpus.js — مدیریت محتوا برای AI (۱۸۵ خط)](#corpusjs-مدیریت-محتوا-برای-ai-۱۸۵-خط)
4. [broadcast.js — اطلاع‌رسانی WebSocket (۱۹ خط)](#broadcastjs-اطلاع‌رسانی-websocket-۱۹-خط)
5. [webpush.js — ارسال Push Notification (۱۷۹ خط)](#webpushjs-ارسال-push-notification-۱۷۹-خط)
6. [profanityFilter.js — فیلتر فحش (۱۰۷ خط)](#profanityfilterjs-فیلتر-فحش-۱۰۷-خط)
7. [ipCheck.js — تشخیص IP ایرانی (۶۸ خط)](#ipcheckjs-تشخیص-ip-ایرانی-۶۸-خط)
8. [sms.js — ارسال SMS (۳۸ خط)](#smsjs-ارسال-sms-۳۸-خط)
9. [deleteUserContent.js — حذف محتوای کاربر (۵۹ خط)](#deleteusercontentjs-حذف-محتوای-کاربر-۵۹-خط)
10. [سایر ابزارها](#سایر-ابزارها)
11. [الگوهای طراحی و اتصالات](#الگوهای-طراحی-و-اتصالات)

---

## مقدمه

ابزارهای کمکی سرور در پوشه `server/utils/` قرار دارند. هر ابزار یک مسئولیت خاص را بر عهده دارد و به صورت ماژول جداگانه طراحی شده. این ابزارها توسط route handler ها فراخوانی می‌شوند.

**تعداد کل ابزارها:** ۸ فایل اصلی  
**تعداد کل خطوط:** ~۶۰۰ خط

| ابزار | فایل | خطوط | توضیح |
|-------|------|------|-------|
| aiClient | aiClient.js | ۲۷ | کلاینت OpenRouter API |
| corpus | corpus.js | ۱۸۵ | مدیریت محتوا برای RAG |
| broadcast | broadcast.js | ۱۹ | اطلاع‌رسانی WebSocket |
| webpush | webpush.js | ۱۷۹ | ارسال Push Notification |
| profanityFilter | profanityFilter.js | ۱۰۷ | فیلتر کلمات نامناسب |
| ipCheck | ipCheck.js | ۶۸ | تشخیص IP ایرانی |
| sms | sms.js | ۳۸ | ارسال SMS OTP |
| deleteUserContent | deleteUserContent.js | ۵۹ | حذف کامل محتوای کاربر |

---

## aiClient.js — کلاینت OpenRouter AI (۲۷ خط)

**مسیر فایل:** `server/utils/aiClient.js`  
**تعداد خطوط:** ۲۷

### ساختار کلی

```javascript
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
```

**تحلیل:**
- **کلید API** از متغیر محیطی خوانده می‌شود. مقدار پیش‌فرض برای دیباگ است (نباید در Production استفاده شود).
- **آدرس API** — OpenRouter یک پروکسی است که به مدل‌های مختلف AI (Gemini, GPT, Claude) دسترسی می‌دهد.

### تابع chatCompletion (خط ۴-۱۹)

```javascript
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
```

**تحلیل جزئی:**

| هدر | مقدار | توضیح |
|-----|-------|-------|
| `Content-Type` | `application/json` | نوع محتوا |
| `Authorization` | `Bearer {key}` | کلید API |
| `HTTP-Referer` | `https://mahfel.app` | آدرس سایت (برای آمار OpenRouter) |
| `X-Title` | `MAHFEL AI` | عنوان اپلیکیشن |

**نکات مهم:**
- **`AbortSignal.timeout(12000)`** — درخواست بعد از ۱۲ ثانیه لغو می‌شود. این از block شدن سرور جلوگیری می‌کند.
- **مدل پیش‌فرض:** `google/gemini-2.0-flash-001` — مدل سریع و ارزان Gemini
- **`maxTokens: 2048`** — حداکثر تعداد توکن‌های خروجی

### تابع generateText (خط ۲۱-۲۷)

```javascript
export async function generateText(prompt, systemInstruction, model = 'google/gemini-2.0-flash-001') {
  const data = await chatCompletion([
    { role: 'system', content: systemInstruction },
    { role: 'user', content: prompt },
  ], model);
  return data?.choices?.[0]?.message?.content || '';
}
```

**تحلیل:** یک تابع ساده‌تر که فقط متن خروجی را برمی‌گرداند (نه کل پاسخ API).

**اتصال به فایل‌های دیگر:**
- `server/routes/admin.js` — برای تولید insights هوشمند (خط ۴۹۰)
- `server/routes/ai.js` — برای چت با AI

---

## corpus.js — مدیریت محتوا برای AI (۱۸۵ خط)

**مسیر فایل:** `server/utils/corpus.js`  
**تعداد خطوط:** ۱۸۵

### هدف

این فایل یک **سیستم جستجوی متنی (Full-Text Search)** ساده بر پایه **TF-IDF** پیاده‌سازی می‌کند. از این سیستم برای **RAG (Retrieval-Augmented Generation)** استفاده می‌شود — یعنی ابتدا محتوای مرتبط از دیتابیس جستجو شده و سپس AI بر اساس آن پاسخ می‌دهد.

### متغیرهای سراسری (خط ۶-۱۳)

```javascript
const REFRESH_TTL = 30 * 60 * 1000;  // ۳۰ دقیقه
const CHUNK_SIZE = 900;               // حداکثر اندازه هر chunk
const CHUNK_OVERLAP = 180;            // همپوشانی بین chunks
const MAX_TEXT_PER_ITEM = 60000;      // حداکثر متن هر آیتم

let cache = null;       // کش ایندکس
let lastBuilt = 0;      // زمان آخرین ساخت
let building = null;    // promise در حال ساخت
```

**تحلیل:** ایندکس به مدت ۳۰ دقیقه کش می‌شود. اگر درخواستی بعد از ۳۰ دقیقه بیاید، ایندکس دوباره ساخته می‌شود.

### تابع normalizePersian (خط ۱۷-۲۳)

```javascript
export function normalizePersian(text) {
  return (text || '')
    .replace(/<[^>]*>/g, ' ')                          // حذف تگ‌های HTML
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')       // حذف نشانه‌های تجویلی
    .replace(/[ظٹظƒط£ط¥ط¢ط©غ€ط¤ط¦]/g, ch => FA_NORMALIZE[ch] || ch) // یکسان‌سازی حروف عربی/فارسی
    .toLowerCase();                                      // تبدیل به حروف کوچک
}
```

**تحلیل:**
- **حذف تگ‌های HTML:** محتوای HTML ممکن است شامل تگ‌های `<p>`, `<div>` و غیره باشد
- **حذف نشانه‌های تجویلی:** کاراکترهایی مثل فتحه، ضمه، کسره که در جستجو اختلال ایجاد می‌کنند
- **یکسان‌سازی حروف:** مثلاً `ك` عربی و `ک` فارسی یکسان شوند
- **تبدیل به حروف کوچک:** جستجو case-insensitive باشد

### تابع tokenize (خط ۲۵-۲۸)

```javascript
export function tokenize(text) {
  const tokens = normalizePersian(text).match(/[\u0600-\u06FF\u0750-\u077F]+/g) || [];
  return tokens.filter(t => t.length >= 2);
}
```

**تحلیل:** متن را به کلمات تقسیم می‌کند. فقط کلمات فارسی/عربی (حداقل ۲ کاراکتر) استخراج می‌شوند.

### تابع chunkText (خط ۳۰-۳۹)

```javascript
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
```

**تحلیل:** متن طولانی را به بخش‌های کوچکتر تقسیم می‌کند. **همپوشانی** باعث می‌شود اطلاعات در مرز بخش‌ها از بین نرود.

**مثال:**
```
متن: "این یک متن آزمایشی است برای تست تقسیم متن"
اندازه: ۱۰ کاراکتر، همپوشانی: ۳ کاراکتر

chunk 1: "این یک متن آ"
chunk 2: "متن آزمایشی " (شامل ۳ کاراکتر آخر chunk 1)
chunk 3: "شی است برای ت"
chunk 4: "تست تقسیم م"
chunk 5: "متن"
```

### تابع buildDocs (خط ۴۱-۸۳)

```javascript
function buildDocs(pbooks, books, podcasts, videos) {
  const docs = [];
  // کتاب‌های منتشر شده
  for (const b of pbooks) {
    const text = [b.title, b.subtitle, b.description, b.tableOfContents, b.contentHtml]
      .filter(Boolean).join('\n').slice(0, MAX_TEXT_PER_ITEM);
    chunkText(text).forEach(part => docs.push({
      kind: 'کتاب', title: b.title, author: b.authorName, text: part,
      meta: { id: String(b._id), type: 'book' },
    }));
  }
  // ... کتاب‌های کتابخانه، پادکست‌ها، ویدیوها
  return docs;
}
```

**تحلیل:** تمام محتوای دیتابیس (کتاب‌ها، پادکست‌ها، ویدیوها) را به اسناد متنی تبدیل می‌کند. هر سند شامل:
- `kind` — نوع محتوا (کتاب، پادکست، ویدیو)
- `title` — عنوان
- `text` — متن (بعد از chunking)
- `meta` — اطلاعات اضافی (شناسه، نوع)

### تابع buildIndex (خط ۸۵-۱۱۰)

```javascript
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
```

**تحلیل:** یک **ایندکس معکوس (Inverted Index)** می‌سازد:
- **`postings`** — برای هر کلمه، لیست اسنادی که آن کلمه را دارند
- **`lengths`** — طول هر سند (برای نرمال‌سازی)
- **`N`** — تعداد کل اسناد

### تابع retrieve (خط ۱۲۷-۱۷۰)

```javascript
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
    return {
      score: Math.round(score * 100) / 100,
      matchRatio: Math.round(matchRatio * 100) / 100,
      kind: doc.kind,
      title: doc.title,
      author: doc.author,
      snippet: doc.text.slice(0, 600),
      meta: doc.meta,
    };
  });
}
```

**تحلیل الگوریتم TF-IDF:**

1. **TF (Term Frequency):** تعداد تکرار هر کلمه در سند
   - `tf = تعداد تکرار کلمه در سند`

2. **IDF (Inverse Document Frequency):** اهمیت کلمه در کل مجموعه
   - `idf = log((N + 1) / (1 + df)) + 1`
   - `df` = تعداد اسنادی که کلمه در آن‌ها وجود دارد

3. **نرمال‌سازی:** تقسیم بر ریشه دوم طول سند
   - `norm = sqrt(طول سند)`

4. **امتیاز نهایی:** مجموع `tf * idf` برای تمام کلمات query

**`matchRatio`:** نسبت کلمات query که در اسناد پیدا شده‌اند. اگر query شامل ۵ کلمه باشد و ۴ تا پیدا شود، `matchRatio = 0.8`.

### تابع ensureIndex (خط ۱۱۲-۱۱۹)

```javascript
export async function ensureIndex() {
  if (cache && Date.now() - lastBuilt < REFRESH_TTL) return cache;
  if (building) return building;
  building = buildIndex()
    .then(idx => { cache = idx; lastBuilt = Date.now(); building = null; return idx; })
    .catch(err => { building = null; throw err; });
  return building;
}
```

**تحلیل:** الگوی **Lazy Initialization** با **Deduplication**:
- اگر ایندکس کش باشد و تازه باشد، همان را برمی‌گرداند
- اگر در حال ساخت باشد، همان promise را برمی‌گرداند (نه اینکه دوباره بسازد)
- اگر نیاز به ساخت داشته باشد، شروع به ساخت می‌کند

---

## broadcast.js — اطلاع‌رسانی WebSocket (۱۹ خط)

**مسیر فایل:** `server/utils/broadcast.js`  
**تعداد خطوط:** ۱۹

```javascript
import http from 'http';

export const broadcast = (event, data) => {
  const payload = JSON.stringify({ event, data });
  const req = http.request({
    host: '127.0.0.1',
    port: 5001,
    path: '/broadcast',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    timeout: 1500,
  }, (res) => {
    res.resume();
  });
  req.on('error', () => {});
  req.on('timeout', () => req.destroy());
  req.end(payload);
};
```

**تحلیل:**

**نحوه عملکرد:**
1. سرور Express یک درخواست HTTP POST به سرور WebSocket (پورت ۵۰۰۱) ارسال می‌کند
2. سرور WebSocket پیام را به تمام کلاینت‌های متصل broadcast می‌کند
3. پاسخ برای سرور Express مهم نیست (fire-and-forget)

**ویژگی‌ها:**
- **`timeout: 1500`** — اگر سرور WebSocket پاسخ ندهد، درخواست بعد از ۱.۵ ثانیه لغو می‌شود
- **`req.on('error', () => {})`** — خطاها نادیده گرفته می‌شوند (سرور نباید به خاطر broadcast متوقف شود)
- **`res.resume()`** — بدنه پاسخ خوانده و دور انداخته می‌شود (برای آزاد کردن اتصال)

**فرمت پیام:**
```json
{
  "event": "data-changed",
  "data": {
    "type": "posts",
    "action": "create",
    "item": { ... }
  }
}
```

**اتصال به فایل‌های دیگر:**
- `server/routes/auth.js` — اطلاع‌رسانی ایجاد/حذف کاربر
- `server/routes/posts.js` — اطلاع‌رسانی ایجاد/ویرایش/حذف پست
- `server/routes/admin.js` — اطلاع‌رسانی تغییرات ادمین
- `server/utils/deleteUserContent.js` — اطلاع‌رسانی حذف محتوا

---

## webpush.js — ارسال Push Notification (۱۷۹ خط)

**مسیر فایل:** `server/utils/webpush.js`  
**تعداد خطوط:** ۱۷۹

### سیستم VAPID (خط ۶-۲۱)

```javascript
let vapidKeys = null;

const getVapidKeys = () => {
  if (vapidKeys) return vapidKeys;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || 'mailto:admin@soha-sima.ir';
  if (pub && priv) {
    vapidKeys = { publicKey: pub, privateKey: priv, subject: sub };
  } else {
    const gen = webpush.generateVAPIDKeys();
    vapidKeys = { publicKey: gen.publicKey, privateKey: gen.privateKey, subject: sub };
  }
  webpush.setVapidDetails(vapidKeys.subject, vapidKeys.publicKey, vapidKeys.privateKey);
  return vapidKeys;
};
```

**تحلیل:**
- **VAPID** (Voluntary Application Server Identification) یک استاندارد برای احراز هویت سرور Push است
- اگر کلیدها در متغیرهای محیطی تنظیم نشده باشند، به صورت خودکار تولید می‌شوند
- کلیدها فقط یک بار تولید شده و کش می‌شوند

### سیستم FCM (خط ۲۵-۹۰)

#### getFcmApp (خط ۲۹-۴۲)

```javascript
const getFcmApp = async () => {
  if (fcmApp) return fcmApp;
  try {
    const path = process.env.FCM_SERVICE_ACCOUNT || '/opt/soha/service-account.json';
    if (!fs.existsSync(path)) return null;
    const admin = (await import('firebase-admin')).default;
    const sa = JSON.parse(fs.readFileSync(path, 'utf8'));
    fcmApp = admin.initializeApp({ credential: admin.credential.cert(sa) });
    return fcmApp;
  } catch (e) {
    console.error('FCM INIT ERROR', e && e.message);
    return null;
  }
};
```

**تحلیل:**
- Firebase Admin SDK به صورت **dynamic import** بارگذاری می‌شود (اگر نصب نباشد، خطا رخ نمی‌دهد)
- فایل Service Account از مسیر مشخص شده خوانده می‌شود
- اپلیکیشن Firebase فقط یک بار مقداردهی اولیه می‌شود (Singleton)

#### sendFcm (خط ۴۵-۶۲)

```javascript
async function sendFcm(tokens, { title, body, url, id = '' }) {
  try {
    const app = await getFcmApp();
    if (!app || !tokens || !tokens.length) return;
    const messaging = app.messaging();
    for (let i = 0; i < tokens.length; i += 500) {
      const chunk = tokens.slice(i, i + 500);
      await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title: title || 'محفل', body: body || '' },
        data: { url: url || '/', id: String(id || '') },
        android: { priority: 'high' },
      });
    }
  } catch (e) {
    console.error('FCM SEND ERROR', e && e.message);
  }
}
```

**تحلیل:**
- **`sendEachForMulticast`** — ارسال همزمان به چندین دستگاه
- **`chunk`** — FCM حداکثر ۵۰۰ توکن در هر درخواست قبول می‌کند
- **`priority: 'high'`** — نوتیفیکیشن فوراً ارسال شود (حتی اگر دستگاه Doze mode باشد)

#### سه تابع ارسال

| تابع | مخاطب | توضیح |
|------|-------|-------|
| `sendFcmToUser` | یک کاربر | توکن‌های FCM یک کاربر خاص |
| `sendFcmToAdmins` | ادمین‌ها | توکن‌های تمام ادمین‌ها |
| `sendFcmToAll` | همه | توکن‌های تمام کاربران |

### توابع ارسال Push (خط ۹۳-۱۷۹)

#### sendWebPushToAll (خط ۹۳-۱۱۸)

```javascript
export async function sendWebPushToAll({ title, body, url, icon = '/logo.png', id = '' }) {
  sendFcmToAll({ title, body, url, id });  // FCM برای اندروید
  try {
    const keys = getVapidKeys();
    const subs = await PushSubscription.find({}).select('endpoint keys userId').limit(2000);
    if (!subs.length) return;

    const payload = JSON.stringify({ title, body, icon, data: { url: url || '/', id } });

    const pruned = [];
    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          payload
        );
      } catch (e) {
        const code = e && e.statusCode;
        if (code === 404 || code === 410) pruned.push(sub._id);
      }
    }));
    if (pruned.length) await PushSubscription.deleteMany({ _id: { $in: pruned } });
  } catch (e) {
    console.error('WEBPUSH SEND ERROR', e && e.message);
  }
}
```

**تحلیل:**
- **دو کانال ارسال:** FCM (اندروید) + Web Push (مرورگر)
- **`limit(2000)`** — حداکثر ۲۰۰۰ اشتراک در هر درخواست
- **`pruned`** — اشتراک‌های منقضی شده (خطای 404 یا 410) حذف می‌شوند
- **Fire-and-forget** — تابع async است اما caller منتظر نمی‌ماند

#### sendWebPushToAdmins (خط ۱۲۱-۱۴۹)

```javascript
export async function sendWebPushToAdmins({ title, body, url, icon = '/logo.png', id = '' }) {
  sendFcmToAdmins({ title, body, url, id });
  try {
    const keys = getVapidKeys();
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    if (!admins.length) return;
    const adminIds = admins.map(a => a._id);
    const subs = await PushSubscription.find({ userId: { $in: adminIds } }).select('endpoint keys userId').limit(500);
    // ...
  }
}
```

**تحلیل:** فقط به اشتراک‌های مرتبط با ادمین‌ها ارسال می‌شود.

#### sendWebPushToUser (خط ۱۵۲-۱۷۷)

```javascript
export async function sendWebPushToUser(userId, { title, body, url, icon = '/logo.png', id = '' }) {
  sendFcmToUser(userId, { title, body, url, id });
  try {
    const keys = getVapidKeys();
    const subs = await PushSubscription.find({ userId }).select('endpoint keys userId').limit(50);
    // ...
  }
}
```

**تحلیل:** فقط به اشتراک‌های یک کاربر خاص ارسال می‌شود.

---

## profanityFilter.js — فیلتر فحش (۱۰۷ خط)

**مسیر فایل:** `server/utils/profanityFilter.js`  
**تعداد خطوط:** ۱۰۷

### لیست کلمات نامناسب (خط ۱-۷۳)

```javascript
const persianProfanity = [
  // === فحش جنسی و رکیک ===
  'کیر', 'کیری', 'کیرخور', 'کیرکلفت', 'کیرکش',
  'کسکش', 'کسکشی', 'کسخل',
  // ... ۷۰+ کلمه فارسی
  
  // === انگلیسی ===
  'fuck', 'fucking', 'fucked', 'fucker', 'motherfucker',
  'shit', 'shitty', 'ass', 'asshole', 'bitch',
  // ... ۳۰+ کلمه انگلیسی
  
  // === ترکی ===
  'amk', 'amına', 'orospu', 'piç', 'pic',
  // ... ۲۰+ کلمه ترکی
  
  // === نژادی ===
  'nigger', 'nigga', 'spic', 'chink',
  
  // === تهدید ===
  'میکشمت', 'کشتار',
];
```

**تحلیل:** لیست شامل ۱۰۰+ کلمه در ۵ دسته:
1. **جنسی و رکیک** — فارسی
2. **خانوادگی** — توهین به خانواده
3. **انگلیسی** — کلمات رکیک انگلیسی
4. **ترکی** — کلمات رکیک ترکی
5. **نژادی و تهدید**

### تابع containsProfanity (خط ۷۵-۱۰۷)

```javascript
export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return { hasProfanity: false, matchedWord: null };
  
  const normalize = (s) => s
    .toLowerCase()
    .replace(/[؟?!.،,؛;\s\-_+=*/\\(){}[\]<>@#$%^&*|~`'"]/g, ' ')
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ی')
    .replace(/ؤ/g, 'و')
    .replace(/ك/g, 'ک')
    .replace(/ي/g, 'ی')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizedText = normalize(text);
  const words = normalizedText.split(' ');

  for (const bad of persianProfanity) {
    const normalizedBad = normalize(bad);
    if (!normalizedBad) continue;
    
    if (normalizedBad.length <= 3) {
      if (words.includes(normalizedBad)) {
        return { hasProfanity: true, matchedWord: bad };
      }
    } else if (normalizedText.includes(normalizedBad)) {
      return { hasProfanity: true, matchedWord: bad };
    }
  }

  return { hasProfanity: false, matchedWord: null };
}
```

**تحلیل:**
- **نرمال‌سازی:** حذف نشانه‌گذاری، یکسان‌سازی حروف عربی/فارسی
- **کلمات کوتاه (≤۳ کاراکتر):** باید دقیقاً با کلمات متن مطابقت داشته باشند
- **کلمات بلند (>۳ کاراکتر):** فقط کافی است در متن وجود داشته باشند ( substring match )

**خروجی:**
```javascript
{ hasProfanity: true, matchedWord: 'کیر' }
// یا
{ hasProfanity: false, matchedWord: null }
```

---

## ipCheck.js — تشخیص IP ایرانی (۶۸ خط)

**مسیر فایل:** `server/utils/ipCheck.js`  
**تعداد خطوط:** ۶۸

### لیست رنج‌های IP ایران (خط ۱-۴۳)

```javascript
const IRANIAN_IP_RANGES = [
  '5.160.', '5.161.', '5.162.', '5.163.', '5.164.', '5.165.', '5.166.', '5.167.',
  '5.202.', '5.203.', '5.204.', '5.205.', '5.206.', '5.207.',
  '31.40.', '31.41.', '31.42.', '31.43.', '31.44.', '31.45.', '31.46.', '31.47.',
  // ... ۴۰+ رنج IP
];
```

**تحلیل:** لیست رنج‌های IP شناخته شده ایران. این لیست ثابت است و ممکن است به‌روز نباشد.

### تابع isIranianIP (خط ۴۵-۵۷)

```javascript
export function isIranianIP(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') return true;
  
  const cleanIP = ip.replace(/^::ffff:/, '');
  
  if (cleanIP.startsWith('192.168.') || cleanIP.startsWith('10.') || cleanIP.startsWith('172.')) return true;
  
  for (const range of IRANIAN_IP_RANGES) {
    if (cleanIP.startsWith(range)) return true;
  }
  
  return false;
}
```

**تحلیل:**
- IP های لوکال (localhost) همیشه `true` برمی‌گردانند
- IP های خصوصی (192.168, 10, 172) همیشه `true` برمی‌گردانند
- بقیه IP ها با لیست رنج‌ها مقایسه می‌شوند

**کاربرد:** در `auth.js` و `posts.js` برای نمایش پیام‌های مخصوص کاربران ایرانی.

### تابع getClientIP (خط ۵۹-۶۸)

```javascript
export function getClientIP(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const firstIP = Array.isArray(xff) ? xff[0] : xff.split(',')[0].trim();
    return firstIP;
  }
  const xri = req.headers['x-real-ip'];
  if (xri) return xri;
  return req.socket?.remoteAddress || req.connection?.remoteAddress || '';
}
```

**تحلیل:** IP واقعی کاربر را از هدرها استخراج می‌کند:
1. `x-forwarded-for` — توسط Nginx اضافه می‌شود (اولین IP واقعی)
2. `x-real-ip` — جایگزین دیگر
3. `remoteAddress` — IP مستقیم اتصال

---

## sms.js — ارسال SMS (۳۸ خط)

**مسیر فایل:** `server/utils/sms.js`  
**تعداد خطوط:** ۳۸

```javascript
const VERIFY_URL = 'https://api.sms.ir/v1/send/verify';

export async function sendOtpSms(mobile, code, name) {
  const API_KEY = process.env.SMSIR_API_KEY || '';
  const TEMPLATE_ID = process.env.SMSIR_TEMPLATE_ID || '';
  if (!API_KEY || !TEMPLATE_ID) {
    console.log(`[SMS-OFF] OTP for ${mobile}: ${code}`);
    return { sent: false, reason: 'no_config' };
  }
  const cleanMobile = String(mobile).replace(/^0/, '');
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        mobile: cleanMobile,
        templateId: Number(TEMPLATE_ID),
        parameters: [
          { name: 'NAME', value: String(name || 'کاربر') },
          { name: 'CODE', value: String(code) },
        ],
      }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data && (data.status === 1 || data.message === ' success')) {
      return { sent: true, data };
    }
    console.error('[SMS-ERROR]', res.status, data);
    return { sent: false, reason: 'api_error', status: res.status, data };
  } catch (err) {
    console.error('[SMS-EXCEPTION]', err.message);
    return { sent: false, reason: 'exception', error: err.message };
  }
}
```

**تحلیل:**
- **سرویس:** SMS.ir — سرویس ارسال پیامک ایرانی
- **حالت توسعه:** اگر کلید API تنظیم نشده باشد، کد OTP در کنسول چاپ می‌شود
- **فرمت شماره:** صفر اول حذف می‌شود (0912... → 912...)
- **پارامترها:** نام کاربر و کد OTP

---

## deleteUserContent.js — حذف محتوای کاربر (۵۹ خط)

**مسیر فایل:** `server/utils/deleteUserContent.js`  
**تعداد خطوط:** ۵۹

```javascript
export async function deleteUserContent(userId) {
  // پست‌های کاربر
  const postDocs = await Post.find({ userId }).select('_id comments');
  const postIds = postDocs.map(p => String(p._id));
  const postCommentIds = [];
  postDocs.forEach(p => (p.comments || []).forEach(c => postCommentIds.push(String(c._id))));
  await Post.deleteMany({ userId });
  if (postIds.length) {
    broadcast('data-changed', { type: 'posts', action: 'ids-delete', ids: postIds });
  }
  try { await Notification.deleteMany({ sourceId: { $in: [...postIds, ...postCommentIds] } }); } catch (ignored) {}

  // کامنت‌های توکار کاربر + ریپلای‌ها
  const affected = await Post.find({ 'comments.userId': userId }).select('_id comments').lean();
  if (affected.length) {
    const myCommentIds = [];
    affected.forEach(p => (p.comments || []).forEach(c => {
      if (c.userId && String(c.userId) === String(userId)) myCommentIds.push(String(c._id));
    }));
    await Post.updateMany({ 'comments.userId': userId }, {
      $pull: { comments: { $or: [{ userId }, { replyTo: { $in: myCommentIds } }] } },
    });
    // ...
  }

  // کامنت‌های مستقل (پادکست/ویدیو/کتاب) + ریپلای‌ها
  const myComments = await Comment.find({ userId }).select('_id').lean();
  const myIds = myComments.map(c => c._id);
  const replyIds = await Comment.find({ parentId: { $in: myIds } }).select('_id').lean();
  // ...
  
  // آثار منتشرشده/یادداشت‌های نویسنده
  const bookIds = (await PublishedBook.find({ authorId: userId }).select('_id')).map(b => String(b._id));
  await PublishedBook.deleteMany({ authorId: userId });
  // ...
  
  // اشتراک‌های push کاربر
  await PushSubscription.deleteMany({ userId }).catch(() => {});
  return { postIds, commentIds, bookIds };
}
```

**تحلیل:** حذف کامل و جامع تمام محتوای یک کاربر:

| مرحله | عملیات |
|-------|--------|
| ۱ | حذف پست‌های کاربر |
| ۲ | حذف نوتیفیکیشن‌های مرتبط با پست‌ها |
| ۳ | حذف نظرات توکار کاربر از پست‌ها |
| ۴ | حذف ریپلای‌هایی که به نظرات کاربر زده شده |
| ۵ | حذف کامنت‌های مستقل کاربر (پادکست/ویدیو/کتاب) |
| ۶ | حذف ریپلای‌های مرتبط |
| ۷ | حذف یادداشت‌های منتشر شده |
| ۸ | حذف اشتراک‌های Push |

**الگو:** این تابع از الگوی **Cascade Delete** استفاده می‌کند — حذف یک کاربر باعث حذف تمام محتوای وابسته می‌شود.

---

## سایر ابزارها

### analyticsEvent.js

```javascript
// ثبت رویدادهای تحلیلی
export async function logEvent(event, refType, refId, refTitle, userId, identifier, meta) {
  await AnalyticsEvent.create({ event, refType, refId, refTitle, userId, identifier, meta });
}
```

**کاربرد:** ثبت رویدادهایی مثل `podcast_play`، `video_view`، `podcast_like`، `video_like`.

---

## الگوهای طراحی و اتصالات

### نمودار اتصالات

```
┌─────────────────────────────────────────────────────┐
│                   Route Handlers                     │
│  auth.js  │  posts.js  │  admin.js  │  ai.js  │ ...│
└─────────┬───────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│                  Utils Layer                         │
│  aiClient.js  │  corpus.js  │  broadcast.js  │ ... │
└────┬────────────┬──────────────┬────────────────────┘
     │            │              │
     ▼            ▼              ▼
┌─────────┐ ┌──────────┐ ┌───────────┐
│OpenRouter│ │ MongoDB  │ │WebSocket  │
│   API    │ │ (Mongoose)│ │ (port 5001)│
└─────────┘ └──────────┘ └───────────┘
```

### الگوهای استفاده شده

| الگو | ابزار | توضیح |
|------|-------|-------|
| **Singleton** | aiClient, webpush | مقداردهی اولیه فقط یک بار |
| **Lazy Loading** | corpus, webpush | بارگذاری در اولین استفاده |
| **Fire-and-forget** | broadcast, webpush | ارسال بدون انتظار پاسخ |
| **Circuit Breaker** | broadcast | اگر سرور WebSocket بالا نباشد، خطا نادیده گرفته می‌شود |
| **Inverted Index** | corpus | جستجوی سریع متنی |
| **TF-IDF** | corpus | رتبه‌بندی اسناد |
| **Chunking** | corpus | تقسیم متن طولانی |
| **Pruning** | webpush | حذف اشتراک‌های منقضی |
| **Cascade Delete** | deleteUserContent | حذف وابسته |

---

**تعداد کل خطوط ابزارها:** ~۶۰۰ خط  
**تعداد توابع عمومی:** ۳۰+ تابع  
**تعداد وابستگی‌ها:** ۱۵+ ماژول خارجی
