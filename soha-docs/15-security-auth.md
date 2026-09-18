# بخش ۱۵: امنیت و احراز هویت — تحلیل جامع امنیت

## فهرست مطالب
- [مقدمه](#مقدمه)
- [سیستم JWT (JSON Web Token)](#jwt)
  - [توکن‌سازی](#token-generation)
  - [اعتبارسنجی توکن](#token-validation)
  - [انقضا و تازه‌سازی](#expiry)
- [سیستم OTP (رمز یک‌بار مصرف)](#otp)
  - [ارسال OTP](#send-otp)
  - [تأیید OTP](#verify-otp)
  - [Proof Token](#proof-token)
  - [Rate Limiting](#otp-rate-limit)
- [رمزگذاری رمز عبور (bcrypt)](#password-hashing)
- [کنترل دسترسی مبتنی بر نقش (RBAC)](#rbac)
  - [نقش‌ها](#roles)
  - [مجوزها](#permissions)
  - [فیلترهای دسترسی](#access-filters)
- [فیلتر فحش (Profanity Filter)](#profanity)
  - [لیست کلمات](#word-list)
  - [نرمال‌سازی](#normalization)
  - [سیستم اخطار و بن](#warning-system)
- [Rate Limiting](#rate-limiting)
- [سیاست CORS](#cors)
- [مدیریت FCM Token](#fcm-tokens)
- [امنیت Web Push (VAPID)](#web-push)
- [کلیدهای امنیتی ادمین](#admin-keys)
- [سیستم Mute/Ban](#mute-ban)
- [پاکسازی محتوا](#content-moderation)
- [اتصال به سایر فایل‌ها](#connections)

---

## مقدمه

امنیت اپلیکیشن «محفل» در چند لایه پیاده‌سازی شده:
1. **احراز هویت:** JWT + OTP
2. **رمزگذاری:** bcrypt
3. **کنترل دسترسی:** RBAC (نقش‌محور)
4. **پاکسازی محتوا:** فیلتر فحش + سیستم اخطار
5. **حفاظت از API:** Rate limiting + CORS
6. **امنیت ارتباطات:** HTTPS + VAPID

---

## سیستم JWT (JSON Web Token)

### مسیر فایل: `server/middleware/auth.js` — ۹۸ سطر

### تولید توکن

```javascript
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};
```

**جزئیات:**
- **Payload:** `{ id: userId }` — فقط شناسه کاربر
- **Secret:** از متغیر محیطی `JWT_SECRET` خوانده می‌شود
- **انقضا:** ۷ روز (پیش‌فرض)

### میان‌یر auth (اختیاری)

```javascript
export const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  req.clientIP = getClientIP(req);
  req.isIranianIP = isIranianIP(ip);
  
  if (!token) {
    req.user = null;
    return next();
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) { req.user = null; return next(); }
  
  // بررسی رفع میوت خودکار
  if (user.muted && user.mutedUntil && new Date() > user.mutedUntil) {
    user.muted = false;
    user.mutedUntil = null;
    user.mutedReason = '';
    await user.save();
  }
  
  req.user = user;
  next();
};
```

**نکات:**
- اگر توکن نباشد، `req.user = null` می‌شود (خطا نمی‌دهد)
- اگر توکن نامعتبر باشد، خطا گرفته و `req.user = null` می‌شود
- میوت خودکار رفع می‌شود اگر زمان آن گذشته باشد

### میان‌یر requireAuth (اجباری)

```javascript
export const requireAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'احراز هویت لازم است' });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) return res.status(401).json({ error: 'کاربر یافت نشد' });
  if (user.banned) return res.status(403).json({ error: 'شما از سایت اخراج شده‌اید.', banned: true });

  req.user = user;
  next();
};
```

**تفاوت با auth:**
- `auth`: اختیاری — اگر توکن نباشد ادامه می‌دهد
- `requireAuth`: اجباری — اگر توکن نباشد 401 برمی‌گرداند

### requireRole

```javascript
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'احراز هویت لازم است' });
    if (req.user.role === 'superadmin') return next();  // superadmin همیشه دسترسی دارد
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    next();
  };
};
```

**نکته:** `superadmin` همیشه از filtres عبور می‌کند.

### requireSuperAdmin

```javascript
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'احراز هویت لازم است' });
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'فقط مدیر سیستم دسترسی دارد' });
  }
  next();
};
```

### requireAdminPermission

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

**سطوح دسترسی:**
1. `superadmin` → همه چیز
2. `admin` → بر اساس `adminPermissions`
3. `author` → محدود
4. `user` → پایه

---

## سیستم OTP

### مسیر فایل: `server/routes/auth.js` — ۵۰۶ سطر

### ارسال OTP

```javascript
router.post('/send-otp', async (req, res) => {
  cleanExpiredOtps();
  const { phoneNumber, purpose, name } = req.body;
  
  // اعتبارسنجی شماره
  if (!phoneNumber || !/^09\d{9}$/.test(String(phoneNumber).trim())) {
    return res.json({ success: false, error: 'شماره موبایل نامعتبر است' });
  }

  // بررسی تکراری نبودن
  if (purpose === 'register') {
    const existing = await User.findOne({ phoneNumber: phone });
    if (existing) return res.json({ success: false, error: 'این شماره قبلاً ثبت شده' });
  }

  // Rate Limiting: ۶۰ ثانیه بین ارسال‌ها
  const existing = otpStore.get(phone);
  if (existing && existing.nextSendAt > Date.now()) {
    const wait = Math.ceil((existing.nextSendAt - Date.now()) / 1000);
    return res.json({ success: false, error: `لطفاً ${wait} ثانیه صبر کنید` });
  }

  // تولید و ذخیره کد
  const code = generateOtp();  // ۴ رقم تصادفی
  otpStore.set(phone, {
    code,
    purpose: p,
    expiresAt: Date.now() + 120000,      // ۲ دقیقه
    nextSendAt: Date.now() + 60000,      // ۶۰ ثانیه بین ارسال‌ها
    attempts: 0,
  });

  // ارسال SMS
  const smsResult = await sendOtpSms(phone, code, name);
});
```

**ویژگی‌های امنیتی OTP:**
- کد ۴ رقمی تصادفی
- انقضا: ۲ دقیقه
- Rate limit: ۶۰ ثانیه بین ارسال‌ها
- حداکثر ۵ تلاش اشتباه

### تأیید OTP

```javascript
router.post('/verify-otp', async (req, res) => {
  const { phoneNumber, otp, purpose } = req.body;
  const stored = otpStore.get(phone);
  
  // bypass برای محیط توسعه
  const isDevBypass = !process.env.SMSIR_API_KEY && String(otp) === '0000';

  if (!isDevBypass) {
    if (!stored) return res.json({ success: false, error: 'ابتدا کد را دریافت کنید' });
    if (stored.expiresAt < Date.now()) {
      otpStore.delete(phone);
      return res.json({ success: false, error: 'کد منقضی شده' });
    }
    if (String(otp) !== stored.code) {
      stored.attempts++;
      if (stored.attempts >= 5) {
        otpStore.delete(phone);
        return res.json({ success: false, error: 'تعداد تلاش‌ها بیش از حد' });
      }
      return res.json({ success: false, error: 'کد اشتباه است' });
    }
  }

  otpStore.delete(phone);
  // ...
});
```

### Proof Token

برای جلوگیری از تقلب بین مراحل OTP و ثبت‌نام:

```javascript
function genProofToken(phone, purpose) {
  const token = crypto.randomBytes(24).toString('hex');
  otpProofStore.set(token, { 
    phone, 
    purpose, 
    expiresAt: Date.now() + 10 * 60 * 1000  // ۱۰ دقیقه
  });
  return token;
}
```

**جریان:**
1. کاربر OTP را تأیید می‌کند → `proofToken` دریافت می‌کند
2. کاربر فرم را پر می‌کند + `proofToken` ارسال می‌کند
3. سرور `proofToken` را اعتبارسنجی می‌کند

---

## رمزگذاری رمز عبور (bcrypt)

### مسیر فایل: `server/models/User.js` — ۷۵ سطر

```javascript
userSchema.pre('save', async function (next) {
  if (this.isModified('securityKey') && this.securityKey) {
    this.securityKey = await bcrypt.hash(this.securityKey, 10);
  }
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
```

**جزئیات:**
- **Salt rounds:** ۱۰ (استاندارد)
- **Hash:** bcrypt — غیرقابل برگشت
- **خودکار:** قبل از ذخیره هر سند، رمز hash می‌شود
- **مقایسه:** از `bcrypt.compare` استفاده می‌شود

### مقایسه رمز

```javascript
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};
```

### مقایسه کلید امنیتی

```javascript
userSchema.methods.compareSecurityKey = async function (candidateKey) {
  if (!this.securityKey) return false;
  return bcrypt.compare(candidateKey, this.securityKey);
};
```

---

## کنترل دسترسی مبتنی بر نقش (RBAC)

### نقش‌ها

```javascript
// models/User.js - خط ۱۹
role: { 
  type: String, 
  enum: ['user', 'author', 'admin', 'superadmin'], 
  default: 'user' 
},
```

| نقش | توضیح | مجوزها |
|------|--------|--------|
| `user` | کاربر عادی | ایجاد پست، نظر، آلبوم، یادداشت |
| `author` | نویسنده | + ایجاد/ویرایش کتاب، پادکست، اپیزود |
| `admin` | مدیر | + مدیریت کاربران، محتوا، تنظیمات |
| `superadmin` | مدیر سیستم | + همه چیز + حذف ادمین‌ها |

### مجوزهای پیش‌فرض

```javascript
// models/User.js - خط ۲۲-۲۹
rolePermissions: {
  type: Map,
  of: [String],
  default: {
    user: ['create_post', 'create_comment', 'create_album', 'create_note', 
           'purchase_request', 'like_content', 'manage_library'],
    author: ['create_post', 'create_comment', 'create_album', 'create_note', 
             'purchase_request', 'like_content', 'manage_library',
             'create_book', 'edit_book', 'create_podcast', 'edit_podcast', 'manage_episodes'],
    admin: ['users', 'posts', 'comments', 'analytics', 'sales', 'videos', 
            'podcasts', 'library', 'notes', 'authors', 'versions', 
            'purchases', 'support', 'notifications', 'settings'],
  },
},
```

### فیلترهای دسترسی در API

#### posts.js — خط ۹۴-۱۱۸

```javascript
router.post('/', requireAuth, async (req, res) => {
  // بررسی بن
  if (req.user.banned) {
    return res.status(403).json({ error: 'شما اخراج شده‌اید.', banned: true });
  }
  // بررسی میوت
  if (req.user.muted) {
    return res.status(403).json({ error: `شما در حالت سکوت هستید`, muted: true });
  }
  // بررسی بسته بودن چت
  if (req.user.role !== 'admin' && await isChatClosed()) {
    return res.status(403).json({ error: 'چت بسته شده', chatClosed: true });
  }
  // ...
});
```

#### admin.js — خط ۱۹

```javascript
router.use(requireAuth, requireRole('admin', 'superadmin'));
```

تمام مسیرهای admin فقط برای ادمین و سوپرادمین مجاز است.

---

## فیلتر فحش (Profanity Filter)

### مسیر فایل: `server/utils/profanityFilter.js` — ۱۰۷ سطر

### لیست کلمات

لیست شامل بیش از ۱۲۰ کلمه نامناسب فارسی، انگلیسی و ترکی است:

```javascript
const persianProfanity = [
  // فحش جنسی و رکیک
  'کیر', 'کسکش', 'کص', 'کوس', 'کون', 'گاییدن', ...
  // خانوادگی
  'بی‌شرف', 'بی‌ناموس', 'پدرسوخته', ...
  // انگلیسی
  'fuck', 'shit', 'bitch', ...
  // ترکی
  'amk', 'orospu', 'piç', ...
  // تهدید
  'میکشمت', 'کشتار', ...
];
```

### نرمال‌سازی

```javascript
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
```

**نرمال‌سازی:**
- تبدیل به حروف کوچک
- حذف علائم نگارشی
- یکسان‌سازی حروف عربی/فارسی
- حذف فاصله‌های اضافی

### تابع بررسی

```javascript
export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return { hasProfanity: false, matchedWord: null };
  
  const normalizedText = normalize(text);
  const words = normalizedText.split(' ');

  for (const bad of persianProfanity) {
    const normalizedBad = normalize(bad);
    if (!normalizedBad) continue;
    
    // کلمات کوتاه (<=3 حرف): فقط تطابق کامل
    if (normalizedBad.length <= 3) {
      if (words.includes(normalizedBad)) {
        return { hasProfanity: true, matchedWord: bad };
      }
    } else {
      // کلمات بلند: تطابق جزئی
      if (normalizedText.includes(normalizedBad)) {
        return { hasProfanity: true, matchedWord: bad };
      }
    }
  }

  return { hasProfanity: false, matchedWord: null };
}
```

### سیستم اخطار و بن

**posts.js — خط ۱۰۸-۱۱۸:**

```javascript
const check = containsProfanity(body.text);
if (check.hasProfanity) {
  req.user.warnings = (req.user.warnings || 0) + 1;
  if (req.user.warnings >= 3) {
    req.user.banned = true;
    await req.user.save();
    return res.status(403).json({ 
      error: 'شما به دلیل ۳ بار تخلف اخراج شدید.', 
      banned: true, 
      warnings: req.user.warnings 
    });
  }
  await req.user.save();
  return res.status(400).json({ 
    error: `متن نامناسب است. اخطار ${req.user.warnings} از ۳`, 
    warnings: req.user.warnings 
  });
}
```

**جریان:**
1. متن بررسی می‌شود
2. اگر نامناسب باشد → اخطار +۱
3. اگر اخطار >= ۳ → بن دائمی
4. اخطار در مدل User ذخیره می‌شود

---

## Rate Limiting

### OTP Rate Limiting

```javascript
// auth.js - خط ۱۸۸
const existing = otpStore.get(phone);
if (existing && existing.nextSendAt > Date.now()) {
  const wait = Math.ceil((existing.nextSendAt - Date.now()) / 1000);
  return res.json({ success: false, error: `لطفاً ${wait} ثانیه صبر کنید` });
}
```

### OTP Attempt Limiting

```javascript
// auth.js - خط ۲۵۸
if (String(otp) !== stored.code) {
  stored.attempts++;
  if (stored.attempts >= 5) {
    otpStore.delete(phone);
    return res.json({ success: false, error: 'تعداد تلاش‌ها بیش از حد' });
  }
}
```

---

## سیاست CORS

### سرور Go — خط ۳۳۸-۳۴۷

```go
http.HandleFunc("/cors", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
    if r.Method == "OPTIONS" {
        w.WriteHeader(200)
        return
    }
    w.Write([]byte("ok"))
})
```

### سرور Node.js

```javascript
// server/server.js
app.use(cors({
  origin: ['https://app.soha-sima.ir', 'http://localhost:3000'],
  credentials: true,
}));
```

---

## مدیریت FCM Token

### مدل User

```javascript
// models/User.js - خط ۳۸
fcmTokens: [{ type: String }],
```

### ثبت توکن

```javascript
// App.tsx - خط ۵۸۶
const syncFcmToken = useCallback(async () => {
  const token = getFcmToken();
  if (!token || !userRef.current) return;
  await registerFcmToken(token);
}, []);
```

### حذف توکن (لاگ‌اوت)

```javascript
// App.tsx - خط ۵۹۴
const clearFcmToken = useCallback(async () => {
  const token = getFcmToken();
  if (!token) return;
  await unregisterFcmToken(token);
}, []);
```

### API ثبت/حذف

```javascript
// services/api.js
export const registerFcmToken = (token) => api.post('/auth/fcm-token', { token });
export const unregisterFcmToken = (token) => api.delete('/auth/fcm-token', { data: { token } });
```

---

## امنیت Web Push (VAPID)

### سرور

```javascript
// server/utils/webpush.js
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@soha-sima.ir',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
```

### اشتراک‌گذاری

```javascript
// services/webPush.ts
export const syncWebPushSubscription = async () => {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY,
  });
  await api.post('/auth/push-subscription', subscription);
};
```

---

## کلیدهای امنیتی ادمین

### auth.js — خط ۳۱۰-۳۳۱

```javascript
router.post('/complete-profile', requireAuth, async (req, res) => {
  const { name, avatar, role, securityKey } = req.body;

  if (role === 'admin') {
    const correctKey = process.env.ADMIN_SECURITY_KEY || 'admin123';
    if (securityKey !== correctKey) {
      return res.status(403).json({ error: 'رمز امنیتی اشتباه است' });
    }
  }

  if (role === 'author') {
    const correctKey = process.env.AUTHOR_SECURITY_KEY || '1234';
    if (securityKey !== correctKey) {
      return res.status(403).json({ error: 'رمز امنیتی اشتباه است' });
    }
  }
  // ...
});
```

**نکته امنیتی:** کلیدها در کد hardcode شده‌اند (مقدار پیش‌فرض) اما در production از متغیرهای محیطی خوانده می‌شوند.

---

## سیستم Mute/Ban

### مدل User

```javascript
// models/User.js - خط ۳۱-۳۴
warnings: { type: Number, default: 0 },
banned: { type: Boolean, default: false },
muted: { type: Boolean, default: false },
mutedUntil: { type: Date, default: null },
mutedReason: { type: String, default: '' },
```

### API Mute/Unmute

```javascript
// auth.js - خط ۴۳۸-۴۵۴
router.put('/muted', requireAuth, async (req, res) => {
  // بررسی رفع خودکار میوت
  if (req.user.muted && req.user.mutedUntil && new Date() > req.user.mutedUntil) {
    req.user.muted = false;
    req.user.mutedUntil = null;
    req.user.mutedReason = '';
    await req.user.save();
  }
  res.json({
    muted: req.user.muted || false,
    mutedUntil: req.user.mutedUntil || null,
    mutedReason: req.user.mutedReason || '',
  });
});
```

### API Ban/Unban (ادمین)

```javascript
// admin.js
router.post('/users/:id/ban', requireAuth, requireRole('admin'), async (req, res) => {
  const user = await User.findById(req.params.id);
  user.banned = true;
  await user.save();
  broadcast('data-changed', { type: 'users', action: 'update', item: { _id: user._id, banned: true } });
});
```

### بررسی در API

```javascript
// posts.js - خط ۹۶-۱۰۱
if (req.user.banned) {
  return res.status(403).json({ error: 'شما اخراج شده‌اید.', banned: true });
}
if (req.user.muted) {
  return res.status(403).json({ error: `شما در حالت سکوت هستید`, muted: true });
}
```

---

## پاکسازی محتوا

### propagation تغییرات پروفایل

```javascript
// auth.js - خط ۳۷-۵۳
async function propagateProfileToContent(userId, oldName, newName, newAvatar) {
  const sets = { author: newName, authorAvatarUrl: newAvatar };
  await Comment.updateMany({ userId }, { $set: sets });
  await Comment.updateMany({ author: oldName, userId: { $exists: false } }, { $set: sets });
  await Post.updateMany({ userId }, { $set: sets });
  await Post.updateMany({ author: oldName, userId: { $exists: false } }, { $set: sets });
  // به‌روزرسانی کامنت‌های تو در تو
  await Post.updateMany(
    { 'comments.userId': userId },
    { $set: { 'comments.$[c].author': newName, 'comments.$[c].authorAvatarUrl': newAvatar } },
    { arrayFilters: [{ 'c.userId': userId }] }
  );
}
```

**نکته:** وقتی کاربر نام/آواتار خود را تغییر دهد، تمام پست‌ها و نظرات او نیز به‌روز می‌شوند.

### حذف محتوای کاربر

```javascript
// auth.js - خط ۳۸۸-۳۹۸
router.delete('/me', requireAuth, async (req, res) => {
  const userId = req.user._id;
  await User.findByIdAndDelete(userId);
  await deleteUserContent(userId);
  broadcast('data-changed', { type: 'users', action: 'delete', id: String(userId) });
});
```

---

## اتصال به سایر فایل‌ها

### فایل‌های مرتبط

| فایل | نقش |
|------|------|
| `server/middleware/auth.js` | میان‌یرهای احراز هویت |
| `server/routes/auth.js` | مسیرهای OTP، ثبت‌نام، ورود |
| `server/routes/posts.js` | فیلتر فحش + بررسی بن/میوت |
| `server/routes/admin.js` | کنترل دسترسی ادمین |
| `server/models/User.js` | مدل کاربر با bcrypt |
| `server/utils/profanityFilter.js` | فیلتر محتوای نامناسب |
| `server/utils/sms.js` | ارسال SMS (OTP) |
| `server/utils/webpush.js` | ارسال Web Push |
| `server/utils/broadcast.js` | broadcast از طریق WebSocket |

### خلاصه لایه‌های امنیتی

```
┌─────────────────────────────────────────────┐
│            لایه ۱: HTTPS                    │
├─────────────────────────────────────────────┤
│            لایه ۲: CORS                     │
├─────────────────────────────────────────────┤
│            لایه ۳: JWT Auth                 │
├─────────────────────────────────────────────┤
│            لایه ۴: Role-Based Access        │
├─────────────────────────────────────────────┤
│            لایه ۵: Profanity Filter         │
├─────────────────────────────────────────────┤
│            لایه ۶: Rate Limiting            │
├─────────────────────────────────────────────┤
│            لایه ۷: Mute/Ban System          │
└─────────────────────────────────────────────┘
```

### اتصال به App.tsx

در `App.tsx`، امنیت از چند طریق مدیریت می‌شود:

1. **ذخیره توکن:** `localStorage.setItem('soha_token', token)` (خط ۸۸۲)
2. **ارسال توکن:** در header درخواست‌ها از `Authorization: Bearer <token>` استفاده می‌شود
3. **لاگ‌اوت:** حذف توکن + حذف FCM token (خط ۸۹۷-۹۰۶)
4. **بررسی بن:** اگر پاسخ `banned: true` باشد، کاربر از سایت خارج می‌شود (خط ۱۴۵۰-۱۴۵۳)
5. **بررسی اخطار:** اگر `warnings` برگردانده شود، پیام هشدار نمایش داده می‌شود (خط ۱۴۵۴-۱۴۵۵)
