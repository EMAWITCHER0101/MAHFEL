# بخش ۶: مسیرهای API — تحلیل کامل routes

**مسیر فایل‌ها:** `server/routes/auth.js` (506 خط)، `server/routes/posts.js` (373 خط)، `server/routes/admin.js` (1083 خط)  
**هدف:** تحلیل جزئی تمام endpoint های احراز هویت، پست‌ها و پنل مدیریت

---

## فهرست مطالب

1. [مقدمه](#مقدمه)
2. [تحلیل auth.js — سیستم احراز هویت](#تحلیل-authjs-سیستم-احراز-هویت)
   - [متغیرهای سراسری و توابع کمکی](#متغیرهای-سراسری-و-توابع-کمکی)
   - [POST /register](#post-register)
   - [POST /login](#post-login)
   - [POST /send-otp](#post-send-otp)
   - [POST /verify-otp](#post-verify-otp)
   - [POST /complete-profile](#post-complete-profile)
   - [POST /interests](#post-interests)
   - [GET /me](#get-me)
   - [DELETE /me](#delete-me)
   - [PUT /library](#put-library)
   - [PUT /profile](#put-profile)
   - [PUT /muted](#put-muted)
   - [POST /reset-password](#post-reset-password)
3. [تحلیل posts.js — سیستم پست‌ها](#تحلیل-postsjs-سیستم-پست‌ها)
   - [GET /](#get-)
   - [GET /:id](#get-id)
   - [POST /](#post--1)
   - [PUT /:id](#put-id)
   - [DELETE /:id](#delete-id)
   - [POST /:id/like](#post-idlike)
   - [DELETE /:id/comments/:commentId](#delete-idcommentscommentid)
   - [PUT /:id/comments/:commentId](#put-idcommentscommentid)
   - [POST /:id/comments](#post-idcomments)
4. [تحلیل admin.js (خط ۱ تا ۴۰۰) — پنل مدیریت](#تحلیل-adminjs-خط-۱-تا-۴۰۰-پنل-مدیریت)
   - [میانبرهای middleware](#میانبرهای-middleware)
   - [GET /stats](#get-stats)
   - [GET /analytics](#get-analytics)
   - [GET /analytics/segments](#get-analyticssegments)
   - [GET /insights](#get-insights)
5. [الگوهای طراحی و اتصالات](#الگوهای-طراحی-و-اتصالات)

---

## مقدمه

مسیرهای API در پروژه محفل به صورت **ماژولار** طراحی شده‌اند. هر فایل در پوشه `server/routes/` یک `Router` Express مستقل دارد که مسئول یک حوزه تجاری خاص است. در این بخش سه فایل اصلی را تحلیل می‌کنیم:

1. **auth.js** — سیستم احراز هویت شامل OTP، ثبت‌نام، ورود، بازیابی رمز عبور
2. **posts.js** — سیستم پست‌های جامعه شامل CRUD، نظرات، لایک و فیلتر فحش
3. **admin.js** — پنل مدیریت شامل آمار، تحلیل و بینش‌های هوشمند

---

## تحلیل auth.js — سیستم احراز هویت

### متغیرهای سراسری و توابع کمکی

#### فروشگاه OTP (خط ۱۴-۱۵)

```javascript
const otpStore = new Map();
const otpProofStore = new Map();
```

**تحلیل:** دو `Map` حافظه‌ای برای ذخیره موقت کدهای OTP:
- **`otpStore`** — کدهای OTP ارسال شده (کلید: شماره موبایل)
- **`otpProofStore`** — توکن‌های اثبات بعد از تأیید OTP (کلید: توکن تصادفی)

**نکته مهم:** این فروشگاه‌ها در حافظه RAM ذخیره می‌شوند. اگر سرور ریستارت شود، تمام کدها از بین می‌روند. برای تولید، Redis یا MongoDB مناسب‌تر است.

#### تابع تولید OTP (خط ۱۷-۱۹)

```javascript
function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}
```

**تحلیل:** یک عدد ۴ رقمی تصادفی (بین ۱۰۰۰ تا ۹۹۹۹) تولید می‌کند. از `Math.random()` استفاده شده که کاملاً تصادفی نیست اما برای OTP کافی است.

#### تابع پاکسازی OTP منقضی شده (خط ۲۱-۲۹)

```javascript
function cleanExpiredOtps() {
  const now = Date.now();
  for (const [phone, entry] of otpStore) {
    if (entry.expiresAt < now) otpStore.delete(phone);
  }
  for (const [token, entry] of otpProofStore) {
    if (entry.expiresAt < now) otpProofStore.delete(token);
  }
}
```

**تحلیل:** قبل از هر عملیات OTP، OTP های منقضی شده از حافظه پاک می‌شوند. این کار از مصرف حافظه جلوگیری می‌کند.

#### تابع تولید توکن اثبات (خط ۳۱-۳۵)

```javascript
function genProofToken(phone, purpose) {
  const token = crypto.randomBytes(24).toString('hex');
  otpProofStore.set(token, { phone, purpose, expiresAt: Date.now() + 10 * 60 * 1000 });
  return token;
}
```

**تحلیل:** بعد از تأیید موفق OTP، یک توکن اثبات تولید می‌شود. این توکن ۴۸ کاراکتر hex است و ۱۰ دقیقه اعتبار دارد. **هدف:** جداسازی مرحله تأیید OTP از مرحله ثبت‌نام/بازیابی رمز. کلاینت ابتدا OTP را تأیید کرده و توکن اثبات دریافت می‌کند، سپس با این توکن عملیات اصلی را انجام می‌دهد.

#### تابع انتشار پروفایل (خط ۳۷-۵۳)

```javascript
async function propagateProfileToContent(userId, oldName, newName, newAvatar) {
  const sets = { author: newName, authorAvatarUrl: newAvatar };
  await Comment.updateMany({ userId }, { $set: sets });
  await Comment.updateMany({ author: oldName, userId: { $exists: false } }, { $set: sets });
  await Post.updateMany({ userId }, { $set: sets });
  await Post.updateMany({ author: oldName, userId: { $exists: false } }, { $set: sets });
  await Post.updateMany(
    { 'comments.userId': userId },
    { $set: { 'comments.$[c].author': newName, 'comments.$[c].authorAvatarUrl': newAvatar } },
    { arrayFilters: [{ 'c.userId': userId }] }
  );
  await Post.updateMany(
    { 'comments.author': oldName, 'comments.userId': { $exists: false } },
    { $set: { 'comments.$[c].author': newName, 'comments.$[c].authorAvatarUrl': newAvatar } },
    { arrayFilters: [{ 'c.author': oldName, 'c.userId': { $exists: false }] }] }
  );
}
```

**تحلیل:** وقتی کاربر نام یا آواتار خود را تغییر می‌دهد، تمام پست‌ها و نظراتی که با نام قبلی او ثبت شده‌اند، به‌روزرسانی می‌شوند. این از **الگوی Denormalization** استفاده می‌کند — یعنی نام کاربر مستقیماً در پست‌ها ذخیره شده (نه فقط به صورت reference)، بنابراین برای نمایش لیست پست‌ها نیازی به JOIN نیست.

#### تابع تولید آواتار پیش‌فرض (خط ۲۱۴-۲۲۶)

```javascript
function generateDefaultAvatar(name) {
  const safeName = (name && name.trim()) || 'ک';
  const initials = safeName.charAt(0) || 'ک';
  const colors = [
    ['#f59e0b', '#d97706'], ['#10b981', '#059669'], ['#3b82f6', '#2563eb'],
    ['#8b5cf6', '#7c3aed'], ['#ef4444', '#dc2626'], ['#ec4899', '#db2777'],
    ['#06b6d4', '#0891b2'], ['#14b8a6', '#0d9488'],
  ];
  const idx = (safeName.charCodeAt(0) || 0) % colors.length;
  const [c1, c2] = colors[idx] || ['#3b82f6', '#2563eb'];
  return `data:image/svg+xml,${encodeURIComponent(`<svg ...>...</svg>`)}`;
}
```

**تحلیل:** اگر کاربر آواتار نداشته باشد، یک آواتار SVG تصادفی بر اساس حرف اول نامش تولید می‌شود. هر حرف یک رنگ گرادیانت متفاوت دارد.

---

### POST /register (خط ۵۵-۱۲۱)

**مسیر:** `POST /api/auth/register`  
**بدنه درخواست:** `{ name, email, password, phoneNumber, otpToken }`

**جریان اجرا:**

```
۱. اعتبارسنجی فیلدها (نام، رمز عبور، شماره موبایل)
۲. بررسی وجود otpToken
۳. جستجوی توکن اثبات در otpProofStore
۴. بررسی تطابق شماره موبایل و هدف (purpose)
۵. حذف توکن اثبات از فروشگاه (مصرف یکبار)
۶. بررسی تکراری نبودن ایمیل و شماره موبایل
۷. ساخت کاربر جدید با آواتار پیش‌فرض
۸. ذخیره در دیتابیس
۹. اطلاع‌رسانی لحظه‌ای از طریق WebSocket
۱۰. تولید JWT و ارسال پاسخ
```

**نکات امنیتی:**
- **otpToken اجباری:** بدون تأیید OTP نمی‌توان ثبت‌نام کرد
- **بررسی تکراری:** شماره موبایل و ایمیل باید یکتا باشند
- **رمز عبور حداقل ۴ کاراکتر**

---

### POST /login (خط ۱۲۳-۱۶۷)

**مسیر:** `POST /api/auth/login`  
**بدنه درخواست:** `{ email, phoneNumber, password }`

**جریان اجرا:**

```
۱. بررسی وجود رمز عبور
۲. بررسی وجود ایمیل یا شماره موبایل
۳. جستجوی کاربر بر اساس ایمیل یا شماره موبایل
۴. بررسی وجود رمز عبور (ممکن است کاربر فقط با OTP ثبت‌نام کرده باشد)
۵. بررسی وضعیت بن (banned)
۶. مقایسه رمز عبور با bcrypt
۷. تولید JWT
۸. تشخیص IP ایرانی
۹. ارسال پاسخ با اطلاعات کاربر
```

**پاسخ شامل:** `token`، `isIranianIP`، اطلاعات کاربر شامل `warnings`، `muted`، `mutedUntil`

---

### POST /send-otp (خط ۱۶۹-۲۱۲)

**مسیر:** `POST /api/auth/send-otp`  
**بدنه درخواست:** `{ phoneNumber, purpose, name }`

**جریان اجرا:**

```
۱. پاکسازی OTP های منقضی
۲. اعتبارسنجی شماره موبایل (فرمت 09XXXXXXXXX)
۳. بررسی هدف (purpose):
   - register: بررسی تکراری نبودن شماره
   - forgot: بررسی وجود حساب با این شماره
۴. بررسی cooldown (۶۰ ثانیه بین هر ارسال)
۵. تولید کد ۴ رقمی
۶. ذخیره در otpStore با انقضای ۱۲۰ ثانیه
۷. ارسال SMS از طریق سرویس SMS.ir
۸. ارسال پاسخ
```

**سیستم Cooldown:** بعد از هر ارسال، کاربر باید ۶۰ ثانیه صبر کند. اگر زودتر درخواست دهد، پیام خطا با زمان باقیمانده نمایش داده می‌شود.

---

### POST /verify-otp (خط ۲۲۸-۳۰۸)

**مسیر:** `POST /api/auth/verify-otp`  
**بدنه درخواست:** `{ phoneNumber, otp, purpose }`

**ویژگی خاص — Dev Bypass:**
```javascript
const isDevBypass = !process.env.SMSIR_API_KEY && String(otp) === '0000';
```

اگر کلید API SMS تنظیم نشده باشد، کد `0000` همیشه معتبر است. این برای محیط توسعه مفید است.

**جریان اجرا:**

```
۱. پاکسازی OTP های منقضی
۲. اعتبارسنجی شماره موبایل و کد OTP
۳. بررسی Dev Bypass
۴. بررسی وجود OTP ذخیره شده
۵. بررسی انقضا (۱۲۰ ثانیه)
۶. بررسی تطابق هدف (purpose)
۷. بررسی تعداد تلاش (حداکثر ۵ بار)
۸. حذف OTP از فروشگاه
۹. بسته به purpose:
   - register: تولید proofToken
   - forgot: تولید proofToken
   - بدون purpose: ورود مستقیم (OTP Login)
```

**OTP Login (بدون purpose):** اگر کاربر قبلاً ثبت‌نام کرده و با OTP وارد شود، حساب جدیدی ساخته نمی‌شود. اگر حسابی با آن شماره وجود نداشته باشد، به صورت خودکار ساخته می‌شود (با نام خالی).

---

### POST /complete-profile (خط ۳۱۰-۳۵۱)

**مسیر:** `POST /api/auth/complete-profile`  
**نیاز به احراز هویت:** بله (`requireAuth`)  
**بدنه درخواست:** `{ name, avatar, role, securityKey }`

**تحلیل:** این endpoint برای تکمیل پروفایل کاربرانی است که با OTP ثبت‌نام کرده‌اند و هنوز نام ندارند. همچنین برای تغییر نقش (به admin یا author) با نیاز به رمز امنیتی استفاده می‌شود.

**بررسی رمز امنیتی:**
- اگر نقش `admin` باشد → رمز از متغیر محیطی `ADMIN_SECURITY_KEY` (پیش‌فرض: `admin123`)
- اگر نقش `author` باشد → رمز از متغیر محیطی `AUTHOR_SECURITY_KEY` (پیش‌فرض: `1234`)

---

### GET /me (خط ۳۶۴-۳۸۵)

**مسیر:** `GET /api/auth/me`  
**نیاز به احراز هویت:** بله

**پاسخ:**
```json
{
  "isIranianIP": true,
  "user": {
    "id": "...",
    "email": "...",
    "phoneNumber": "...",
    "name": "...",
    "avatar": "...",
    "role": "user",
    "interests": [],
    "library": { ... },
    "warnings": 0,
    "banned": false,
    "muted": false,
    "mutedUntil": null,
    "mutedReason": ""
  }
}
```

**تحلیل:** این endpoint هر بار که کاربر اپلیکیشن را باز می‌کند فراخوانی می‌شود. اطلاعات کامل کاربر شامل وضعیت بن، سکوت و اخطارها را برمی‌گرداند.

---

### PUT /profile (خط ۴۱۰-۴۳۶)

**مسیر:** `PUT /api/auth/profile`  
**نیاز به احراز هویت:** بله  
**بدنه درخواست:** `{ name, avatar }`

**تحلیل:** بعد از ذخیره تغییرات، تابع `propagateProfileToContent` فراخوانی می‌شود تا نام و آواتار جدید در تمام پست‌ها و نظرات کاربر اعمال شود. این از الگوی **Eventual Consistency** استفاده می‌کند — یعنی تغییرات بلافاصله اعمال می‌شوند اما ممکن است در لحظه اول همه پست‌ها به‌روز نباشند.

---

### POST /reset-password (خط ۴۵۶-۵۰۴)

**مسیر:** `POST /api/auth/reset-password`  
**بدنه درخواست:** `{ phoneNumber, otpToken, newPassword }`

**جریان بازیابی رمز عبور:**

```
۱. کاربر درخواست OTP با purpose='forgot' می‌دهد
۲. کد OTP دریافت و تأیید می‌کند → proofToken دریافت می‌کند
۳. درخواست reset-password با proofToken ارسال می‌کند
۴. سرور proofToken را بررسی و رمز جدید ذخیره می‌کند
۵. JWT جدید صادر می‌شود (توکن قبلی منقضی نمی‌شود)
```

---

## تحلیل posts.js — سیستم پست‌ها

### متغیرها و توابع کمکی

#### بررسی وضعیت چت (خط ۱۳-۲۰)

```javascript
async function isChatClosed() {
  try {
    const doc = await Setting.findOne({ key: 'community_chat' });
    return doc?.value?.chatEnabled === false;
  } catch {
    return false;
  }
}
```

**تحلیل:** اگر ادمین چت محفل را بسته باشد، کاربران عادی نمی‌توانند پست یا نظر جدید ارسال کنند.

#### اطلاع‌رسانی به ادمین‌ها (خط ۲۲-۳۷)

```javascript
async function notifyAdminsOfCommunityMessage(name, text, kind, sourceId) {
  try {
    const snippet = String(text || '').slice(0, 60);
    const notif = await Notification.create({
      title: kind === 'post' ? '💬 پیام جدید در محفل' : '💬 نظر جدید در محفل',
      body: `${name}${snippet ? ' — ' + snippet : ''}`,
      type: 'admin',
      target: 'admins',
      sourceId: sourceId || null,
      link: '',
    });
    await sendWebPushToAdmins({ title: notif.title, body: notif.body, url: '/mahfel', id: String(notif._id) });
  } catch (e) {
    console.error('COMMUNITY MSG NOTIFY ERROR', e);
  }
}
```

**تحلیل:** وقتی کاربر عادی پست یا نظر جدید ارسال می‌کند، به ادمین‌ها نوتیفیکیشن push ارسال می‌شود. این از طریق دو کانال انجام می‌شود:
1. **نوتیفیکیشن دیتابیس** — در کالک션 `notifications` ذخیره می‌شود
2. **Web Push** — از طریق FCM و Web Push به دستگاه‌های ادمین‌ها ارسال می‌شود

---

### GET / — دریافت لیست پست‌ها (خط ۳۹-۸۲)

**مسیر:** `GET /api/posts`  
**پارامترها:** `sort` (پیش‌فرض: `-isoDate`)، `limit` (پیش‌فرض: 50)، `skip` (پیش‌فرض: 0)

**جریان اجرا:**

```
۱. دریافت پست‌ها از دیتابیس با مرتب‌سازی و صفحه‌بندی
۲. جمع‌آوری تمام نام‌های نویسندگان از پست‌ها و نظرات
۳. جستجوی کاربران بر اساس نام (برای دریافت آواتار)
۴. ساخت avatarMap برای دسترسی سریع به آواتار بر اساس نام
۵. به‌روزرسانی نام و آواتار نویسندگان و نظردهندگان
۶. ارسال پاسخ
```

**نکته مهم:** این endpoint از الگوی **Denormalized Read** استفاده می‌کند. یعنی نام و آواتار نویسنده مستقیماً در پست ذخیره شده اما در زمان خواندن، با اطلاعات به‌روز کاربر ترکیب می‌شود. این کاری بین **Normalization** و **Denormalization** است.

---

### POST / — ایجاد پست جدید (خط ۹۴-۱۴۵)

**مسیر:** `POST /api/posts`  
**نیاز به احراز هویت:** بله  
**بدنه درخواست:** `{ text, media, videoId, podcastId, episodeIndex, bookId, author, authorAvatarUrl }`

**جریان اجرا:**

```
۱. بررسی وضعیت بن کاربر
۲. بررسی وضعیت سکوت کاربر
۳. بررسی بسته بودن چت (فقط ادمین می‌تواند پست بفرستد)
۴. فیلتر فحش (profanity filter)
۵. بررسی وضعیت Brand Mode (ادمین با نام برند)
۶. ساخت پست جدید با اطلاعات کاربر
۷. ذخیره در دیتابیس
۸. اطلاع‌رسانی WebSocket
۹. اطلاع‌رسانی به ادمین‌ها (فقط برای کاربران عادی)
۱۰. ارسال پاسخ 201
```

**سیستم فیلتر فحش (خط ۱۰۷-۱۱۸):**

```javascript
if (body.text) {
  const check = containsProfanity(body.text);
  if (check.hasProfanity) {
    req.user.warnings = (req.user.warnings || 0) + 1;
    if (req.user.warnings >= 3) {
      req.user.banned = true;
      await req.user.save();
      return res.status(403).json({ error: 'شما به دلیل ۳ بار تخلف از سایت اخراج شدید.', banned: true });
    }
    await req.user.save();
    return res.status(400).json({ error: `متن شما نامناسب است. اخطار ${req.user.warnings} از ۳` });
  }
}
```

**سیستم اخطار و بن:**
- هر بار استفاده از کلمات نامناسب → ۱ اخطار
- ۳ اخطار → بن دائمی
- اخطارها در مدل `User.warnings` ذخیره می‌شوند

**Brand Mode (خط ۱۲۲-۱۲۳):**
```javascript
const isBrandMode = req.user.role === 'admin' && body.author === 'سرای هنر و اندیشه';
```

اگر ادمین نام نویسنده را `سرای هنر و اندیشه` تنظیم کند، پست با آواتار برند منتشر می‌شود (نه آواتار شخصی ادمین).

---

### DELETE /:id — حذف پست (خط ۱۸۳-۱۹۸)

**جریان اجرا:**

```
۱. جستجوی پست
۲. بررسی مالکیت (نویسنده یا ادمین)
۳. جمع‌آوری آیدی نظرات پست
۴. حذف پست از دیتابیس
۵. حذف نوتیفیکیشن‌های مرتبط
۶. اطلاع‌رسانی WebSocket
```

---

### سیستم نظرات توکار (Embedded Comments)

#### POST /:id/comments (خط ۲۸۸-۳۷۱)

**تحلیل:** نظرات در پست‌ها به صورت **Embedded** ذخیره می‌شوند (آرایه‌ای از اسناد درون سند پست). این الگو برای پست‌های اجتماعی مناسب است چون:

- معمولاً تعداد نظرات هر پست محدود است
- خواندن یک پست با تمام نظراتش فقط یک عملیات دیتابیس می‌خواهد
- نیازی به JOIN نیست

**جریان اضافه کردن نظر:**

```
۱. بررسی وضعیت بن/سکوت
۲. فیلتر فحش
۳. ساخت شیء نظر با اطلاعات کاربر
۴. اضافه کردن به آرایه comments پست
۵. ذخیره پست
۶. اطلاع‌رسانی WebSocket
۷. اطلاع‌رسانی به ادمین‌ها
۸. اطلاع‌رسانی پاسخ (اگر ریپلای باشد)
```

#### سیستم ریپلای (خط ۳۴۸-۳۶۵)

```javascript
if (comment.replyTo && req.user) {
  const parent = post.comments.find(c =>
    c._id && (String(c._id) === String(comment.replyTo) || String(c.id || '') === String(comment.replyTo)));
  if (parent && parent.userId && String(parent.userId) !== String(req.user._id)) {
    const replyNotif = await Notification.create({
      title: '💬 پاسخ جدید',
      body: `${req.user.name} به نظر شما پاسخ داد`,
      userId: parent.userId,
      link: `/mahfel/post/${req.params.id}`,
      type: 'reply',
      target: 'user',
      sourceId: comment._id,
    });
    await sendWebPushToUser(parent.userId, { ... });
  }
}
```

**تحلیل:** اگر نظر جدید یک ریپلای باشد، به صاحب نظر اصلی نوتیفیکیشن ارسال می‌شود. این نوتیفیکیشن هم در دیتابیس ذخیره می‌شود و هم از طریق Web Push ارسال می‌شود.

#### حذف نظر با ریپلای‌ها (خط ۲۱۰-۲۴۳)

```javascript
const deleteReplies = (parentId) => {
  const replies = post.comments.filter(c => c.replyTo === parentId);
  replies.forEach(r => {
    deleteReplies(getCommentId(r));
    post.comments.pull(r._id);
    deletedIds.push(getCommentId(r));
  });
};
deleteReplies(req.params.commentId);
```

**تحلیل:** وقتی یک نظر حذف می‌شود، تمام ریپلای‌های آن نیز به صورت **بازگشتی (recursive)** حذف می‌شوند.

---

## تحلیل admin.js (خط ۱ تا ۴۰۰) — پنل مدیریت

### میانبرهای middleware (خط ۱۹)

```javascript
router.use(requireAuth, requireRole('admin', 'superadmin'));
```

**تحلیل:** تمام مسیرهای admin فقط با نقش `admin` یا `superadmin` قابل دسترسی هستند. این middleware در سطح Router اعمال شده، بنابراین نیازی به تکرار در هر endpoint نیست.

### Helper Functions (خط ۲۱-۴۶)

#### `periodRange` — محاسبه بازه زمانی

```javascript
function periodRange(period = '7d') {
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
  const since = new Date(Date.now() - days * DAY);
  const prevSince = new Date(since.getTime() - days * DAY);
  return { days, since, prevSince };
}
```

**تحلیل:** برای مقایسه بازه فعلی با بازه قبلی استفاده می‌شود. مثال: اگر period برابر `7d` باشد، `since` برابر ۷ روز پیش و `prevSince` برابر ۱۴ روز پیش است.

#### `pctChange` — محاسبه درصد تغییر

```javascript
function pctChange(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
```

**تحلیل:** درصد تغییر بین دو مقدار را محاسبه می‌کند. اگر مقدار قبلی صفر باشد و مقدار فعلی مثبت، ۱۰۰٪ برمی‌گرداند.

---

### GET /stats — آمار کلی (خط ۴۸-۱۱۸)

**مسیر:** `GET /api/admin/stats`  
**نیاز به احراز هویت:** admin/superadmin

**تحلیل تفصیلی:** این endpoint یکی از سنگین‌ترین endpoint هاست و اطلاعات جامعی درباره وضعیت کل پلتفرم ارائه می‌دهد.

**عملیات‌های دیتابیس (Parallel):**

```javascript
const [users, videos, posts, comments, podcasts, authors, books, publishedBooks, publishedNotes] = await Promise.all([
  User.countDocuments(), Video.countDocuments(), Post.countDocuments(), Comment.countDocuments(),
  Podcast.countDocuments(), Author.countDocuments(), Book.countDocuments(),
  PublishedBook.countDocuments({ type: 'book' }),
  PublishedBook.countDocuments({ type: 'note' }),
]);
```

**تحلیل:** تمام شمارش‌ها به صورت موازی با `Promise.all` انجام می‌شوند تا سرعت بالا برود.

**آمارهای محاسبه شده:**

| آمار | توضیح |
|------|-------|
| `users` | تعداد کل کاربران |
| `videos` | تعداد کل ویدیوها |
| `posts` | تعداد کل پست‌ها |
| `comments` | تعداد کل نظرات |
| `podcasts` | تعداد کل پادکست‌ها |
| `authors` | تعداد کل نویسندگان |
| `books` | تعداد کل کتاب‌ها |
| `publishedBooks` | تعداد کتاب‌های منتشر شده |
| `publishedNotes` | تعداد یادداشت‌ها |
| `recentUsers` | ۵ کاربر اخیر |
| `recentPosts` | ۵ پست اخیر |
| `roleStats` | توزیع نقش‌ها (user/author/admin) |
| `commentsByType` | توزیع نظرات بر اساس نوع (podcast/video/book) |
| `totalLikes` | مجموع لایک‌ها |
| `popularPodcasts` | ۸ پادکست محبوب |
| `popularVideos` | ۵ ویدیوی محبوب |
| `dailyUsers` | کاربران جدید روزانه (۳۰ روز) |
| `dailyPosts` | پست‌های جدید روزانه (۳۰ روز) |
| `dailyPlays` | پخش‌های روزانه (۱۴ روز) |
| `dailyPlaysByType` | پخش‌های روزانه بر اساس نوع |
| `eventBreakdown` | توزیع رویدادها (۳۰ روز) |

---

### GET /analytics — تحلیل تفصیلی (خط ۱۲۰-۲۳۵)

**مسیر:** `GET /api/admin/analytics?period=7d|30d|90d`

**تحلیل تفصیلی:** این endpoint اطلاعات تحلیلی پیشرفته‌تری نسبت به stats ارائه می‌دهد.

**آمارهای مقایسه‌ای:**
```javascript
const [newUsers, newPosts, newComments, prevNewUsers, prevNewPosts, prevNewComments] = await Promise.all([
  User.countDocuments({ createdAt: { $gte: since } }),
  Post.countDocuments({ createdAt: { $gte: since } }),
  Comment.countDocuments({ createdAt: { $gte: since } }),
  User.countDocuments({ createdAt: { $gte: prevSince, $lt: since } }),
  Post.countDocuments({ createdAt: { $gte: prevSince, $lt: since } }),
  Comment.countDocuments({ createdAt: { $gte: prevSince, $lt: since } }),
]);
```

**تحلیل:** مقایسه بازه فعلی با بازه قبلی برای محاسبه رشد. مثلاً اگر period برابر `7d` باشد، کاربران جدید این هفته با کاربران هفته قبل مقایسه می‌شوند.

**لیست‌های رتبه‌بندی شده:**
- `topAuthors` — ۱۰ نویسنده فعال (بر اساس تعداد پست)
- `topCommenters` — ۱۰ نظردهنده فعال
- `postsWithMostComments` — ۱۰ پست با بیشترین نظر
- `topPodcasts` — ۱۰ پادکست پخش شده
- `topVideos` — ۱۰ ویدیوی مشاهده شده
- `topCategories` — ۱۰ دسته‌بندی محبوب

**تحلیل ساعتی و روزانه:**
- `hourlyActivity` — فعالیت بر اساس ساعت روز
- `peakHours` — ساعت‌های پیک فعالیت
- `weekdayActivity` — فعالیت بر اساس روز هفته
- `weeklyHeatmap` — نقشه حرارتی هفتگی (روز × ساعت)

---

### GET /analytics/segments — تحلیل بخش‌ها (خط ۲۸۱-۳۷۳)

**مسیر:** `GET /api/admin/analytics/segments?period=7d`

**تحلیل:** این endpoint تحلیل‌ها را به سه بخش اصلی تقسیم می‌کند:

#### ۱. بخش صوتی (Audio)
```javascript
const audioPlays = await segmentEventData('podcast_play', since, { withCovers: true });
```
- تعداد پخش‌ها و درصد رشد
- لایک‌ها و درصد رشد
- نمودار روزانه
- نقشه حرارتی
- ۵ پادکست برتر (با کاور)

#### ۲. بخش ویدیویی (Video)
```javascript
const videoViews = await segmentEventData('video_view', since);
```
- تعداد بازدیدها و درصد رشد
- لایک‌ها و درصد رشد
- نمودار روزانه
- نقشه حرارتی
- ۵ ویدیوی برتر

#### ۳. بخش جامعه (Community)
- کاربران جدید و رشد
- پست‌های جدید و رشد
- نظرات جدید و رشد
- ۵ نویسنده برتر
- ۵ نظردهنده برتر

**تابع `segmentEventData` (خط ۲۴۰-۲۷۹):**

```javascript
async function segmentEventData(event, since, { withCovers = false } = {}) {
  const prevSince = new Date(since.getTime() - (Date.now() - since.getTime()));
  const [total, prev, daily, hours, heatmap, topAgg] = await Promise.all([
    AnalyticsEvent.countDocuments({ event, createdAt: { $gte: since } }),
    AnalyticsEvent.countDocuments({ event, createdAt: { $gte: prevSince, $lt: since } }),
    // ... aggregation queries
  ]);
  return {
    total, growth: pctChange(total, prev),
    daily: daily.map(d => ({ date: d._id, count: d.count })),
    hours: hours.map(h => ({ hour: h._id, count: h.count })),
    heatmap: heatmap.map(h => ({ day: h._id.day, hour: h._id.hour, count: h.count })),
    top,
  };
}
```

**تحلیل:** این تابع یک تحلیل کامل برای یک نوع رویداد خاص (مثلاً `podcast_play`) انجام می‌دهد. از `AnalyticsEvent` collection استفاده می‌کند که تمام رویدادهای کاربران را ثبت می‌کند.

---

### GET /insights — بینش‌های هوشمند (خط ۳۷۹-۵۰۰)

**مسیر:** `GET /api/admin/insights?period=7d`

**ویژگی خاص — Cache:**
```javascript
const insightsCache = new Map();
const INSIGHTS_TTL = 5 * 60 * 1000; // ۵ دقیقه

const cached = insightsCache.get(key);
if (cached && Date.now() - cached.at < INSIGHTS_TTL) {
  return res.json({ ...cached.payload, cached: true });
}
```

**تحلیل:** نتایج insights به مدت ۵ دقیقه کش می‌شوند چون محاسبه آن‌ها سنگین است و نیاز به اجرای چندین query دارد.

**سیستم بینش‌های هوشمند:**

```
۱. جمع‌آوری آمار پایه (کاربران، پست‌ها، نظرات، پخش‌ها)
۲. محاسبه درصد رشد
۳. تولید بینش‌ها بر اساس قوانین:
   - رشد بازدید ≥ 15% → موفقیت
   - ریزش بازدید ≤ -15% → خطر
   - ثبات بازدید → اطلاعات
   - رشد کاربران → موفقیت
   - عدم ثبت‌نام → هشدار
   - محتوای داغ → موفقیت
   - ساعت طلایی → اطلاعات
   - روز پرترافیک → اطلاعات
   - ویدیوها بدون پخش → هشدار
   - ویدیو پیشتاز → اطلاعات
   - پادکست پیشتاز → اطلاعات
   - محتوای راکد → هشدار
   - تعامل کاربران → اطلاعات
   - پیشنهاد اقدام → اطلاعات
```

**تحلیل هوشمند با LLM (خط ۴۷۹-۴۹۴):**

```javascript
const prompt = `بر اساس داده‌های زیر یک تحلیل هوشمند فارسی (حداکثر ۸۰ کلمه) برای مدیر یک پلتفرم محتوا بنویس...`;
const raw = await generateText(prompt, 'شما یک تحلیلگر داده و دیتاساینس فارسی هستید...');
if (raw && raw.trim().length > 20) narrative = raw.trim();
```

**تحلیل:** بعد از تولید بینش‌های خودکار، یک پیام خلاصه توسط **هوش مصنوعی (Gemini)** تولید می‌شود. این پیام شامل تحلیل کلی، قوت‌ها، هشدارها و یک پیشنهاد عملی است.

**نکته:** اگر AI خطا دهد، خطا نادیده گرفته می‌شود و فقط بینش‌های خودکار نمایش داده می‌شوند.

---

## الگوهای طراحی و اتصالات

### الگوهای استفاده شده

| الگو | توضیح | نمونه |
|------|-------|-------|
| **Middleware Composition** | ترکیب چند middleware | `router.use(requireAuth, requireRole('admin'))` |
| **Embedded Comments** | نظرات توکار در پست | `comments: [postCommentSchema]` |
| **Denormalized Read** | ذخیره نام نویسنده در پست | `author: req.user.name` |
| **Optimistic UI Update** | اطلاع‌رسانی فوری | `broadcast('data-changed', ...)` |
| **Proof Token Pattern** | جداسازی مراحل OTP | `genProofToken` → `otpProofStore` |
| **Profanity Auto-ban** | بن خودکار بعد از ۳ اخطار | `req.user.warnings >= 3` |

### اتصال به فایل‌های دیگر

| فایل | اتصال |
|------|-------|
| `middleware/auth.js` | `requireAuth`, `requireRole`, `generateToken` |
| `models/User.js` | CRUD کاربران |
| `models/Post.js` | CRUD پست‌ها |
| `models/Comment.js` | CRUD نظرات مستقل |
| `models/Notification.js` | ساخت نوتیفیکیشن |
| `models/Setting.js` | خواندن تنظیمات چت |
| `utils/broadcast.js` | اطلاع‌رسانی WebSocket |
| `utils/webpush.js` | ارسال Web Push |
| `utils/profanityFilter.js` | فیلتر فحش |
| `utils/sms.js` | ارسال SMS OTP |
| `utils/ipCheck.js` | تشخیص IP ایرانی |
| `utils/deleteUserContent.js` | حذف محتوای کاربر |
| `utils/aiClient.js` | تولید متن هوشمند |

### الگوی اطلاع‌رسانی سه‌لایه

```
تغییر در دیتابیس
    ↓
۱. ذخیره در دیتابیس (MongoDB)
    ↓
۲. اطلاع‌رسانی WebSocket (broadcast.js)
    ↓
۳. ارسال Web Push (webpush.js → FCM + Web Push API)
```

**لایه ۱:** داده در MongoDB ذخیره می‌شود (پایدار)  
**لایه ۲:** کلاینت‌های متصل WebSocket فوراً مطلع می‌شوند (لحظه‌ای)  
**لایه ۳:** کلاینت‌هایی که اپ بسته است Web Push دریافت می‌کنند (با تأخیر)

---

**تعداد خطوط کل:** ۵۰۶ (auth.js) + ۳۷۳ (posts.js) + ۱۰۸۳ (admin.js) = **۱۹۶۲ خط**  
**تعداد endpoint ها:** ۱۲ (auth) + ۱۰ (posts) + ۱۵+ (admin) = **۳۷+ endpoint**
