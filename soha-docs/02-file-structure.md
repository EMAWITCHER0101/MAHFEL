# بخش ۲: ساختار فایل‌ها و پوشه‌ها

## نمای درختی کلی

```
soha/
├── App.tsx                    # کامپوننت اصلی SPA (~2292 خط)
├── main.tsx                   # نقطه ورود React
├── index.html                 # فایل HTML اصلی
├── package.json               # وابستگی‌ها و اسکریپت‌ها
├── tsconfig.json              # تنوزیع TypeScript
├── vite.config.ts             # تنوزیع Vite
├── tailwind.config.js         # تنظیمات Tailwind CSS
├── capacitor.config.ts        # تنظیمات Capacitor
├── index.css                  # CSS سراسری + RTL + انیمیشن‌ها
├── types.ts                   # اینترفیس‌های TypeScript
├── manifest.json              # Web App Manifest
├── sw.js                      # Service Worker
│
├── components/                # 52 کامپوننت React
│   ├── Accordion.tsx          # آکاردئون قابل بسته شدن
│   ├── AddToLibraryButton.tsx # دکمه افزودن به کتابخانه
│   ├── AppInfoBanner.tsx      # بنر اطلاعات اپلیکیشن
│   ├── AudioWaveBackground.tsx # انیمیشن موج صوتی (موبایل)
│   ├── AudioWaveEffect.tsx    # افکت موج صوتی (دسکتاپ)
│   ├── BookCard.tsx           # کارت نمایش کتاب
│   ├── CollectionCard.tsx     # کارت مجموعه پادکست
│   ├── CommentSection.tsx     # بخش کامنت‌ها (Migration)
│   ├── CommentsSection.tsx    # بخش کامنت‌ها (اصلی)
│   ├── CommunityPostCard.tsx  # کارت پست اجتماعی
│   ├── CreatePostModal.tsx    # مودال ایجاد پست
│   ├── FloatingMusicPlayer.tsx # پلیر موسیقی شناور
│   ├── Footer.tsx             # فوتر
│   ├── Header.tsx             # هدر اصلی
│   ├── InstallGuide.tsx       # راهنمای نصب اپلیکیشن
│   ├── LandingNavbar.tsx      # نوار ناوبری لندینگ
│   ├── LandingPage.tsx        # صفحه لندینگ
│   ├── LatestEpisodes.tsx     # آخرین اپیزودها
│   ├── LibraryTabs.tsx        # تب‌های کتابخانه
│   ├── LivePodcastRoom.tsx    # اتاق پادکست زنده
│   ├── MainLayout.tsx         # لایوت اصلی
│   ├── MiniPlayer.tsx         # پلیر کوچک
│   ├── MobileMenu.tsx         # منوی موبایل
│   ├── MusicMiniPlayer.tsx    # پلیر کوچک موسیقی
│   ├── MusicPlayerView.tsx    # نمای پلیر موسیقی
│   ├── MyLibraryView.tsx      # نمای کتابخانه من
│   ├── NavigationBar.tsx      # نوار ناوبری پایین
│   ├── NotificationBell.tsx   # زنگ اعلان‌ها
│   ├── NowPlayingBar.tsx      # نوار Now Playing
│   ├── NowPlayingMini.tsx     # نمای کوچک Now Playing
│   ├── NowPlayingPage.tsx     # صفحه Now Playing
│   ├── OnboardingModal.tsx    # مودال خوش‌آمدگویی
│   ├── PostComposer.tsx       # نویسنده پست
│   ├── PostDetailModal.tsx    # مودال جزئیات پست
│   ├── PostsTab.tsx           # تب پست‌ها
│   ├── PremiumBadge.tsx       # نشان پریمیوم
│   ├── PrivacyBadge.tsx       # نشان حریم خصوصی
│   ├── ReplyComponent.tsx     # کامپوننت پاسخ به کامنت
│   ├── SearchBar.tsx          # نوار جستجو
│   ├── ShareButton.tsx        # دکمه اشتراک‌گذاری
│   ├── SuggestedPlaylistsCard.tsx # کارت پلی‌لیست‌های پیشنهادی
│   ├── Testimonials.tsx       # نظرات کاربران
│   ├── UpdateDialog.tsx       # مودال به‌روزرسانی
│   ├── VideoSection.tsx       # بخش ویدیوها
│   ├── ViewToggle.tsx         # دکمه تغییر نمای صوت/ویدیو
│   ├── ViewTranscriptButton.tsx # دکمه مشاهده متن
│   ├── WaveSurroundings.tsx   # افکت موج اطراف
│   └── YouTubePlayer.tsx      # پلیر Aparat/یوتیوب
│
├── views/                     # 25 صفحه/نمای اصلی
│   ├── HomeView.tsx           # صفحه اصلی
│   ├── SearchView.tsx         # صفحه جستجو
│   ├── LibraryView.tsx        # صفحه کتابخانه
│   ├── PodcastView.tsx        # صفحه جزئیات پادکست
│   ├── EpisodeView.tsx        # صفحه جزئیات اپیزود
│   ├── BookView.tsx           # صفحه جزئیات کتاب
│   ├── BookReaderView.tsx     # خواننده کتاب (HTML/EPUB)
│   ├── BookAudioPlayer.tsx    # پلیر صوتی کتاب (متن + صدا)
│   ├── ProfileView.tsx        # صفحه پروفایل کاربر
│   ├── MyAccountView.tsx      # صفحه حساب کاربری
│   ├── PodcastsView.tsx       # لیست پادکست‌ها
│   ├── BooksView.tsx          # لیست کتاب‌ها
│   ├── CommunityView.tsx      # صفحه جامعه (محفل)
│   ├── WriterDashboardView.tsx # داشبورد نویسنده
│   ├── AdminPage.tsx          # پنل مدیریت (~2400 خط)
│   ├── SupportView.tsx        # صفحه پشتیبانی
│   ├── InfoView.tsx           # صفحه اطلاعات
│   ├── DeveloperInfo.tsx      # اطلاعات توسعه‌دهنده
│   ├── ChatbotView.tsx        # چت‌بات AI
│   └── WelcomePopup.tsx       # پاپ‌آپ خوش‌آمدگویی
│
├── services/                  # لایه ارتباطی
│   ├── api.ts                 # کلاینت API اصلی (1072 خط)
│   ├── ai.ts                  # کلاینت هوش مصنوعی (152 خط)
│   ├── realtime.ts            # کلاینت وب‌سوکت (68 خط)
│   ├── webPush.ts             # مدیریت Web Push (140 خط)
│   ├── notificationSound.ts   # صدای اعلان (100 خط)
│   ├── backgroundPlayback.ts  # پخش پس‌زمینه + تشخیص پلتفرم (727 خط)
│   └── iosAudioFix.ts         # رفع مشکل صوتی iOS (371 خط)
│
├── server/                    # بک‌اند Express
│   ├── server.js              # نقطه ورود سرور (137 خط)
│   ├── database.js            # اتصال MongoDB + Change Stream
│   ├── authMiddleware.js      # مiddleware JWT
│   ├── adminMiddleware.js     # مiddleware مجوز ادمین
│   ├── upload.js              # آپلود فایل
│   ├── premiumMiddleware.js   # مiddleware پریمیوم
│   ├── marketRoutes.js        # روت‌های بازارچه
│   ├── notifications.js       # مسیر‌های اعلان‌ها
│   ├── push.js                # Firebase Admin Push
│   ├── pushDebug.js           # دیباگ Push
│   ├── mylibrary-api.js       # API کتابخانه شخصی
│   ├── migrate-user-data.js   # اسکریپت مایگریشن
│   ├── migrate-collections.js # اسکریپت مایگریشن مجموعه‌ها
│   ├── test-push.js           # تست Push
│   ├── session.js             # Session Management
│   │
│   ├── routes/                # مسیرهای API
│   │   ├── auth.js            # احراز هویت (506 خط)
│   │   ├── admin.js           # مدیریت (1083 خط)
│   │   ├── posts.js           # پست‌های اجتماعی (373 خط)
│   │   ├── books.js           # کتاب‌ها
│   │   ├── book-content.js    # محتوای HTML کتاب
│   │   ├── book-covers.js     # کاورهای کتاب
│   │   ├── collections.js     # مجموعه‌ها
│   │   ├── episodes.js        # اپیزودها
│   │   ├── episodes-update.js # به‌روزرسانی اپیزودها
│   │   ├── market.js          # بازارچه
│   │   ├── newsletter.js      # خبرنامه
│   │   ├── search.js          # جستجو
│   │   ├── search-cache.js    # کش جستجو
│   │   ├── media-links.js     # لینک‌های رسانه
│   │   ├── chat.js            # چت AI
│   │   ├── api-proxy.js       # پروکسی API
│   │   ├── ai-proxy.js        # پروکسی هوش مصنوعی
│   │   ├── usage.js           # آمار استفاده
│   │   ├── sync.js            # همگام‌سازی
│   │   ├── users.js           # کاربران
│   │   ├── support.js         # پشتیبانی
│   │   └── mobile-support.js  # پشتیبانی موبایل
│   │
│   ├── models/                # مدل‌های Mongoose
│   │   ├── User.js            # کاربر
│   │   ├── Post.js            # پست اجتماعی
│   │   ├── Comment.js         # کامنت
│   │   ├── Episode.js         # اپیزود
│   │   ├── Collection.js      # مجموعه پادکست
│   │   ├── Book.js            # کتاب
│   │   ├── BookContent.js     # محتوای کتاب
│   │   ├── BookCover.js       # کاور کتاب
│   │   ├── PublishedBook.js   # کتاب منتشر شده
│   │   ├── SupportMessage.js  # پیام پشتیبانی
│   │   ├── Notification.js    # اعلان
│   │   ├── Review.js          # نظر
│   │   ├── ChatSession.js     # نشست چت
│   │   ├── ChatMessage.js     # پیام چت
│   │   ├── UserSubscription.js # اشتراک کاربر
│   │   ├── Playlist.js        # پلی‌لیست
│   │   ├── PodcastSeries.js   # سری پادکست
│   │   └── Order.js           # سفارش
│   │
│   ├── utils/                 # ابزارهای کمکی
│   │   ├── aiClient.js        # کلاینت AI با retry (265 خط)
│   │   ├── corpus.js          # مدیریت corpus محتوایی
│   │   ├── corpusUpdate.js    # به‌روزرسانی corpus
│   │   ├── broadcast.js       # اطلاع‌رسانی WebSocket
│   │   ├── webpush.js         # ارسال Web Push
│   │   ├── webpush-keys.js    # کلیدهای VAPID
│   │   ├── notifications.js   # سیستم اعلان‌ها
│   │   ├── rateLimiter.js     # محدودکننده نرخ
│   │   ├── logger.js          # لاگر
│   │   └── performance.js     # بهینه‌سازی عملکرد
│   │
│   └── data/                  # داده‌های پشتیبان
│       ├── books.ts           # داده‌های اولیه کتاب‌ها
│       ├── database.ts        # داده‌های fallback
│       ├── books-data.json    # داده‌های JSON کتاب‌ها
│       ├── book-covers-data.json # کاورهای کتاب
│       ├── covers.json        # کاورهای اضافی
│       ├── db.json            # داده‌های کامل
│       ├── fallback-data.js   # داده‌های fallback
│       ├── guest-access.json  # دسترسی مهمان
│       └── seed.js            # اسکریپت seed
│
├── electron/                  # اپ دسکتاپ
│   ├── main.js                # نقطه ورود Electron (122 خط)
│   ├── preload.js             # preload script
│   └── assets/                # آیکون‌ها و منابع
│
├── android/                   # پروژه Android (Capacitor)
│   ├── app/
│   │   ├── build.gradle       # تنوزیع Gradle
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/.../MainActivity.java
│   │       └── res/           # آیکون‌ها و منابع
│   ├── build.gradle
│   └── variables.gradle
│
├── ios/                       # پروژه iOS (Capacitor)
│   ├── App/
│   │   ├── Info.plist
│   │   └── public/
│   ├── Podfile
│   └── capacitor.build.json
│
├── public/                    # فایل‌های استاتیک
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── logo.png
│   ├── qrcode.png
│   ├── manifest.json
│   └── sw.js
│
├── scripts/                   # اسکریپت‌ها
│   ├── build-android.sh       # build اندروید
│   ├── deploy-android.sh      # deploy اندروید
│   └── run-android-device.sh  # اجرای روی دستگاه
│
├── test/                      # تست‌ها
│   ├── test-otp.js            # تست OTP
│   └── test-*.js              # تست‌های دیگر
│
├── ws-server/                 # سرور وب‌سوکت (Go)
│   ├── main.go                # سرور Go (354 خط)
│   └── go.mod                 # وابستگی‌های Go
│
└── deploy/                    # اسکریپت‌های deploy
    ├── deploy-fe-only-quick.js # deploy سریع فرانت‌اند
    └── deploy*.js             # اسکریپت‌های دیگر
```

