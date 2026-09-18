# بخش ۱۱: کامپوننت‌های React — تحلیل `components/`

## فهرست مطالب
- [مقدمه](#مقدمه)
- [ساختار کلی کامپوننت‌ها](#ساختار-کلی)
- [AppHeader.tsx — هدر اصلی اپلیکیشن](#appheader)
- [Sidebar.tsx — نوار کناری دسکتاپ](#sidebar)
- [BottomTabs.tsx — نوار پایین موبایل](#bottomtabs)
- [MahfelSidebar.tsx — نوار کشویی موبایل](#mahfelsidebar)
- [SearchModal.tsx — مدال جستجو](#searchmodal)
- [MinimizedPlayer.tsx — پلیر کوچک](#minimizedplayer)
- [FullScreenPlayer.tsx — پلیر تمام‌صفحه](#fullscreenplayer)
- [Toast.tsx — پیام‌های لحظه‌ای](#toast)
- [NotificationBanner.tsx — بنر نوتیفیکیشن](#notificationbanner)
- [UpdateDialog.tsx — دیالوگ آپدیت](#updatedialog)
- [InstantView.tsx — نمای فوری متن](#instantview)
- [AlbumViewer.tsx — نمایشگر آلبوم](#albumviewer)
- [WelcomeVideo.tsx — ویدیوی خوش‌آمدگویی](#welcomevideo)
- [OnboardingGuide.tsx — راهنمای شروع](#onboardingguide)
- [UserProfileModal.tsx — مدال پروفایل کاربر](#userprofilemodal)
- [IranAccessWarning.tsx — هشدار دسترسی خارج](#iranaccesswarning)
- [ErrorPages.tsx — صفحات خطا](#errorpages)
- [اتصال به App.tsx](#اتصال-به-apptx)

---

## مقدمه

فولدر `components/` شامل بیش از ۵۰ کامپوننت React است که واحدهای ساختاری رابط کاربری اپلیکیشن «محفل» را تشکیل می‌دهند. این کامپوننت‌ها به‌صورت **functional components** با **React Hooks** پیاده‌سازی شده‌اند و از **TypeScript** برای تایپ‌ایمنی استفاده می‌کنند.

---

## ساختار کلی

```
components/
├── AppHeader.tsx          — هدر بالای صفحه (لوگو + دکمه‌ها)
├── Sidebar.tsx            — سایدبار دسکتاپ
├── BottomTabs.tsx         — تب‌های پایین موبایل
├── MahfelSidebar.tsx      — دراور موبایل
├── SearchModal.tsx        — جستجوی سراسری
├── MinimizedPlayer.tsx    — پلیر مینی (bottom sheet)
├── FullScreenPlayer.tsx   — پلیر تمام‌صفحه
├── Toast.tsx              — Toast notification
├── NotificationBanner.tsx — بنر اعلان بالا
├── UpdateDialog.tsx       — دیالوگ آپدیت اپ
├── InstantView.tsx        — نمایش متن فوری
├── AlbumViewer.tsx        — نمایش آلبوم
├── WelcomeVideo.tsx       — ویدیوی خوش‌آمدگویی
├── OnboardingGuide.tsx    — راهنمای onboarding
├── UserProfileModal.tsx   — پروفایل کاربر
├── IranAccessWarning.tsx  — هشدار خارج از ایران
├── ErrorPages.tsx         — صفحات 404/500
├── ThemeProvider.tsx      — ارائه‌دهنده تم
├── ErrorBoundary.tsx      — مهار خطا
├── SohaLogo.tsx           — لوگوی محفل
└── ... (بیش از ۳۰ کامپوننت دیگر)
```

---

## AppHeader.tsx

**مسیر فایل:** `components/AppHeader.tsx` — ۸۷ سطر

### هدف
نمایش هدر بالای صفحه شامل لوگو، دکمه جستجو، دکمه تم، دکمه ادمین (فقط برای ادمین‌ها)، و آواتار کاربر.

### Interface Props

```typescript
interface AppHeaderProps {
  onOpenAdmin: () => void;      // باز کردن پنل ادمین
  onOpenProfile: () => void;    // باز کردن مدال پروفایل
  onOpenSearch: () => void;     // باز کردن مدال جستجو
  onOpenSidebar: () => void;    // باز کردن سایدبار موبایل
  onToggleTheme: () => void;    // تغییر تم روشن/تیره
  isVisible: boolean;           // آیا هدر نمایش داده شود (انیمیشن)
  liveStream: { isLive: boolean; url: string };  // وضعیت پخش زنده
  theme: 'light' | 'dark';      // تم فعلی
  isAuthenticated: boolean;     // آیا کاربر لاگین است
  user: User | null;            // اطلاعات کاربر
}
```

### ساختار JSX

هدر از یک `grid` سه‌ستونی تشکیل شده:
1. **ستون چپ:** لوگوی SohaIcon که با کلیک به بالای صفحه اسکرول می‌کند
2. **ستون وسط:** SohaLogotype (لوگوتایپ متنی)
3. **ستون راست:** دکمه‌های عملیاتی (جستجو، تم، ادمین، پروفایل)

### نکات کلیدی
- از `backdropFilter: blur(20px)` برای افکت شیشه‌ای استفاده شده (خط ۳۱-۳۳)
- وضعیت `isVisible` با CSS transition انیمیشن ورود/خروج ایجاد می‌کند (خط ۲۴)
- آواتار کاربر اگر عکس نداشته باشد، از `getInitials()` برای نمایش حرف اول استفاده می‌کند (خط ۷۰-۷۳)
- رنگ گرادینت آواتار بر اساس `charCodeAt(0)` نام کاربر محاسبه می‌شود (خط ۷۱)
- دکمه ادمین فقط برای نقش‌های `admin` و `superadmin` نمایش داده می‌شود (خط ۶۲-۶۴)

---

## Sidebar.tsx

**مسیر فایل:** `components/Sidebar.tsx` — ۱۲۵ سطر

### هدف
سایدبار دسکتاپ که شامل ناوبری اصلی، دکمه ادمین، و دکمه تغییر تم است.

### Interface Props

```typescript
interface SidebarProps {
  activeTab: Page;              // تب فعلی
  onTabChange: (tab: Page) => void;  // تغییر تب
  isOpen: boolean;              // وضعیت باز/بسته (موبایل)
  onClose: () => void;          // بستن سایدبار
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  user: User | null;
  isAuthenticated: boolean;
  collapsed?: boolean;          // آیا سایدبار کوچک شده (دسکتاپ)
  onToggleCollapsed?: (v: boolean) => void;
}
```

### آیتم‌های ناوبری

```typescript
const NAV_ITEMS: { page: Page; icon: string; label: string }[] = [
  { page: 'mahfel', icon: 'fas fa-comments', label: 'محفل' },
  { page: 'sowt', icon: 'fas fa-podcast', label: 'صوت' },
  { page: 'library', icon: 'fas fa-book-open', label: 'کتابخانه' },
  { page: 'videos', icon: 'fas fa-video', label: 'ویدیو' },
  { page: 'nashr', icon: 'fas fa-book-reader', label: 'نشر' },
  { page: 'support', icon: 'fas fa-headset', label: 'پشتیبانی' },
];
```

### ساختار JSX

- **Overlay موبایل:** فقط در `lg:hidden` نمایش داده می‌شود و با کلیک بسته می‌شود (خط ۴۶-۴۸)
- **سایدبار دسکتاپ:** با `collapsed` عرض از `w-52` به `w-0` تغییر می‌کند (خط ۵۳-۵۵)
- هر آیتم ناوبری با `data-guide` برای سیستم onboarding مشخص شده (خط ۷۸)

---

## BottomTabs.tsx

**مسیر فایل:** `components/BottomTabs.tsx` — ۲۶۹ سطر

### هدف
نوار پایین موبایل شامل ۵ تب (صوت، کتابخانه، محفل مرکزی، ویدیو، نشر) با قابلیت long-press برای نوشتن پست.

### Interface Props

```typescript
interface BottomTabsProps {
  activeTab: Page;
  onTabChange: (tab: Page) => void;
  onLongPressCentral?: () => void;  // باز کردن مودال نوشتن
  newMahfelMessages: number;
  theme?: 'light' | 'dark';
  userRole?: UserRole;
  hidden?: boolean;          // آیا نوار مخفی شود
  onToggle?: (hidden: boolean) => void;
  chatInput?: boolean;       // نمایش فیلد چت
  chatInputText?: string;
  onChatInputChange?: (text: string) => void;
  onChatSend?: () => void;
  onChatClose?: () => void;
  chatSending?: boolean;
}
```

### CentralButton

دکمه مرکزی (محفل) ویژگی‌های خاصی دارد:
- **Long press:** اگر کاربر admin یا author باشد، نگه‌داشتن ۸۰۰ms دکمه، مودال نوشتن را باز می‌کند (خط ۹۱-۹۸)
- **Progress Circle:** حین نگه‌داشتن، دایره پیشرفت نمایش داده می‌شود (خط ۱۱۴-۱۱۹)
- **Pulse Hint:** برای کاربرانی که قبلاً long-press نکرده‌اند، انیمیشن پالس نمایش داده می‌شود (خط ۱۲۳-۱۲۸)
- **Slide to dismiss:** با کشیدن به پایین، نوار مخفی می‌شود (خط ۲۱۳-۲۱۴)

### طرحبندی

```
[صوت] [کتابخانه] [●محفل●] [ویدیو] [نشر]
              ↑
         CentralButton
```

---

## MahfelSidebar.tsx

**مسیر فایل:** `components/MahfelSidebar.tsx` — ۱۱۰ سطر

### هدف
دراور موبایل که از سمت راست باز می‌شود و ناوبری مشابه Sidebar دسکتاپ را ارائه می‌دهد.

### ویژگی‌ها
- از `translate-x-full` به `translate-x-0` انیمیشن می‌خورد (خط ۴۷)
- آیتم فعال با گرادینت رنگ primary نمایش داده می‌شود (خط ۷۴)
- با انتخاب هر آیتم، دراور خودکار بسته می‌شود (خط ۳۱-۳۴)

---

## SearchModal.tsx

**مسیر فایل:** `components/SearchModal.tsx` — ۱۵۰ سطر

### هدف
مدال جستجوی سراسری که در پادکست‌ها، ویدیوها، کتاب‌ها و نویسندگان جستجو می‌کند.

### Interface Props

```typescript
interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  podcasts: Podcast[];
  videos: Video[];
  books: Book[];
  authors: Author[];
  publishedBooks: PublishedBook[];
  onPodcastSelect: (p: Podcast) => void;
  onVideoSelect: (v: Video) => void;
  onBookSelect: (b: Book) => void;
  onAuthorSelect: (a: Author) => void;
}
```

### جستجوی `useMemo`

جستجو به‌صورت **کلاینت‌ساید** انجام می‌شود (خط ۲۵-۳۵):

```typescript
const results = useMemo(() => {
  const q = query.toLowerCase();
  return {
    podcasts: podcasts.filter(p => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)),
    videos: videos.filter(v => v.title.toLowerCase().includes(q)),
    books: books.filter(b => b.title.toLowerCase().includes(q)),
    authors: authors.filter(a => a.name.toLowerCase().includes(q)),
    publishedBooks: publishedBooks.filter(b => b.title.toLowerCase().includes(q)),
  };
}, [query, podcasts, videos, books, authors, publishedBooks]);
```

### فیلترها
فیلترهای قابل انتخاب: `all`, `podcast`, `video`, `book`, `author`

---

## MinimizedPlayer.tsx

**مسیر فایل:** `components/MinimizedPlayer.tsx` — ۲۵۲ سطر

### هدف
پلیر کوچک (bottom sheet) که هنگام پخش صوت در پایین صفحه نمایش داده می‌شود و قابلیت جابجایی (drag) دارد.

### Interface Props

```typescript
interface MinimizedPlayerProps {
  track: { podcast: Podcast; episode: Episode; episodeIndex: number };
  isPlaying: boolean;
  progress: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onExpand: () => void;           // باز کردن پلیر تمام‌صفحه
  onClose: () => void;            // بستن پلیر
  onSelectPodcast: (podcast: Podcast) => void;
  isVisible: boolean;
  isInLibrary?: boolean;
  onToggleLibrary: () => void;
  onPlayInBackground?: () => void;
  bottomOffset?: number;
  variant?: 'fixed' | 'inline';
  theme?: 'light' | 'dark';
}
```

### سیستم Drag

پلیر از سیستم drag اختصاصی استفاده می‌کند:
- **onDragStart:** موقعیت اولیه ماوس/لمس ذخیره می‌شود (خط ۶۶-۶۹)
- **clampX/clampY:** موقعیت در محدوده صفحه نگه‌داشته می‌شود (خط ۵۳-۶۴)
- ** Moved detection:** اگر جابجایی بیش از ۳px باشد، `moved=true` می‌شود تا کلیک تصادفی جلوگیری شود (خط ۷۸)

### دو حالت نمایش

1. **variant='fixed'** (پیش‌فرض): در پایین صفحه با `position: fixed` (خط ۱۶۶-۲۴۸)
2. **variant='inline'**: در داخل محتوا (خط ۱۰۲-۱۶۰)

### آیتم‌های کنترلی
- کاور اپیزود (چرخش در حالت پخش با `animate-spinSlow`)
- عنوان پادکست و اپیزود
- دکمه‌های قبلی/پخش/بعدی
- دکمه ذخیره در کتابخانه (bookmark)
- دکمه پخش در پس‌زمینه (فقط APK)
- دکمه بستن

---

## FullScreenPlayer.tsx

**مسیر فایل:** `components/FullScreenPlayer.tsx` — ۷۴۴ سطر

### هدف
پلیر تمام‌صفحه صوت با امکانات کامل: کامنت‌گذاری لحظه‌ای، تنظیم سرعت، تایمر خواب، صف پخش، و کنترل حجم.

### Interface Props (انتخابی)

```typescript
interface FullScreenPlayerProps {
  track: { podcast: Podcast; episode: Episode; episodeIndex: number };
  isPlaying: boolean;
  progress: number;
  duration: number;
  authors: Author[];
  onPlayPause: () => void;
  onSeek: (progress: number) => void;
  onMinimize: () => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  comments: Comment[];
  onAddComment: (text, track, timestamp?, parentId?) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  repeatMode: 'none' | 'one' | 'all';
  isShuffle: boolean;
  sleepTimer: number | null;
  onSleepTimer: (t: number | null) => void;
  onPlayInBackground: () => void;
  // ... سایر پراپ‌ها
}
```

### گزینه‌های تایمر خواب

```typescript
const SLEEP_OPTIONS = [
  { label: 'خاموش', value: null },
  { label: '۵ دقیقه', value: 5 * 60 * 1000 },
  { label: '۱۵ دقیقه', value: 15 * 60 * 1000 },
  { label: '۳۰ دقیقه', value: 30 * 60 * 1000 },
  { label: '۱ ساعت', value: 60 * 60 * 1000 },
];
```

### ویژگی‌های کلیدی
- **Seek Preview:** پیش‌نمایش موقعیت هنگام جابجایی نوار پیشرفت
- **Episode Comments:** نمایش نظرات مرتبط با اپیزود جاری
- **Queue View:** نمایش صف پخش
- **Swipe to close:** بستن با کشیدن به پایین
- **Background Audio:** فعال‌سازی پخش در پس‌زمینه (APK)

---

## Toast.tsx

**مسیر فایل:** `components/Toast.tsx` — ۵۰ سطر

### هدف
پیام کوتاه لحظه‌ای (类似 اسنک‌بار) که به‌صورت خودکار بعد از ۳ ثانیه بسته می‌شود.

### Interface Props

```typescript
interface ToastProps {
  message: string;         // متن پیام
  onClose: () => void;     // فراخوانی بستن
  id?: number;             // شناسه یکتا
  duration?: number;       // مدت نمایش (پیش‌فرض: ۳۰۰۰ms)
  image?: string;          // تصویر اختیاری (آواتار)
  name?: string;           // نام اختیاری
}
```

### مکانیزم

-状态 `isVisible` با `useState` کنترل می‌شود (خط ۱۴)
- پس از `duration` ms، `isVisible` false شده و بعد از ۳۰۰ms (زمان transition) `onClose` فراخوانی می‌شود (خط ۲۱-۲۴)
- استایل: `fixed top-5 right-5` با `backdrop-blur-md` (خط ۳۱)
- `z-[9999]` تضمین می‌کند روی همه چیز نمایش داده شود

---

## NotificationBanner.tsx

**مسیر فایل:** `components/NotificationBanner.tsx` — ۷۵ سطر

### هدف
بنر نوتیفیکیشن که در پایین صفحه نمایش داده می‌شود و شامل عنوان، متن، و دکمه «مشاهده» است.

### Interface Props

```typescript
interface NotificationBannerProps {
  title: string;
  body: string;
  link?: string;
  onClose: () => void;
  onClick?: (link?: string) => void;
}
```

### ویژگی‌ها
- **Progress Bar:** نوار پیشرفت با انیمیشن CSS که بعد از ۲ ثانیه بسته می‌شود (خط ۵۴-۶۹)
- **position:** `fixed bottom-20 left-1/2 -translate-x-1/2` — وسط پایین صفحه
- **Auto dismiss:** بعد از ۲۰۰۰ms خودکار بسته می‌شود (خط ۲۴)
- **Manual dismiss:** با کلیک دکمه ✕ یا دکمه «مشاهده»

---

## UpdateDialog.tsx

**مسیر فایل:** `components/UpdateDialog.tsx` — ۱۵۲ سطر

### هدف
دیالوگ آپدیت اپلیکیشن که برای هر دو پلتفرم اندروید (APK) و دسکتاپ کار می‌کند.

### Interface Props

```typescript
interface UpdateDialogProps {
  update: AppUpdateInfo;   // اطلاعات آپدیت از سرور
  isMobile: boolean;       // آیا اندروید است
  onClose: () => void;
}
```

### مراحل (Phase)

```typescript
const [phase, setPhase] = useState<'ask' | 'downloading' | 'done'>('ask');
```

1. **ask:** نمایش اطلاعات آپدیت و دکمه دانلود
2. **downloading:** نمایش نوار پیشرفت با درصد
3. **done:** تکمیل دانلود

### مکانیزم دانلود اندروید

```typescript
const startDownload = () => {
  if (isMobile) {
    setPhase('downloading');
    const started = downloadAndInstallApk(update.apkUrl || '');
    // ...
  } else {
    desktopOpenExternal(update.desktopUrl || '');
  }
};
```

- پیشرفت دانلود از طریق رویداد `mahfel-apk-progress` دریافت می‌شود (خط ۳۳-۴۹)
- در دسکتاپ، لینک دانلود در مرورگر خارجی باز می‌شود

### رد کردن آپدیت

```typescript
const handleDismiss = () => {
  const version = isMobile ? update.apkVersion : update.desktopVersion;
  localStorage.setItem(isMobile ? 'update_dismissed_apk' : 'update_dismissed_desktop', version);
  onClose();
};
```

---

## InstantView.tsx

**مسیر فایل:** `components/InstantView.tsx` — ۱۹۴ سطر

### هدف
نمایش متن به‌صورت تمام‌صفحه با قابلیت تغییر اندازه فونت و تم (تیره/روشن/کاغذی).

### Interface Props

```typescript
interface InstantViewProps {
  title: string;
  content: string;
  onClose: () => void;
  subtitle?: string;
  isHtml?: boolean;    // آیا محتوا HTML است
}
```

### تقسیم متن (Read Bridge Rest)

متن به سه بخش تقسیم می‌شود (خط ۵۸-۱۰۷):
1. **read:** ۱۵۰ کلمه اول (با opacity کم)
2. **bridge:** ۳ کلمه بعدی (هایلایت شده با primary)
3. **rest:** باقی‌مانده متن

### تم‌ها

```typescript
const getThemeClasses = () => {
  switch(theme) {
    case 'dark': return { bg: 'bg-[#0f0f0f]', text: 'text-white' };
    case 'light': return { bg: 'bg-[#ffffff]', text: 'text-gray-800' };
    default: return { bg: 'bg-[#f4ecd8]', text: 'text-[#433422]' }; // sepia
  }
};
```

---

## AlbumViewer.tsx

**مسیر فایل:** `components/AlbumViewer.tsx` — ۱۰۱ سطر

### هدف
نمایش محتوای آلبوم (صوتی یا ویدیویی) در یک مدال با امکان پخش همه یا تک‌قطعه.

### Interface Props

```typescript
interface AlbumViewerProps {
  album: any;
  onClose: () => void;
  onPlayAll: (album: any) => void;
  onPlayItem: (item: any) => void;
}
```

---

## WelcomeVideo.tsx

**مسیر فایل:** `components/WelcomeVideo.tsx` — ۱۰۸ سطر

### هدف
نمایش ویدیوی خوش‌آمدگویی برای کاربران جدید. ویدیو به‌صورت loop و muted پخش می‌شود.

### منابع ویدیو

```typescript
const sources = useMemo(() => {
  if (videoSrc) return [videoSrc];
  const isMobile = window.innerWidth < 768;
  return isMobile ? [DEFAULT_MOBILE_SRC, DEFAULT_DESKTOP_SRC] : [DEFAULT_DESKTOP_SRC];
}, [videoSrc]);
```

### Fallback mechanism
اگر ویدیوی اولی بارگذاری نشد (timeout ۱۰ ثانیه)، منبع بعدی تلاش می‌شود (خط ۲۶-۳۴).

---

## OnboardingGuide.tsx

**مسیر فایل:** `components/OnboardingGuide.tsx` — ۱۹۲ سطر

### هدف
راهنمای تعاملی برای آشنایی کاربران جدید با بخش‌های مختلف اپلیکیشن.

### Interface Props

```typescript
interface OnboardingGuideProps {
  steps: GuideStep[];     // مراحل راهنما
  onComplete: () => void; // فراخوانی پایان
  role: UserRole;         // نقش کاربر (برای انتخاب مراحل متفاوت)
}

interface GuideStep {
  selector: string;       // CSS selector عنصر هدف
  title: string;
  description: string;
  icon: string;
  color: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}
```

### مکانیزم موقعیت‌یابی

```typescript
const calculatePosition = useCallback(() => {
  const el = document.querySelector(step.selector);
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => {
    const rect = el.getBoundingClientRect();
    // محاسبه موقعیت کارت راهنما بر اساس rect عنصر هدف
  }, 350);
}, [step]);
```

### مراحل متفاوت بر اساس نقش
- **کاربر عادی:** `USER_STEPS` از `data/guideSteps`
- **نویسنده:** `AUTHOR_STEPS`
- **ادمین:** `ADMIN_STEPS`

---

## UserProfileModal.tsx

**مسیر فایل:** `components/UserProfileModal.tsx` — ۱۰۰ سطر

### هدف
نمایش پروفایل عمومی کاربر شامل نام، نقش، وضعیت بن/میوت، و پست‌های اخیر.

### لیبل‌های نقش

```typescript
const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'ادمین', color: '#7c5cff' },
  author: { label: 'نویسنده', color: '#10b981' },
  user: { label: 'کاربر', color: '#2e86c1' },
};
```

### دریافت اطلاعات
اطلاعات از سرور از طریق `getUserById()` دریافت می‌شود (خط ۲۲-۳۰).

---

## IranAccessWarning.tsx

**مسیر فایل:** `components/IranAccessWarning.tsx` — ۵۸ سطر

### هدف
نمایش هشدار به کاربرانی که از خارج از ایران متصل شده‌اند.

### مکانیزم تشخیص

```typescript
const isIran = tz.includes('Tehran') || tz.includes('Iran') || lang.startsWith('fa') || offset === -210;
// + بررسی IP از طریق /api/check-ip
```

---

## ErrorPages.tsx

**مسیر فایل:** `components/ErrorPages.tsx` — ۲۶۶ سطر

### هدف
صفحات خطای سفارشی برای 404, 500, 503, 408, 403 و همچنین تشخیص آفلاین و VPN.

### کامپوننت‌ها
- `ErrorPages`: صفحه خطای عمومی
- `NotFoundPage`: صفحه 404
- `ServerErrorPage`: صفحه خطای سرور 500
- `OfflineDetector`: تشخیص قطعی اینترنت
- `NetworkErrorPage`: صفحه خطای شبکه
- `VPNBanner`: بنر هشدار VPN
- `useVPNDetection`: هوک تشخیص VPN

---

## اتصال به App.tsx

### نحوه استفاده در AppInner

تمام کامپوننت‌ها در `App.tsx` (خط ۲۰۳۳-۲۲۷۸) استفاده می‌شوند:

```tsx
return (
  <div className="bg-background flex flex-col relative font-sans text-text-primary">
    <IranAccessWarning />
    <VPNBanner isVPN={isVPN} onDismiss={dismissVPN} />
    <div className="app-container flex-1 flex min-h-0">
      <Sidebar ... />  {/* سایدبار دسکتاپ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Suspense fallback={<LoadingPage />}>{renderActivePage()}</Suspense>
        {isWriting && <WritingModal ... />}
        {currentTrack && (
          <>
            {isPlayerExpanded && <FullScreenPlayer ... />}
            {!isPlayerExpanded && <MinimizedPlayer ... />}
          </>
        )}
        {activeVideo && isVideoMini && <VideoPlayerPage isMini ... />}
        <SearchModal ... />
        <BottomTabs ... />
        <MahfelSidebar ... />
        {toast && <Toast ... />}
        {showUpdateDialog && <UpdateDialog ... />}
        {notif && <NotificationBanner ... />}
        {showWelcomeVideo && <WelcomeVideo ... />}
        {showOnboarding && <OnboardingGuide ... />}
      </div>
    </div>
  </div>
);
```

### الگوی اتصال
1. کامپوننت‌ها state و callbackهای App.tsx را از طریق **props** دریافت می‌کنند
2. هیچ **prop drilling** عمیقی وجود ندارد — تمام state در AppInner متمرکز است
3. برخی کامپوننت‌ها (مثل Sidebar) مستقیماً `onTabChange` را از App.tsx دریافت می‌کنند
4. کامپوننت‌های پیچیده (مثل FullScreenPlayer) بیش از ۳۰ prop دریافت می‌کنند
5. از `React.lazy()` برای lazy loading صفحات استفاده شده (خط ۲۵-۴۶)

### طراحی معماری
- **All state in one place:** تمام state در `AppInner` متمرکز است
- **No global state library:** از Redux/Zustand استفاده نشده
- **Callback pattern:** تمام توابع تغییر state به‌صورت props ارسال می‌شوند
- **Lazy loading:** صفحات با `React.lazy` و `Suspense` بارگذاری تنبل دارند
