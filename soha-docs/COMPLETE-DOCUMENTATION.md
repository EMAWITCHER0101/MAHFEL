# محفل (Mahfel) — مستندات کامل پروژه

## فهرست مطالب

1. [نمای کلی پروژه](#1-نمای-کلی-پروژه)
2. [ساختار کلی فایل‌ها](#2-ساختار-کلی-فایل‌ها)
3. [فایل‌های روت](#3-فایل‌های-روت)
4. [Next.js App Router](#4-nextjs-app-router)
5. [بک‌اند (server/)](#5-بک‌اند)
6. [فرانت‌اند (components/)](#6-فرانت‌اند)
7. [صفحات (views/)](#7-صفحات)
8. [سرویس‌ها (services/)](#8-سرویس‌ها)
9. [ابزارها (utils/)](#9-ابزارها)
10. [داده‌ها (data/)](#10-داده‌ها)
11. [دسکتاپ (electron/)](#11-دسکتاپ)
12. [موبایل (capacitor/ios/)](#12-موبایل)
13. [دیپلوی (deploy/)](#13-دیپلوی)
14. [وب‌سوکت Go (ws-server/)](#14-وب‌سوکت)
15. [آمار کلی](#15-آمار-کلی)

---

## 1. نمای کلی پروژه

**نام:** محفل (Mahfel) / سرای هنر و اندیشه
**نوع:** پلتفرم محتوایی فارسی (پادکست، ویدیو، کتاب، جامعه)
**تکنولوژی اصلی:** React 18 + TypeScript + Tailwind CSS + Vite
**بک‌اند:** Express.js 4.21 + MongoDB (Mongoose 8)
**پلتفرم‌ها:** وب، Android (Capacitor)، iOS، Windows Desktop (Electron)
**دامنه:** `soha-sima.ir` (عمومی)، `app.soha-sima.ir` (اپلیکیشن)
**پورت بک‌اند:** 5000
**پورت فرانت‌اند:** 3000 (dev)

---

## 2. ساختار کلی فایل‌ها

```
E:\soha\
├── App.tsx                    # کامپوننت اصلی SPA (2292 خط)
├── index.tsx                  # نقطه ورود React
├── index.html                 # قالب HTML ویت
├── index.css                  # CSS سراسری (477 خط)
├── types.ts                   # تعریف نوع‌های TypeScript (194 خط)
├── vite.config.ts             # تنظیمات ویت
├── tailwind.config.js         # تنظیمات Tailwind
├── postcss.config.js          # تنظیمات PostCSS
├── capacitor.config.ts        # تنظیمات Capacitor (موبایل)
├── tsconfig.json              # تنظیمات TypeScript
├── package.json               # وابستگی‌ها و اسکریپت‌ها
├── next.config.ts             # تنظیمات Next.js
├── service-worker.js          # سرویس وورکر ویت
├── seed-superadmin.cjs        # اسکریپت ایجاد سوپرادمین
├── ecosystem.config.cjs       # تنظیمات PM2
├── app/                       # Next.js App Router
├── components/                # 52 کامپوننت React
├── views/                     # 25 صفحه
├── services/                  # 5 سرویس کلاینت
├── utils/                     # 2 ابزار
├── data/                      # فایل‌های داده
├── server/                    # بک‌اند Express.js
├── ws-server/                 # وب‌سوکت Go
├── electron/                  # دسکتاپ Electron
├── deploy/                    # اسکریپت‌های دیپلوی (90+)
├── fonts/                     # فونت‌های فارسی
├── public/                    # فایل‌های استاتیک
├── book/                      # کتاب‌های PDF
├── logs/                      # لاگ‌های PM2
└── _archive/                  # فایل‌های قدیمی
```

---

## 3. فایل‌های روت

### `App.tsx` — 2292 خط
**هسته اصلی اپلیکیشن.** تمام state management، ناوبری، پخش صدا/ویدیو، به‌روزرسانی real-time، مدیریت پلتفرم در این فایل متمرکز است.

**47 متغیر state:**

| متغیر | نوع | کاربرد |
|--------|------|--------|
| `appState` | `'initializing' \| 'login' \| 'interests' \| 'ready' \| 'admin'` | چرخه حیات اپلیکیشن |
| `podcasts` | `Podcast[]` | تمام پادکست‌ها |
| `authors` | `Author[]` | تمام نویسندگان |
| `videos` | `Video[]` | تمام ویدیوها |
| `comments` | `Comment[]` | تمام کامنت‌ها |
| `posts` | `Post[]` | پست‌های جامعه |
| `books` | `Book[]` | کتابخانه |
| `publishedBooks` | `PublishedBook[]` | کتاب‌های منتشر شده |
| `myNotes` | `PublishedBook[]` | یادداشت‌های کاربر |
| `user` | `User \| null` | کاربر جاری |
| `isAuthenticated` | `boolean` | وضعیت احراز هویت |
| `activeTab` | `Page` | تب فعال: mahfel/sowt/matn/videos/library/nashr/support |
| `currentTrack` | `{ podcast, episode, episodeIndex } \| null` | آهنگ در حال پخش |
| `isPlaying` | `boolean` | وضعیت پخش |
| `isPlayerExpanded` | `boolean` | باز بودن پلیر تمام صفحه |
| `playbackRate` | `number` | سرعت پخش (0.5x-3x) |
| `volume` | `number` | صدا (0-1) |
| `repeatMode` | `'none' \| 'one' \| 'all'` | حالت تکرار |
| `isShuffle` | `boolean` | پخش تصادفی |
| `sleepTimer` | `number \| null` | تایمر خواب |
| `activeVideo` | `Video \| null` | ویدیوی در حال پخش |
| `selectedPodcast` | `Podcast \| null` | پادکست انتخاب شده |
| `selectedBook` | `Book \| null` | کتاب انتخاب شده |
| `playQueue` | `any[]` | صف پخش |
| `albums` | `{ mine, shared }` | آلبوم‌ها |
| `toast` | `{ id, message } \| null` | اعلان toast |
| `notif` | `{ id, title, body, link? } \| null` | اعلان in-app |
| `instantView` | `{ title, content } \| null` | نمایشگر فوری محتوا |
| + 18 متغیر دیگر برای UI state | | |

**20+ useEffect:**
1. همگام‌سازی صف پخش با ref
2. بارگذاری آلبوم‌ها
3. مدیریت لایه‌ها با browser history
4. پشتیبانی از دکمه Back گوشی
5. اعلان قطع VPN
6. پخش خودکار هنگام باز بودن تب کامنت‌ها
7. همگام‌سازی ویدیوی فعال
8. **مقداردهی اولیه اصلی** — بارگذاری تمام داده‌ها، بازیابی کاربر از localStorage، شروع polling اعلانات (30 ثانیه)، بررسی به‌روزرسانی (هر 10 دقیقه)
9. مهاجرت کلید اعلانات قدیمی
10. همگام‌سازی کتابخانه از سرور
11. همگام‌سازی توکن FCM
12. **وب‌سوکت real-time** — شروع `startRealtime()`
13. همگام‌سازی کامنت‌های ویدیو
14. راه‌اندازی المان صدا با event handlerها
15. ثبت سرویس وورکر Web Push
16. گوش دادن به پیام‌های سرویس وورکر
17. رویداد Lightbox
18. همگام‌سازی سرعت پخش
19. تایمر خواب
20. گوش دادن به فرمان‌های رسانه بومی
21. همگام‌سازی متادیتای پس‌زمینه
22. بازیابی پخش بومی هنگام بازگشت اپ

**توابع کلیدی:**
- `playEpisode()` — پخش اپیزود (بومی یا صدای وب)
- `togglePlay()` — ت Toggle پخش/مکث
- `playNext()` / `playPrev()` — ناوبری اپیزود با منطق shuffle/repeat
- `handleVolumeChange()` — تغییر صدا با ذخیره در localStorage
- `handlePlayInBackground()` — فعال‌سازی MediaSession برای پخش پس‌زمینه
- `handlePlayVideo()` — تغییر از صدا به ویدیو
- `playQueueItem()` / `playQueueNext()` / `addToQueue()` — مدیریت صف پخش
- `applyRealtimePayload()` — پردازش به‌روزرسانی‌های وب‌سوکت
- `refreshComments()` — دریافت کامنت‌های تازه
- `refreshAllData()` — به‌روزرسانی تمام داده‌ها
- `renderActivePage()` — **سويیچ بزرگ** — رندر صفحه فعال بر اساس state

**سیستم صدا:**
- ایجاد المان `<Audio>` در ref
- استفاده از `/api/proxy/audio?url=...` برای پروکسی صدا
- پشتیبانی از: پخش/مکث، بعدی/قبلی، shuffle، تکرار (none/one/all)، صدا، سرعت، تایمر خواب
- پخش پس‌زمینه از طریق MediaSession API (وب) یا AndroidBridge بومی
- Handoff بومی: WebView -> پلیر بومی هنگام پس‌زمینه رفتن، handback هنگام بازگشت

**سیستم ناوبری:**
- بدون React Router — ناوبری کاملاً state-based
- `renderActivePage()` بر اساس `activeTab` و موجودیت‌های انتخاب شده کامپوننت مناسب را برمی‌گرداند
- سیستم لایه با `history.pushState()` برای دکمه Back سخت‌افزاری

---

### `types.ts` — 194 خط
تعریف تمام interface‌های TypeScript:

| نوع | فیلدهای اصلی |
|------|-------------|
| `UserRole` | `'user' \| 'author' \| 'admin'` |
| `User` | id, email, phoneNumber, name, avatar, role, interests, warnings, banned, muted, library |
| `Episode` | title, subtitle, description, duration, audioUrl, date, isNew, cover, viewCount, fullText |
| `Podcast` | id, title, description, cover, speakerId, authorId, episodes[], year, categories, likes, likedBy |
| `Author` | id, name, avatar, bio, role ('master'\|'secretary'), coverImage |
| `Book` | id, title, authorId, cover, relatedEpisodes[], categories |
| `Video` | id, embedId, title, description, thumbnailUrl, viewCount, duration, categories, likes, authorId |
| `Comment` | id, type, author, text, likes, podcastId, videoId, bookId, parentId, replies[], media[] |
| `Post` | id, author, text, media[], comments[], likes, reactions, isPinned, isLive |
| `PublishedBook` | id, title, description, contentHtml, type ('book'\|'pamphlet'\|'note'), isDraft, likes[] |
| `Page` | `'mahfel' \| 'sowt' \| 'matn' \| 'videos' \| 'library' \| 'nashr' \| 'support'` |

---

### `index.tsx` — 49 خط
نقطه ورود. `App` را در `#root` mount می‌کند. سرویس وورکر را ثبت می‌کند.

### `index.html` — 40 خط
قالب HTML5 با RTL، فونت Vazirmatn، Material Symbols، Font Awesome.

### `index.css` — 477 خط
CSS سراسری: Tailwind directives، متغیرهای CSS برای light/dark، افکت‌های شیشه‌ای، 25+ انیمیشن keyframe (fadeIn, bounceIn, equalizer, spinSlow, pulsePlay, shimmer, float, breathe, heartBeat و...).

### `vite.config.ts` — 64 خط
تنظیمات Vite: سرور dev، پروکسی به بک‌اند، فشرده‌سازی، تقسیم chunk.

### `tailwind.config.js` — 24 خط
رنگ‌های سفارشی (primary/secondary/accent)، فونت‌ها، border-radius، سایه‌ها.

---

## 4. Next.js App Router

### `app/layout.tsx` — 155 خط
**لایهوت ریشه:** `lang="fa" dir="rtl"`، فونت‌های محلی (Vazirmatn, Nastaliq)، متادیتای SEO، OG tags، StructuredData.

### `app/page.tsx` — 61 خط
**صفحه اصلی:** import پویای `App.tsx` با SSR غیرفعال.

### `app/loading.tsx` — 31 خط
صفحه بارگذاری با متن فارسی "در حال بارگذاری".

### `app/not-found.tsx` — 41 خط
صفحه 404 با متن "صفحه یافت نشد".

### `app/error.tsx` — 11 خط
مرز خطای مسیر — صفحه خطای 500 با دکمه تلاش مجدد.

### `app/global-error.tsx` — 89 خط
مرز خطای سراسری — صفحه خطای بحرانی.

### `app/actions.ts` — 63 خط
**عملیات سرور:** `submitContactForm`، `searchContent`، `getPodcastById`.

### `app/robots.ts` — 16 خط
فایل robots.txt — اجازه همه، ممنوعیت /api/ و /uploads/.

### `app/sitemap.ts` — 12 خط
نقشه سایت — یک ورودی برای `soha-sima.ir`.

### `app/api/health/route.ts` — 11 خط
API سلامت — برگرداندن `{ status: 'ok', timestamp, uptime }`.

### `app/api/search/route.ts` — 27 خط
پروکسی جستجو — ارسال query به بک‌اند.

### `app/globals.css` — 547 خط
CSS سراسری App Router — فونت‌ها، Tailwind، متغیرها، انیمیشن‌ها.

---

## 5. بک‌اند (server/)

### `server/server.js` — 137 خط
**ورودی اصلی سرور Express.** پورت 5000.

**زنجیره Middleware (ترتیب اجرا):**

| # | Middleware | توضیح |
|---|-----------|--------|
| 1 | `helmet` | هدرهای امنیتی |
| 2 | `compression` | فشرده‌سازی gzip سطح 6 |
| 3 | `cors` | مجاز: localhost:3000, soha-sima.ir, app.soha-sima.ir |
| 4 | `express.json` | پارسر JSON با محدودیت 10MB |
| 5 | مدیر خطای JSON | برگرداندن 400 برای JSON نامعتبر |
| 6 | Cache-Control | `public, max-age=30` برای GET /api/* |
| 7 | Rate Limiter | 5000 درخواست در 15 دقیقه |
| 8 | فایل‌های استاتیک | `/uploads` دایرکتوری uploads |
| 9 | مدیر خطای سراسری | برگرداندن 500 |

**اتمام‌نامه‌های ویژه:**
- `GET /api/health` — بررسی سلامت
- `GET /api/check-ip` — جستجوی GeoIP

**ثبت مسیرها (22 مسیر):**

| مسیر | فایل | کاربرد |
|------|------|--------|
| `/api/auth` | `routes/auth.js` | ثبت‌نام، ورود، OTP، پروفایل |
| `/api/podcasts` | `routes/podcasts.js` | CRUD پادکست |
| `/api/videos` | `routes/videos.js` | CRUD ویدیو + پروکسی Aparat |
| `/api/playlists` | `routes/playlists.js` | مدیریت پلی‌لیست ویدیو |
| `/api/authors` | `routes/authors.js` | CRUD نویسنده |
| `/api/books` | `routes/books.js` | CRUD کتاب |
| `/api/published-books` | `routes/publishedBooks.js` | کتاب‌های منتشر شده |
| `/api/posts` | `routes/posts.js` | پست‌های جامعه |
| `/api/comments` | `routes/comments.js` | کامنت‌های مستقل |
| `/api/proxy` | `routes/proxy.js` | پروکسی صدا |
| `/api/upload` | `routes/upload.js` | آپلود فایل |
| `/api/admin` | `routes/admin.js` | پنل مدیریت |
| `/api/admin-roles` | `routes/adminRoles.js` | مدیریت نقش‌ها |
| `/api/ai` | `routes/ai.js` | چت هوش مصنوعی |
| `/api/notifications` | `routes/notifications.js` | اعلانات |
| `/api/app-update` | `routes/appUpdate.js` | به‌روزرسانی اپ |
| `/api/purchase-requests` | `routes/purchaseRequests.js` | درخواست‌های خرید |
| `/api/expenses` | `routes/expenses.js` | هزینه‌ها |
| `/api/community` | `routes/community.js` | تنظیمات چت |
| `/api/users` | `routes/users.js` | پروفایل عمومی |
| `/api/support` | `routes/support.js` | پیام‌های پشتیبانی |
| `/api/albums` | `routes/albums.js` | آلبوم‌های کاربر |

---

### `server/config/db.js` — 13 خط
اتصال MongoDB از طریق `MONGODB_URI`.

### `server/middleware/auth.js` — 98 خط
**میدلور احراز هویت:**

| خروجی | نوع | کاربرد |
|--------|------|--------|
| `auth` | میدلور | اختیاری — استخراج JWT، attaches `req.user` |
| `requireAuth` | میدلور | اجباری — 401 اگر توکن نباشد |
| `requireRole(...roles)` | کارخانه میدلور | بررسی نقش کاربر. **سوپرادمین از همه عبور می‌کند** |
| `requireSuperAdmin` | میدلور | بررسی `role === 'superadmin'` |
| `requireAdminPermission(permission)` | کارخانه میدلور | بررسی مجوز خاص |
| `generateToken(userId)` | تابع | ایجاد JWT با انقضای 7 روز |

**منطق کلیدی:**
- بررسی خودکار انقضای mute
- تشخیص IP با `ipCheck.js`
- بررسی بن — برگرداندن `{ banned: true }`

---

### `server/models/` — 18 فایل مدل

#### `User.js` — 75 خط — کلکسیون `users`
| فیلد | نوع | توضیح |
|------|------|--------|
| `phoneNumber` | String | یکتا، خالی‌پذیر |
| `email` | String | یکتا، خالی‌پذیر |
| `password` | String | هش شده با bcrypt |
| `name` | String | |
| `avatar` | String | |
| `role` | String | enum: user, author, admin, superadmin |
| `adminPermissions` | [String] | مجوزهای دقیق ادمین |
| `warnings` | Number | 3 = بن خودکار |
| `banned` | Boolean | |
| `muted` | Boolean | |
| `mutedUntil` | Date | |
| `interests` | [String] | |
| `fcmTokens` | [String] | توکن‌های FCM |
| `library` | Object | podcasts, episodes, videos, books, notes, posts, bookmarks |

**متدها:** `comparePassword()`, `compareSecurityKey()`, hook `pre('save')` برای هش.

#### `Post.js` — 58 خط — کلکسیون `posts`
پست‌های جامعه با کامنت‌های توکار شده.

| فیلد | نوع | توضیح |
|------|------|--------|
| `author` | String | نام نویسنده |
| `userId` | ObjectId -> User | |
| `text` | String | متن پست |
| `media` | [{type, url}] | تصویر/ویدیو/صدا |
| `videoId`, `podcastId`, `bookId`, `albumId` | ObjectId | محتوای مرتبط |
| `comments` | [postCommentSchema] | کامنت‌های توکار با author, text, likes, replyTo, media |
| `likes` | Number | |
| `reactions` | Map<String, Number> | |
| `isPinned`, `isFeatured` | Boolean | |
| `isLive` | Boolean | |
| `liveStatus` | enum: 'streaming', 'ended' | |

#### `Comment.js` — 38 خط — کلکسیون `comments`
کامنت‌های مستقل روی پادکست/ویدیو/کتاب.

| فیلد | نوع | توضیح |
|------|------|--------|
| `type` | String | podcast, video, book |
| `author`, `userId` | | هویت کاربر |
| `text` | String | متن کامنت |
| `parentId` | ObjectId -> Comment | برای پاسخ‌های تو در تو |
| `quotedText` | String | متن نقل‌قول |
| `media` | [{type, url}] | |
| `podcastId`, `videoId`, `bookId` | | محتوای مرتبط |
| `videoTimestamp`, `audioTimestamp` | Number | |

#### `Podcast.js` — 35 خط — کلکسیون `podcasts`
| فیلد | نوع | توضیح |
|------|------|--------|
| `title` | String | ضروری، ایندکس شده |
| `description` | String | |
| `cover` | String | |
| `speakerId` | ObjectId -> Author | ضروری |
| `episodes` | [episodeSchema] | title, subtitle, description, duration, audioUrl, date, isNew, cover, viewCount, fullText |
| `year` | Number | |
| `categories` | [String] | |
| `likes`, `viewCount` | Number | |

#### `Video.js` — 20 خط — کلکسیون `videos`
| فیلد | نوع | توضیح |
|------|------|--------|
| `embedId` | String | ضروری (هش ویدیوی Aparat) |
| `title` | String | ضروری، ایندکس شده |
| `thumbnailUrl` | String | |
| `viewCount`, `duration`, `likes` | Number | |
| `categories` | [String] | |
| `authorId` | ObjectId -> Author | |

#### `Book.js` — 18 خط — کلکسیون `books`
کتاب‌های مرتبط با پادکست.

| فیلد | نوع | توضیح |
|------|------|--------|
| `title` | String | ضروری |
| `authorId` | ObjectId -> Author | ضروری |
| `cover` | String | |
| `relatedEpisodes` | [{podcastId, episodeIndex}] | |

#### `Author.js` — 11 خط — کلکسیون `authors`
| فیلد | نوع | توضیح |
|------|------|--------|
| `name` | String | ضروری |
| `avatar`, `bio`, `coverImage` | String | |
| `role` | String | enum: master, secretary |

#### `PublishedBook.js` — 31 خط — کلکسیون `publishedbooks`
کتاب‌ها و یادداشت‌های منتشر شده.

| فیلد | نوع | توضیح |
|------|------|--------|
| `title` | String | ضروری |
| `contentHtml` | String | محتوای HTML کامل |
| `type` | String | book, pamphlet, note |
| `isDraft` | Boolean | |
| `pendingApproval` | Boolean | |
| `likes` | [ObjectId -> User] | آرایه آی‌دی کاربران |
| `authorId` | ObjectId -> User | |
| `pdfUrl`, `buyUrl`, `price` | String | |

#### `Notification.js` — 21 خط — کلکسیون `notifications`
| فیلد | نوع | توضیح |
|------|------|--------|
| `title`, `body` | String | ضروری |
| `target` | String | all, admins, user |
| `userId` | ObjectId -> User | null = پخش همگانی |
| `type` | String | admin, reply, video, playlist, community, note, book, purchase |

#### `Setting.js` — 11 خط — کلکسیون `settings`
فروشگاه key-value. `key` یکتا، `value` از نوع Mixed.

#### `Expense.js` — 15 خط — کلکسیون `expenses`
| فیلد | نوع | توضیح |
|------|------|--------|
| `title` | String | ضروری |
| `amount` | Number | ضروری، حداقل 0 |
| `note` | String | |
| `date` | Date | |

#### `Album.js` — 25 خط — کلکسیون `albums`
| فیلد | نوع | توضیح |
|------|------|--------|
| `userId` | ObjectId -> User | ضروری |
| `type` | String | audio, video |
| `title` | String | ضروری |
| `items` | [albumItemSchema] | podcastId, episodeIndex, videoId, noteId |
| `shared` | Boolean | |

#### `AppUpdate.js` — 16 خط — کلکسیون `appupdates`
ذخیره نسخه APK و Desktop در یک سند.

#### `AnalyticsEvent.js` — 16 خط — کلکسیون `analyticevents`
| فیلد | نوع | توضیح |
|------|------|--------|
| `event` | String | podcast_play, video_view, podcast_like, video_like |
| `refType`, `refId`, `refTitle` | | ارجاع به محتوا |
| `userId`, `identifier` | | |

#### `PurchaseRequest.js` — 32 خط — کلکسیون `purchaserequests`
| فیلد | نوع | توضیح |
|------|------|--------|
| `userId` | ObjectId -> User | ضروری |
| `orderNumber` | String | ضروری، یکتا |
| `items` | [{title, cover, price, quantity}] | |
| `status` | String | pending, confirmed, rejected |
| `cardNumber`, `transferDate`, `trackingCode` | String | مدرک پرداخت |

#### `SupportMessage.js` — 13 خط — کلکسیون `supportmessages`
| فیلد | نوع | توضیح |
|------|------|--------|
| `name`, `contact` | String | |
| `category` | String | bug, suggestion, question, other |
| `message` | String | ضروری |
| `isRead` | Boolean | |

#### `PushSubscription.js` — 20 خط — کلکسیون `pushsubscriptions`
| فیلد | نوع | توضیح |
|------|------|--------|
| `userId` | ObjectId -> User | ایندکس شده |
| `endpoint` | String | ضروری، یکتا |
| `keys` | {p256dh, auth} | کلیدهای رمزنگاری Web Push |

#### `VideoPlaylist.js` — 13 خط — کلکسیون `videoplaylists`
| فیلد | نوع | توضیح |
|------|------|--------|
| `name` | String | ضروری |
| `slug` | String | ضروری، یکتا |
| `videoIds` | [String] | آی‌دی‌های embed Aparat |
| `visible` | Boolean | |

---

### `server/routes/` — 22 فایل مسیر

#### `routes/auth.js` — 506 خط — `/api/auth`
| متد | مسیر | احراز هویت | کاربرد |
|------|------|-----------|--------|
| POST | `/register` | نه | ثبت‌نام با نام، تلفن، ایمیل، رمز + OTP |
| POST | `/login` | نه | ورود با ایمیل/تلفن + رمز |
| POST | `/send-otp` | نه | ارسال OTP SMS (محدودیت 60 ثانیه) |
| POST | `/verify-otp` | نه | تأیید OTP. توکن اثبات برمی‌گرداند |
| POST | `/complete-profile` | اجباری | تنظیم نام، آواتار، نقش |
| POST | `/interests` | اجباری | ذخیره علایق |
| GET | `/me` | اجباری | دریافت پروفایل جاری |
| DELETE | `/me` | اجباری | حذف حساب + تمام محتوا |
| PUT | `/library` | اجباری | به‌روزرسانی کتابخانه |
| PUT | `/profile` | اجباری | به‌روزرسانی نام/آواتار + انتشار به تمام پست‌ها |
| POST | `/reset-password` | نه | بازیابی رمز |

**توابع کلیدی:**
- `generateDefaultAvatar(name)` — ایجاد SVG data URI با گرادیانت + حرف اول
- `propagateProfileToContent()` — به‌روزرسانی نام/آواتار در تمام پست‌ها و کامنت‌ها
- `otpStore` / `otpProofStore` — Mapهای درون‌حافظه برای OTPها

#### `routes/posts.js` — 373 خط — `/api/posts`
| متد | مسیر | کاربرد |
|------|------|--------|
| GET | `/` | لیست پست‌ها با صفحه‌بندی |
| GET | `/:id` | یک پست |
| POST | `/` | ایجاد پست. فیلتر فحش (3 اخطار = بن) |
| PUT | `/:id` | ویرایش پست |
| DELETE | `/:id` | حذف پست + اعلان‌ها |
| POST | `/:id/like` | افزایش لایک |
| POST | `/:id/comments` | افزودن کامنت |
| DELETE | `/:id/comments/:commentId` | حذف کامنت + پاسخ‌ها |
| PUT | `/:id/comments/:commentId` | ویرایش کامنت |

**منطق کلیدی:**
- `isChatClosed()` — بررسی Setting `community_chat`
- `notifyAdminsOfCommunityMessage()` — ایجاد اعلان + Web Push به ادمین‌ها

#### `routes/comments.js` — 240 خط — `/api/comments`
| متد | مسیر | کاربرد |
|------|------|--------|
| GET | `/` | لیست کامنت‌ها با فیلتر (type, podcastId, videoId, bookId) |
| GET | `/flat` | لیست تخت کامنت‌ها |
| POST | `/` | ایجاد کامنت + اعلان |
| PUT | `/:id` | ویرایش |
| DELETE | `/:id` | حذف بازگشتی |
| POST | `/:id/like` | Toggle لایک |

#### `routes/podcasts.js` — 162 خط — `/api/podcasts`
| متد | مسیر | کاربرد |
|------|------|--------|
| GET | `/` | لیست با جستجو، دسته‌بندی، فیلتر سخنران |
| GET | `/:id` | یک پادکست |
| POST | `/` | ایجاد (admin, author) |
| PUT | `/:id` | به‌روزرسانی (admin, author) |
| DELETE | `/:id` | حذف (فقط admin) |
| POST | `/:id/episodes` | افزودن اپیزود |
| PUT | `/:podcastId/episodes/:episodeIndex` | ویرایش اپیزود |
| DELETE | `/:podcastId/episodes/:episodeIndex` | حذف اپیزود |
| POST | `/:id/like` | Toggle لایک |
| POST | `/:id/view` | افزایش viewCount |

#### `routes/videos.js` — 141 خط — `/api/videos`
| متد | مسیر | کاربرد |
|------|------|--------|
| GET | `/` | لیست با جستجو و دسته‌بندی |
| GET | `/:id/stream` | دریافت URLهای استریم Aparat (کش 5 دقیقه) |
| GET | `/:id` | یک ویدیو |
| POST | `/` | ایجاد + اعلان (فقط admin) |
| PUT | `/:id` | به‌روزرسانی |
| DELETE | `/:id` | حذف |
| POST | `/:id/view` | افزایش viewCount |
| POST | `/:id/like` | Toggle لایک |

**تابع کلیدی:** `fetchAparatStream(embedId)` — دریافت از `aparat.com/etc/api/video/videohash/` با کش 5 دقیقه.

#### `routes/admin.js` — 1083 خط — `/api/admin` (بزرگترین فایل)
**تمام مسیرها نیاز به `requireAuth` + `requireRole('admin', 'superadmin')` دارند.**

| متد | مسیر | کاربرد |
|------|------|--------|
| GET | `/stats` | آمار داشبورد: شمارش تمام موجودیت‌ها، کاربران اخیر، توزیع نقش‌ها |
| GET | `/analytics` | آمار دوره‌ای (7/30/90 روز): درصدهای رشد، برترین‌ها |
| GET | `/analytics/segments` | آمار تفکیکی: پخش صدا در مقابل مشاهده ویدیو |
| GET | `/insights` | بینش‌های هوش مصنوعی با Gemini. کش 5 دقیقه |
| GET | `/users` | لیست صفحه‌بندی شده کاربران با جستجو |
| PUT | `/users/:id/role` | تغییر نقش |
| DELETE | `/users/:id` | حذف کاربر + محتوا |
| POST | `/users/bulk` | حذف/تغییر نقش گروهی |
| GET | `/notes` | لیست یادداشت‌ها با فیلتر وضعیت |
| POST | `/notes` | ایجاد یادداشت |
| GET | `/posts` | لیست پست‌ها با جستجو |
| DELETE | `/posts/:id` | حذف پست |
| POST | `/posts/bulk` | حذف/سنجاق گروهی |
| POST | `/posts/purge` | حذف تمام پست‌ها |
| GET | `/comments` | لیست کامنت‌ها |
| DELETE | `/comments/:id` | حذف بازگشتی |
| GET | `/activity` | فید فعالیت اخیر |
| GET | `/export` | خروجی JSON |
| GET | `/search` | جستجوی سراسری |
| POST | `/users/:userId/mute` | بی‌صدا کردن با مدت و دلیل |
| POST | `/users/:userId/ban` | بن + حذف محتوا |
| POST | `/users/:userId/unban` | رفع بن |

#### `routes/adminRoles.js` — 293 خط — `/api/admin-roles`
| متد | مسیر | کاربرد |
|------|------|--------|
| POST | `/request` | درخواست ادمین شدن |
| GET | `/requests` | لیست درخواست‌ها |
| POST | `/requests/:id/approve` | تأیید درخواست |
| POST | `/requests/:id/reject` | رد درخواست |
| PUT | `/users/:userId/role` | تغییر نقش |
| POST | `/users/:userId/remove-admin` | تنزل ادمین |
| GET | `/list` | لیست تمام ادمین‌ها |
| PUT | `/users/:userId/permissions` | به‌روزرسانی مجوزها |

#### `routes/ai.js` — 71 خط — `/api/ai`
| متد | مسیر | کاربرد |
|------|------|--------|
| POST | `/chat` | چت AI با RAG. مدل پیش‌فرض: gemini-2.0-flash |
| GET | `/corpus` | آمار corpus |
| POST | `/corpus/refresh` | بازسازی اجباری ایندکس |

#### `routes/notifications.js` — 172 خط — `/api/notifications`
| متد | مسیر | کاربرد |
|------|------|--------|
| GET | `/public-key` | کلید عمومی VAPID |
| POST | `/push/register` | ثبت توکن FCM |
| POST | `/subscribe` | ثبت اشتراک Web Push |
| GET | `/` | لیست اعلانات |
| POST | `/` | ایجاد اعلان + ارسال Web Push |

#### `routes/appUpdate.js` — 89 خط — `/api/app-update`
| متد | مسیر | کاربرد |
|------|------|--------|
| GET | `/latest` | دریافت آخرین نسخه APK و Desktop |
| POST | `/` | به‌روزرسانی اطلاعات نسخه |
| POST | `/upload-apk` | آپلود فایل APK (حداکثر 300MB) |

#### `routes/purchaseRequests.js` — 257 خط — `/api/purchase-requests`
| متد | مسیر | کاربرد |
|------|------|--------|
| POST | `/` | ایجاد درخواست خرید با تاریخ جلالی |
| GET | `/` | لیست درخواست‌های خود |
| GET | `/admin` | لیست تمام درخواست‌ها |
| PATCH | `/:id` | تأیید یا رد خرید |
| GET | `/admin/stats` | آمار فروش |

#### سایر مسیرها:

| فایل | خطوط | مسیر | تابعیت اصلی |
|------|------|------|-------------|
| `routes/authors.js` | 66 | `/api/authors` | CRUD نویسنده |
| `routes/books.js` | 69 | `/api/books` | CRUD کتاب |
| `routes/publishedBooks.js` | 179 | `/api/published-books` | کتاب‌های منتشر شده + لایک |
| `routes/playlists.js` | 157 | `/api/playlists` | پلی‌لیست ویدیو + پر کردن خودکار |
| `routes/upload.js` | 56 | `/api/upload` | آپلود فایل (حداکثر 30MB) |
| `routes/proxy.js` | 116 | `/api/proxy` | پروکسی صدا با پشتیبانی Range |
| `routes/community.js` | 56 | `/api/community` | تنظیمات چت |
| `routes/users.js` | 38 | `/api/users` | پروفایل عمومی |
| `routes/support.js` | 68 | `/api/support` | پیام‌های پشتیبانی |
| `routes/albums.js` | 86 | `/api/albums` | آلبوم‌های کاربر |
| `routes/expenses.js` | 59 | `/api/expenses` | هزینه‌ها |

---

### `server/utils/` — 9 فایل ابزار

#### `utils/aiClient.js` — 27 خط
`chatCompletion(messages, model, maxTokens)` — فراخوانی OpenRouter API (Gemini 2.0 Flash).
`generateText(prompt, systemInstruction, model)` — بسته‌بندی chatCompletion.

#### `utils/broadcast.js` — 19 خط
`broadcast(event, data)` — ارسال HTTP POST به `127.0.0.1:5001/broadcast`. Fire-and-forget.

#### `utils/corpus.js` — 185 خط
**سیستم RAG:** بارگذاری PublishedBooks, Books, Podcasts, Videos. ایجاد ایندکس جستجو با TF-IDF.
- کش 30 دقیقه
- نرمال‌سازی فارسی
- جستجو: توکن‌سازی query، محاسبه امتیاز IDF، برگرداندن top K

#### `utils/deleteUserContent.js` — 59 خط
**حذف بازگشتی تمام محتوای کاربر:** پست‌ها، کامنت‌ها، یادداشت‌ها، اشتراک‌ها، اعلان‌ها.

#### `utils/ipCheck.js` — 68 خط
`isIranianIP(ip)` — بررسی ~450 پیشوند IP ایران.
`getClientIP(req)` — استخراج IP از x-forwarded-for, x-real-ip, یا socket.

#### `utils/profanityFilter.js` — 107 خط
`containsProfanity(text)` — ~180 کلمه رکیک در فارسی، انگلیسی و ترکی.
بازگشت: `{ hasProfanity, matchedWord }`.

#### `utils/sms.js` — 38 خط
`sendOtpSms(mobile, code, name)` — ارسال OTP از طریق sms.ir API.

#### `utils/webpush.js` — 179 خط
**سیستم Push دوگانه:**
1. **Web Push (VAPID)** — برای مرورگرها
2. **FCM** — برای Android APK
خودکار حذف اشتراک‌های مرده (404/410).

#### `utils/analyticsEvent.js` — 17 خط
`trackEvent(event, refType, refId, refTitle, req, meta)` — ثبت رویداد تحلیلی.

---

### فایل‌های اسکریپت server/

| فایل | خطوط | کاربرد |
|------|------|--------|
| `seed.js` | 151 | کاشت داده نمونه: 4 نویسنده، 3 پادکست، 30 ویدیو، 1 کتاب، 6 کتاب منتشر شده |
| `seed-notes.js` | 260 | کاشت 12 یادداشت ادبی/فلسفی با محتوای HTML فارسی |
| `seed-notes-soha.js` | 65 | دریافت یادداشت‌ها از WordPress API |
| `scrape-videos.js` | 106 | استخراج آی‌دی ویدیوها از sitemap وردپرس |
| `sync-soha.mjs` | 276 | همگام‌سازی پادکست‌ها از `dl.soha-sima.ir` |

---

## 6. فرانت‌اند (components/)

### کامپوننت‌های اصلی:

#### `ThemeProvider.tsx` — 33 خط
ارائه‌دهنده context تم. خروجی: `useTheme()` hook. state: `theme` ('light'|'dark') ذخیره در localStorage.

#### `ErrorBoundary.tsx` — 59 خط
مرز خطای React. کلاس کامپوننت. نمایش کارت خطا با دکمه رفرش.

#### `ErrorPages.tsx` — 266 خط
- `ErrorPages` — صفحه خطای عمومی
- `NotFoundPage` — 404
- `ServerErrorPage` — 500
- `NetworkErrorPage` — 503
- `OfflineDetector` — تشخیص آفلاین با retry هر 15 ثانیه
- `VPNBanner` — اعلان IP غیر ایران
- `useVPNDetection()` — hook تشخیص VPN هر 30 ثانیه

#### `Sidebar.tsx` — 125 خط
سایدبار دسکتاپ. 6 آیتم ناوبری، دکمه ادمین، toggle تم. مخفی در موبایل.

#### `BottomTabs.tsx` — 269 خط
تب‌های پایین موبایل. 5 تب: sowt, library, [central mahfel], videos, nashr.
دکمه مرکزی: long-press برای نوشتن (ادمین/نویسنده). ورودی چت inline.

#### `MinimizedPlayer.tsx` — 252 خط
پلیر مینی شناور. قابل کشیدن (ماوس + لمس). کاور در حال چرخش. کنترل‌ها: بعدی، پخش/مکث، قبلی، bookmark، پخش پس‌زمینه، بستن.

#### `FullScreenPlayer.tsx` — 744 خط
پلیر تمام صفحه با 30+ prop.
- هنر آلبوم با گرادیانت
- نوار جستجو با برچسب‌های زمان
- لیست اپیزود
- بخش کامنت با پاسخ‌ها، لایک، ویرایش
- منوی تایمر خواب (5/15/30/60 دقیقه)
- اسلایدر صدا
- انتخابگر سرعت پخش
- کنترل‌های تکرار/shuffle

#### `AudioPlayer.tsx` — 185 خط
پلیر صدای مستقل با بصری‌سازی waveform. 50 میله تصادفی. کلیک برای جستجو.

#### `SearchModal.tsx` — 150 خط
جستجوی تمام صفحه. جستجو در پادکست‌ها، ویدیوها، کتاب‌ها، نویسندگان. فیلتر: همه/podcast/video/book/author.

#### `Toast.tsx` — 50 خط
اعلان toast. خودکار بعد از 3 ثانیه بسته می‌شود.

#### `NotificationBanner.tsx` — 75 خط
اعلان in-app با نوار پیشرفت، خودکار بعد از 2 ثانیه.

#### `WelcomeVideo.tsx` —
ویدیوی خوش‌آمدگویی برای کاربران جدید.

#### `UpdateDialog.tsx` —
دیالوگ به‌روزرسانی اپلیکیشن.

#### `OnboardingGuide.tsx` —
راهنمای گام‌به‌گام onboarding.

#### `VideoCard.tsx` — 64 خط
کارت ویدیو با thumbnail، badge مدت زمان، دکمه پخش.

#### `PodcastCard.tsx` — 119 خط
کارت پادکست با تصویر کاور، بج استاد، دکمه‌های اشتراک‌گذاری/bookmark.

#### `BookCard.tsx` — 34 خط
کارت کتاب ساده: کاور، عنوان، نام نویسنده.

#### `Skeleton.tsx` — 62 خط
اجزای skeleton loading: `SkeletonCard`, `SkeletonPodcast`, `SkeletonPost`, `SkeletonFeed`.

#### `SohaLogo.tsx` — 48 خط
اجزای لوگو: `SohaLogo`, `SohaLogotype`, `SohaIcon`, `SohaFullLogotype`.

#### سایر کامپوننت‌ها:

| کامپوننت | کاربرد |
|----------|--------|
| `VideoMiniPlayer` | پلیر ویدیوی مینی |
| `VideoListItem` | ردیف لیست ویدیو |
| `UserProfileModal` | مدال پروفایل کاربر |
| `TimestampThumbnail` | thumbnail با مهر زمانی |
| `StructuredData` | داده‌های ساختاریافته SEO (JSON-LD) |
| `ShareCard` | کارت اشتراک‌گذاری |
| `QuoteActions` | دکمه‌های عمل نقل‌قول |
| `PostInteractionMenu` | منوی تعامل پست |
| `PermissionToast` | اعلان درخواست مجوز |
| `PermissionLocked` | نمایش قفل بودن ویژگی |
| `PdfViewer` | نمایشگر PDF |
| `OptimizedImage` | تصویر بهینه با lazy load |
| `MediaLightbox` | نمایشگر تمام صفحه تصویر/ویدیو |
| `MahfelSidebar` | سایدبار موبایل جامعه |
| `LiveBanner` | اعلان پخش زنده |
| `IranAccessWarning` | اعلان دسترسی ایران |
| `InstantView` | نمایشگر فوری محتوا (HTML) |
| `InlineVideoPlayer` | پلیر ویدیوی inline |
| `ExternalScripts` | بارگذاری اسکریپت‌های خارجی |
| `DeleteAnimation` | انیمیشن تأیید حذف |
| `DebugNotification` | ابزار دیباگ اعلان |
| `CustomVideoPlayer` | پلیر ویدیوی سفارشی با یکپارچگی Aparat |
| `ConfirmToast` | اعلان تأیید با بله/خیر |
| `CheckoutFlow` | فرآیند خرید کتاب |
| `CartModal` | مدال سبد خرید |
| `AudioTimestampBar` | نوار مهر زمانی صدا |
| `AppHeader` | هدر اپلیکیشن |
| `AlbumViewer` | نمایشگر مدال آلبوم |
| `AdminSalesPanel` | پنل آمار فروش ادمین |
| `AdminCharts` | نمودارهای تحلیلی ادمین |
| `NewEpisodeCard` | کارت اعلان اپیزود جدید |

---

## 7. صفحات (views/)

| صفحه | خطوط | کاربرد |
|------|------|--------|
| `LoginPage.tsx` | ~400 | احراز هویت تلفنی (OTP)، ثبت‌نام، ورود، بازیابی رمز |
| `InterestsPage.tsx` | ~200 | انتخاب علایق اولیه |
| `SowtPage.tsx` | ~500 | مرور پادکست‌ها — دسته‌بندی‌ها، فیلترها، شبکه پادکست |
| `MatnPage.tsx` | ~300 | مرور کتاب‌ها |
| `VideoVaultPage.tsx` | ~400 | مرور ویدیوها با پلی‌لیست و دسته‌بندی |
| `VideoPlayerPage.tsx` | ~600 | پلیر ویدیو با کامنت‌ها و ویدیوهای مرتبط |
| `VideoListPage.tsx` | ~200 | نمای لیست ویدیو |
| `LibraryPage.tsx` | ~500 | کتابخانه شخصی — پادکست‌ها/ویدیوها/اپیزودها ذخیره شده، آلبوم‌ها، صف پخش، یادداشت‌ها، پست‌ها، بوکمارک‌ها |
| `PlaylistPage.tsx` | ~400 | جزئیات پادکست — تب‌های درباره/اپیزودها/کامنت‌ها |
| `PostCommentsPage.tsx` | ~400 | جزئیات پست/کامنت با پاسخ‌های تو در تو |
| `CommentsCommunityPage.tsx` | ~600 | فید جامعه/محفل — پست‌ها، ویدیوهای inline، پادکست‌های inline |
| `NashrPage.tsx` | ~500 | صفحه انتشار — کتاب‌ها، یادداشت‌ها، ویرایشگر یادداشت، جزئیات کتاب |
| `BookPage.tsx` | ~300 | جزئیات کتاب با اپیزودهای مرتبط |
| `AuthorPage.tsx` | ~200 | پروفایل نویسنده با کتاب‌ها/پادکست‌ها/ویدیوها |
| `UserProfilePage.tsx` | ~400 | پروفایل کاربر — پست‌ها، یادداشت‌ها، کتابخانه، تنظیمات |
| `AdminPage.tsx` | ~800 | پنل مدیریت — تب‌ها برای کاربران/پست‌ها/کامنت‌ها/تحلیل‌ها/فروش/ویدیوها/پادکست‌ها/کتابخانه/یادداشت‌ها/نویسندگان/نسخه‌ها/خریدها/پشتیبانی/اعلانات/تنظیمات |
| `SupportPage.tsx` | ~200 | فرم پشتیبانی/بازخورد |
| `AiAssistantPage.tsx` | ~300 | دستیار چت هوش مصنوعی |
| `OrdersPage.tsx` | ~200 | سفارشات خرید |
| `PublishedBooksPage.tsx` | ~200 | لیست کتاب‌های منتشر شده |
| `HomePage.tsx` | ~50 | صفحه اصلی (شاید استفاده نشود) |
| `LoadingPage.tsx` | ~50 | صفحه بارگذاری |
| `DummyPage.tsx` | ~10 | صفحه جایگزین |

---

## 8. سرویس‌ها (services/)

### `services/api.ts` — 1072 خط
**کلاینت API کامل.** تمام فراخوانی‌های HTTP به بک‌اند.

**ساختار:**
- `getApiBase()` — آدرس سرور ذخیره شده یا `/api`
- `getToken()` — خواندن JWT از `localStorage('soha_token')`
- `headers()` — ساخت هدرها با auth اختیاری
- `apiFetch<T>()` — wrapper generic fetch با مدیریت خطا

**تمام توابع صادر شده (60+):**

| دسته | توابع |
|------|--------|
| **احراز هویت** | `register`, `login`, `sendOtp`, `verifyOtp`, `resetPassword`, `completeProfile`, `getMe`, `updateInterests`, `updateLibrary`, `updateProfile` |
| **پادکست** | `getPodcasts`, `getPodcast`, `recordPodcastPlay`, `getAICorpus` |
| **کتاب** | `getBooks` |
| **نویسنده** | `getAuthors` |
| **ویدیو** | `getVideos`, `recordVideoView`, `getVideoPlaylists`, `getVideoPlaylist`, `getAdminVideoPlaylists`, `createVideoPlaylist`, `updateVideoPlaylist`, `deleteVideoPlaylist` |
| **استریم** | `prefetchStream`, `getVideoStream` |
| **کامنت** | `getComments`, `addComment`, `deleteComment`, `updateComment`, `deletePostComment`, `likeComment` |
| **لایک** | `likeVideo`, `likePodcast` |
| **آلبوم** | `getAlbums`, `createAlbum`, `updateAlbum`, `deleteAlbum` |
| **پست** | `getPosts`, `createPost`, `shareToMahfel`, `deletePost`, `updatePost`, `updatePostComment`, `likePost`, `addPostComment` |
| **کتاب منتشر شده** | `getPublishedBooks`, `getMyNotes`, `createPublishedBook`, `updatePublishedBook`, `deletePublishedBook`, `toggleNoteLike`, `getAuthorNotes` |
| **ادمین یادداشت** | `adminGetNotes`, `adminCreateNote`, `adminUpdateNote`, `adminDeleteNote` |
| **آپلود** | `uploadFile` |
| **ادمین** | `getAdminStats`, `getAdminUsers`, `updateUserRole`, `updateUser`, `deleteUser`, `getAdminPosts`, `adminDeletePost`, `adminUpdatePost`, `getAdminComments`, `adminDeleteComment`, `adminUpdateComment`, `getAdminAnalytics`, `getAdminAnalyticsSegments`, `getAdminInsights`, `getAdminActivity`, `adminExportData`, `adminSearchGlobal`, `adminBulkUsers`, `adminBulkPosts`, `adminPurgePosts`, `adminBulkComments` |
| **الگو** | `muteUser`, `unmuteUser`, `unbanUser`, `banUser`, `resetUserWarnings` |
| **اعلان** | `getNotifications`, `registerFcmToken`, `unregisterFcmToken`, `adminSendNotification`, `adminDeleteNotification` |
| **خرید** | `createPurchaseRequest`, `getMyPurchaseRequests`, `adminGetPurchaseRequests`, `adminUpdatePurchaseRequest`, `adminGetPurchaseStats`, `adminGetExpenses`, `adminCreateExpense`, `adminDeleteExpense` |
| **جامعه** | `getUserById`, `getCommunitySettings`, `updateCommunitySettings` |
| **به‌روزرسانی** | `getAppUpdate`, `adminSaveAppUpdate`, `adminUploadApk` |
| **Web Push** | `getPushPublicKey`, `subscribeToPush`, `unsubscribeFromPush` |
| **پشتیبانی** | `submitSupportMessage`, `getSupportMessages`, `markSupportMessageRead`, `deleteSupportMessage` |
| **نقش‌ها** | `requestAdminAccess`, `getMyAdminRequest`, `getAdminRequests`, `approveAdminRequest`, `rejectAdminRequest`, `changeUserRole`, `removeAdmin`, `getAdminList`, `updateAdminPermissions`, `getMyPermissions`, `getRolePermissions`, `updateRolePermissions`, `getUserPermissions`, `resetUserPermissions` |

### `services/ai.ts` — 152 خط
**کلاینت دستیار هوش مصنوعی.**

| تابع | کاربرد |
|------|--------|
| `aiAssistant(message, data)` | چت اصلی با کاتالوگ کامل |
| `ragChat(message, data?)` | چت با RAG |
| `summarizePodcast(podcast, episodeIndex?)` | خلاصه پادکست |
| `summarizeVideo(video)` | خلاصه ویدیو |
| `summarizeBook(book)` | خلاصه کتاب |
| `smartSearch(query, data)` | جستجوی هوشمند |
| `generateTags(content)` | تولید برچسب |
| `smartReply(comment, context)` | تولید پیشنهاد پاسخ |

### `services/backgroundPlayback.ts` — 727 خط
**موتور پخش پس‌زمینه چند پلتفرمی.** پیچیده‌ترین سرویس.

| دسته | توابع |
|------|--------|
| **تشخیص پلتفرم** | `isApp()`, `isIos()`, `isDesktop()` |
| **بریج بومی** | `sendNativeNotification()`, `getAppVersion()`, `downloadAndInstallApk()`, `getFcmToken()`, `getDesktopVersion()`, `startOtpAutofill()`, `desktopOpenExternal()`, `desktopShowNotification()` |
| **مقایسه نسخه** | `isVersionNewer(latest, current)` |
| **صدا پس‌زمینه** | `playInBackgroundAudio(meta)`, `stopBackgroundAudio()`, `clearWebMediaSession()` |
| **همگام‌سازی بومی** | `updateBackgroundMeta()`, `updateBackgroundState()`, `updateAudioBackgroundMeta()`, `updateAudioBackgroundState()`, `setVideoPlayingState()`, `stopPlaybackService()` |
| **حالت بومی** | `isNativeMode()`, `setNativeModeActive()`, `nativeCommand()`, `ensureNotificationPermission()`, `hasNotificationPermission()`, `ensureBatteryOptimizationExemption()`, `getNativeSnapshot()` |
| **Handoff صدا** | `handoffAudioToNative(audioEl)`, `handbackAudioFromNative(audioEl)` |
| **ویدیو پس‌زمینه** | `isVideoBackgroundActive()`, `registerVideoSource()`, `canDrawOverlays()`, `updateVideoPipInfo()`, `floatingVideoCommand()`, `startVideoBackground()`, `stopVideoBackground()`, `expandFloatingVideo()`, `stopFloatingVideo()`, `enterBackgroundVideo()` |
| **مقداردهی** | `initBackgroundPlayback()` — راه‌اندازی listenerهای رویداد سراسری |

**معماری کلیدی:**
- استفاده از `window.AndroidBridge` / `window.MahfelIosBridge` برای ارتباط بومی
- استفاده از `window.mahfelDesktop` برای Electron
- پرچم `nativeMode` — آیا پخش در پلیر بومی است (نه WebView)
- ویدیو PiP: APK از `enterVideoPip()` استفاده می‌کند، وب از `requestPictureInPicture()` استاندارد
- سیستم Handoff: هنگام `visibilitychange`، صدا به پلیر بومی منتقل و هنگام بازگشت بازگردانده می‌شود

### `services/realtime.ts` — 68 خط
**اتصال وب‌سوکت real-time.**

| تابع | کاربرد |
|------|--------|
| `startRealtime(handlers)` | اتصال به `ws://<origin>/ws` |
| `stopRealtime()` | قطع اتصال |
| `reconnectNow()` | اتصال مجدد فوری |
| `isRealtimeConnected()` | وضعیت اتصال |

رفتار: اتصال مجدد خودکار با backoff نمایی (1 تا 3 ثانیه).

### `services/webPush.ts` — 140 خط
**مدیریت اعلان Web Push.**

| تابع | کاربرد |
|------|--------|
| `enableWebPush()` | فرآیند کامل اشتراک |
| `disableWebPush()` | لغو اشتراک |
| `toggleWebPush()` | toggle |
| `syncWebPushSubscription()` | همگام‌سازی مجدد با سرور |
| `getPushEnabled()` | بررسی فعال بودن |
| `getAppNotifEnabled()` / `setAppNotifEnabled()` | toggle سراسری |

---

## 9. ابزارها (utils/)

### `utils/helpers.ts` — 93 خط

| تابع | کاربرد |
|------|--------|
| `DEFAULT_COVER` | `'/pdc.png'` |
| `formatTime(seconds)` | تبدیل به `HH:MM:SS` یا `MM:SS` |
| `toPersianDigits(str)` | تبدیل اعداد عربی به فارسی |
| `getRandomTailwindColor(seed)` | رنگ تعیین شده از 10 گزینه |
| `getInitials(name)` | حروف اول اجزای نام |
| `formatPersianDate(dateStr)` | قالب‌بندی تاریخ فارسی |
| `isSameDay(d1, d2)` | مقایسه تاریخ |
| `formatDateSeparator(dateStr)` | "امروز"/"دیروز"/تاریخ فارسی |
| `formatTimeFromISO(isoString)` | زمان از رشته ISO |
| `formatPersianDateForInput(dateStr)` | قالب برای input |
| `parsePersianDateInput(persianStr)` | تبدیل اعداد فارسی به انگلیسی |

### `utils/aparatApi.ts` — 106 خط
کلاینت API Aparat (یوتیوب ایرانی).

| تابع | کاربرد |
|------|--------|
| `fetchAparatVideoDetails(videoId, signal?)` | دریافت جزئیات ویدیو از طریق CORS proxy |
| `extractAparatId(url)` | استخراج آی‌دی ویدیو از URL |

---

## 10. داده‌ها (data/)

### `data/database.ts` — 461 خط
**داده‌های نمونه / fallback.** حاوی نویسندگان (4)، پادکست‌ها (3)، ویدیوها (30)، پست‌ها (2)، کتاب‌های منتشر شده (6)، کتاب (1).

### `data/guideSteps.ts` — 163 خط
تعریف گام‌های onboarding:
- `ADMIN_STEPS` — 10 گام برای تور پنل ادمین
- `USER_STEPS` — 7 گام برای کاربر عادی
- `AUTHOR_STEPS` — USER_STEPS + 2 گام نویسنده

هر گام: `selector`, `title`, `description`, `icon`, `color`, `position`.

### `data/videoData.ts` — 0 خط
فایل خالی (قدیمی).

### `data/mockData.ts` — 0 خط
فایل خالی (قدیمی).

---

## 11. دسکتاپ (electron/)

| فایل | خطوط | کاربرد |
|------|------|--------|
| `main.js` | 122 | فرآیند اصلی Electron — ایجاد BrowserWindow، بارگذاری app.soha-sima.ir، صفحه آفلاین، اعلان‌های سیستم، handlerهای IPC |
| `preload.js` | 14 | اسکریپت preload — نمایش API `mahfelDesktop` (isElectron, appVersion, openExternal, showNotification) |
| `offline.html` | - | صفحه fallback آفلاین |
| `package.json` | - | مانیفست وابستگی‌های Electron |
| `installer.nsh` | - | اسکریپت نصب NSIS |

---

## 12. موبایل (capacitor/ios/)

### Capacitor (Android)
- `capacitor.config.ts` — `appId: 'com.mahfel.app'`، `webDir: 'dist'`
- 206 فایل در `android/`

### iOS
| فایل | کاربرد |
|------|--------|
| `AppDelegate.swift` | نماینده اپلیکیشن |
| `SceneDelegate.swift` | نماینده صحنه |
| `WebViewController.swift` | کنترلر WebView که app.soha-sima.ir را بارگذاری می‌کند |
| `Info.plist` | تنظیمات اپلیکیشن |
| `GoogleService-Info.plist` | تنظیمات Firebase |
| `Mahfel.entitlements` | مجوزهای اپلیکیشن |
| `offline.html` | صفحه fallback آفلاین |
| `Podfile` | وابستگی‌های CocoaPods |

---

## 13. دیپلوی (deploy/)

- `deploy.js` — اسکریپت اصلی
- `deploy-all.js` — دیپلوی کامل
- `deploy-fe.js` — دیپلوی فرانت‌اند
- `deploy-be-https.js` — دیپلوی بک‌اند HTTPS
- `deploy-auth.js` — دیپلوی احراز هویت
- `deploy-ai.js` — دیپلوی هوش مصنوعی
- `*.js` — 50+ اسکریپت دیپلوی/تشخیصی/تست
- `*.mjs` — 40+ اسکریپت ESM (eitaa-*, inspect-*, sync-*)
- `.env.deploy` — متغیرهای محیطی دیپلوی

---

## 14. وب‌سوکت Go (ws-server/)

### `main.go` — 354 خط
**سرور وب‌سوکت real-time.**

| مولفه | توضیح |
|--------|--------|
| `Hub` | مدیریت اتصال‌ها، broadcast |
| `Client` | یک اتصال وب‌سوکت |
| `main()` | راه‌اندازی سرور روی پورت 5001 |
| **MongoDB Change Stream** | گوش دادن به تغییرات پست‌ها، کامنت‌ها، ویدیوها، پادکست‌ها |
| **HTTP broadcast endpoint** | `POST /broadcast` برای دریافت رویدادها از بک‌اند |

---

## 15. آمار کلی

| دسته | تعداد |
|------|--------|
| **کامپوننت‌های React** | 52 |
| **صفحات (views)** | 25 |
| **سرویس‌های کلاینت** | 5 |
| **ابزارهای کلاینت** | 2 |
| **فایل‌های داده** | 4 (2 فعال، 2 خالی) |
| **مسیرهای Next.js** | 13 |
| **مسیرهای API Next.js** | 2 |
| **مسیرهای Express** | 22 |
| **ابزارهای سرور** | 9 |
| **مدل‌های Mongoose** | 18 |
| **اسکریپت‌های سرور** | 9 |
| **اسکریپت‌های دیپلوی** | 90+ |
| **فایل‌های Go** | 3 |
| **فایل‌های Electron** | 5 |
| **فایل‌های iOS** | 9 |
| **فایل‌های تنظیم** | 8 |
| **کل فایل‌های سورس** | ~250+ |