## توضیح پوشه‌ها

### `components/` — 52 کامپوننت
هر کامپوننت یک بخش UI قابل استفاده مجدد است. کامپوننت‌ها به دو دسته تقسیم می‌شوند:
- **عمومی:** Header, Footer, NavigationBar, SearchBar
- **محتوا:** CollectionCard, BookCard, EpisodeCard, CommunityPostCard
- **پخش:** MiniPlayer, FloatingMusicPlayer, MusicPlayerView, YouTubePlayer
- **تعاملی:** CommentSection, PostComposer, CreatePostModal

### `views/` — 25 صفحه
هر view یک صفحه کامل است که در مسیر خاصی نمایش داده می‌شود:
- `HomeView` → `/`
- `SearchView` → `/search`
- `LibraryView` → `/library`
- `PodcastView` → `/collection/:id`
- `EpisodeView` → `/episode/:id`
- `BookView` → `/book/:id`
- `CommunityView` → `/community`
- `AdminPage` → `/admin`
- و...

### `services/` — لایه ارتباطی
تمام درخواست‌های HTTP از طریق `services/api.ts` ارسال می‌شوند. این لایه:
- توکن JWT را به هدر اضافه می‌کند
- خطاها را مدیریت می‌کند
- بافر تأخیری برای شبیه‌سازی شبکه اضافه می‌کند

### `server/` — بک‌اند Express
- `routes/`: مسیرهای API با منطق تجاری
- `models/`: تعریف schemas پایگاه داده
- `utils/`: ابزارهای کمکی (AI، broadcast، push)
