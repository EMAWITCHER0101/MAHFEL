# بخش ۱۲: صفحات (Views) — تحلیل `views/`

## فهرست مطالب
- [مقدمه](#مقدمه)
- [ساختار کلی صفحات](#ساختار-کلی)
- [CommentsCommunityPage.tsx — صفحه محفل](#commentscommunitypage)
- [SowtPage.tsx — صفحه صوت (پادکست)](#sowtpage)
- [LibraryPage.tsx — صفحه کتابخانه](#librarypage)
- [VideoVaultPage.tsx — صفحه ویدیو](#videovaultpage)
- [NashrPage.tsx — صفحه نشر](#nashrpage)
- [SupportPage.tsx — صفحه پشتیبانی](#supportpage)
- [AiAssistantPage.tsx — دستیار هوش مصنوعی](#aiassistantpage)
- [AdminPage.tsx — پنل مدیریت](#adminpage)
- [LoginPage.tsx — صفحه ورود](#loginpage)
- [VideoPlayerPage.tsx — پخش ویدیو](#videoplayerpage)
- [PlaylistPage.tsx — صفحه پادکست](#playlistpage)
- [PostCommentsPage.tsx — نظرات پست](#postcommentspage)
- [ UserProfilePage.tsx — پروفایل کاربر](#userprofilepage)
- [InterestsPage.tsx — انتخاب علایق](#interestspage)
- [LoadingPage.tsx — صفحه بارگذاری](#loadingpage)
- [نحوه اتصال به App.tsx](#اتصال-به-apptx)

---

## مقدمه

فولدر `views/` شامل صفحات اصلی اپلیکیشن «محفل» است. هر view یک صفحه کامل را نمایش می‌دهد و از طریق `renderActivePage()` در `App.tsx` رندر می‌شود. این صفحات با **React.lazy()** به‌صورت lazy loading بارگذاری می‌شوند.

---

## ساختار کلی

```
views/
├── CommentsCommunityPage.tsx  — صفحه اصلی محفل (چت/پست)
├── SowtPage.tsx               — لیست پادکست‌ها (صوت)
├── LibraryPage.tsx            — کتابخانه شخصی
├── VideoVaultPage.tsx         — آرشیو ویدیوها
├── NashrPage.tsx              — صفحه نشر (کتاب/یادداشت)
├── SupportPage.tsx            — پشتیبانی
├── AiAssistantPage.tsx        — دستیار AI
├── AdminPage.tsx              — پنل مدیریت
├── LoginPage.tsx              — صفحه ورود/ثبت‌نام
├── VideoPlayerPage.tsx        — پخش ویدیو
├── PlaylistPage.tsx           — جزئیات پادکست
├── PostCommentsPage.tsx       — نظرات یک پست
├── UserProfilePage.tsx        — پروفایل کاربر
├── AuthorPage.tsx             — پروفایل نویسنده
├── BookPage.tsx               — جزئیات کتاب
├── InterestsPage.tsx          — انتخاب علایق
├── LoadingPage.tsx            — صفحه لودینگ
├── HomePage.tsx               — صفحه خانه
└── ... (صفحات دیگر)
```

---

## CommentsCommunityPage.tsx

**مسیر فایل:** `views/CommentsCommunityPage.tsx` — ۲۷۶۶ سطر

### هدف
صفحه اصلی «محفل» — مرکز تعاملات اجتماعی شامل پست‌ها، نظرات، ویدیوها، و پادکست‌ها.

### Interface Props

```typescript
// Props دریافتی از App.tsx
interface MahfelPageProps {
  posts: Post[];
  videos: Video[];
  podcasts: Podcast[];
  authors: Author[];
  publishedBooks: PublishedBook[];
  comments: Comment[];
  currentUser?: string;
  userRole?: UserRole;
  albums: { mine: any[]; shared: any[] };
  savedPostIds: string[];
  // ... callbackهای متعدد
}
```

### ساختار کلی

این صفحه پیچیده‌ترین view در اپلیکیشن است و شامل بخش‌های زیر است:

1. **Header:** هدر با لوگو و دکمه‌ها
2. **Chat Feed:** لیست پست‌ها به‌صورت چت (جدیدترین بالا)
3. **Post Cards:** کارت‌های پست با قابلیت لایک، کامنت، ذخیره
4. **Video Cards:** کارت‌های ویدیو با پخش inline
5. **Audio Cards:** کارت‌های صوتی با پخش inline
6. **Book Cards:** کارت‌های کتاب/یادداشت
7. **Album Cards:** کارت‌های آلبوم
8. **Chat Input:** فیلد ارسال پیام

### کامپوننت‌های داخلی

#### DateSeparator
جداساز تاریخ بین پست‌ها:
```tsx
const DateSeparator: React.FC<{ date: string }> = ({ date }) => (
  <div className="text-center my-4">
    <span className="backdrop-blur-md text-[10px] font-black px-4 py-1.5 rounded-full">
      {formatDateSeparator(date)}
    </span>
  </div>
);
```

#### QuoteChip و QuoteBlock
نمایش نقل‌قول در کامنت‌ها:
- **QuoteChip:** نقل‌قول کوتاه در حالت فشرده
- **QuoteBlock:** نقل‌قول کامل با نام نویسنده

#### ActionMenu
منوی عملیات (پاسخ/نقل‌قول/لایک/ویرایش/حذف):
```typescript
const useActionMenu = () => {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const openAt = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + 2, right: document.documentElement.clientWidth - r.right });
  }, []);
  return { pos, openAt, close: () => setPos(null) };
};
```

### ویژگی‌های کلیدی
- **Real-time updates:** پست‌ها از طریق WebSocket به‌روز می‌شوند
- **Infinite scroll:** بارگذاری پست‌های بیشتر با اسکرول
- **Media lightbox:** نمایش تمام‌صفحه تصاویر و ویدیوها
- **Inline audio:** پخش صوت بدون باز شدن پلیر
- **Brand mode:** ادمین می‌تواند با نام «سرای هنر و اندیشه» پست بگذارد

---

## SowtPage.tsx

**مسیر فایل:** `views/SowtPage.tsx` — ۲۳۱ سطر

### هدف
صفحه لیست پادکست‌ها (صوت) با قابلیت فیلتر بر اساس سال، نوع، و جستجو.

### Interface Props

```typescript
interface SowtPageProps {
  podcasts: Podcast[];
  authors: Author[];
  liveStream: { isLive: boolean; title: string; url: string };
  onPodcastSelect: (podcast: Podcast) => void;
  onPlay: (podcast: Podcast, episodeIndex: number) => void;
  userInterests: string[];
  isHeaderVisible: boolean;
  onAuthorSelect: (author: Author) => void;
  userLibrary: string[];
  onToggleLibrary: (id: number) => void;
  onShare: (title: string, text: string) => void;
  onToggleSidebar?: () => void;
  theme?: 'light' | 'dark';
  user?: User | null;
}
```

### فیلترها

```typescript
const allAudio = useMemo(() => audioPodcasts(podcasts), [podcasts]);
// فیلتر بر اساس دسته‌بندی 'صوت'

const years = useMemo(() => {
  const y = [...new Set(allAudio.map(p => p.year))].sort((a, b) => b - a);
  return y;
}, [allAudio]);
```

### ساختار صفحه
1. **بنر پخش زنده:** اگر liveStream.isLive=true باشد
2. **فیلتر سال:** دکمه‌های سال‌های مختلف
3. **فیلتر نوع:** دسته‌بندی پادکست‌ها
4. **جستجو:** فیلد جستجو در عنوان و توضیحات
5. **لیست پادکست‌ها:** کارت‌های پادکست با کاور و عنوان

---

## LibraryPage.tsx

**مسیر فایل:** `views/LibraryPage.tsx` — ۱۰۰۶ سطر

### هدف
کتابخانه شخصی کاربر شامل ویدیوها، پادکست‌ها، اپیزودها، آلبوم‌ها، یادداشت‌ها، پست‌ها، نشان‌ها، و صف پخش.

### Interface Props (انتخابی)

```typescript
interface LibraryPageProps {
  savedVideoIds: string[];
  allVideos: Video[];
  onPlayVideo: (video: Video) => void;
  onRemoveVideo: (id: string) => void;
  savedPodcastIds?: string[];
  savedEpisodes?: { podcastId: string; episodeIndex: number }[];
  allPodcasts?: Podcast[];
  authors?: Author[];
  albums?: { mine: any[]; shared: any[] };
  queue?: any[];
  queueAuto?: boolean;
  notes?: any[];
  bookmarks?: any[];
  posts?: Post[];
  savedPostIds?: string[];
  publishedBooks?: PublishedBook[];
  savedNoteIds?: (string | number)[];
  // ... callbackهای متعدد
}
```

### تب‌های کتابخانه

کتابخانه شامل بخش‌های زیر است:
1. **ویدیوها:** ویدیوهای ذخیره شده
2. **پادکست‌ها:** پادکست‌های ذخیره شده
3. **اپیزودها:** اپیزودهای جداگانه ذخیره شده
4. **آلبوم‌ها:** آلبوم‌های شخصی و اشتراکی
5. **یادداشت‌ها:** یادداشت‌های شخصی
6. **پست‌ها:** پست‌های ذخیره شده
7. **نشان‌ها:** نشان‌های کتاب (bookmarks)
8. **صف پخش:** صف پخش فعلی

### ویرایشگر یادداشت

```typescript
const [noteEditor, setNoteEditor] = useState<{ note: any } | null>(null);
const openNoteEditor = (n: any) => {
  setNoteEditor({ note: n });
  setNoteEditTitle(String(n.title || ''));
  setNoteEditContent(String(n.contentHtml || n.description || ''));
};
```

### مدیریت صف پخش
- **Queue Auto:** آیا پخش خودکار ادامه یابد
- **Play Queue Item:** پخش یک آیتم از صف
- **Remove from Queue:** حذف از صف
- **Clear Queue:** پاک کردن صف

---

## VideoVaultPage.tsx

**مسیر فایل:** `views/VideoVaultPage.tsx` — ۳۰۸ سطر

### هدف
آرشیو ویدیوها با نمایش پلی‌لیست‌ها و ویدیوهای تکی.

### Interface Props

```typescript
interface VideoVaultPageProps {
  videos: Video[];
  onVideoSelect: (video: Video) => void;
  user?: { name?: string; avatar?: string } | null;
  theme?: 'light' | 'dark';
  onOpenSidebar?: () => void;
  onOpenSearch?: () => void;
  onPlaylistOpen?: (open: boolean) => void;
  vaultBackSignal?: number;
}
```

### تب‌ها

```typescript
type Tab = 'videos' | 'playlists' | 'both' | 'about';
```

1. **videos:** فقط ویدیوها
2. **playlists:** فقط پلی‌لیست‌ها
3. **both:** هر دو
4. **about:** درباره کانال

### اطلاعات کانال

```typescript
const CHANNEL = {
  name: 'سیمای هنر و اندیشه',
  username: 'soha_sima',
  followers: '۴۸۲',
  following: '۶',
  videos: '۲۴۸',
  bio: 'سیما؛ سیمای هنر و اندیشه...',
  aparat: 'soha_sima@',
};
```

### بارگذاری پلی‌لیست‌ها
پلی‌لیست‌ها از API دریافت می‌شوند:
```typescript
const loadPlaylists = useCallback(async () => {
  setLoading(true);
  const data = await getVideoPlaylists();
  setPlaylists(data || []);
  setLoading(false);
}, []);
```

---

## NashrPage.tsx

**مسیر فایل:** `views/NashrPage.tsx` — ۲۰۵۲ سطر

### هدف
صفحه «نشر» شامل کتاب‌ها، یادداشت‌ها، سیستم سبد خرید، پرداخت، و خواننده کتاب.

### ویژگی‌ها
- **کتاب‌ها:** نمایش کتاب‌های منتشر شده
- **یادداشت‌ها:** یادداشت‌های کاربران
- **سبد خرید:** سیستم خرید کتاب‌ها
- **پرداخت کیف پول:** صفحه پرداخت با کارت بانکی
- ** BookReader:** خواننده کتاب با فرمت HTML
- **ویرایشگر یادداشت:** ایجاد و ویرایش یادداشت

### صفحه پرداخت کیف پول

```typescript
const WalletPaymentPage: React.FC<{
  step: 'amount' | 'processing' | 'done';
  amount: string;
  cardNumber: string;
  cvv2: string;
  expMonth: string;
  expYear: string;
  captcha: string;
  // ... سایر فیلدها
}> = ({ ... }) => { ... };
```

### صفحات داخلی
- `NoteDetailView`: نمایش جزئیات یادداشت
- `BookDetailView`: نمایش جزئیات کتاب

---

## SupportPage.tsx

**مسیر فایل:** `views/SupportPage.tsx` — ۱۸۱ سطر

### هدف
صفحه پشتیبانی برای ارسال پیام‌های پشتیبانی (باگ، پیشنهاد، سؤال، سایر).

### دسته‌بندی‌ها

```typescript
const CATEGORIES: { id: SupportCategory; icon: string; label: string; color: string }[] = [
  { id: 'bug', icon: 'fa-bug', label: 'گزارش باگ', color: '#ef4444' },
  { id: 'suggestion', icon: 'fa-lightbulb', label: 'پیشنهاد', color: '#f59e0b' },
  { id: 'question', icon: 'fa-question-circle', label: 'سؤال', color: '#3b82f6' },
  { id: 'other', icon: 'fa-envelope', label: 'سایر', color: '#10b981' },
];
```

### ارسال پیام

```typescript
const handleSubmit = async () => {
  if (!message.trim() || sending) return;
  setSending(true);
  const res = await submitSupportMessage({
    name: user?.name,
    contact: contact.trim(),
    category,
    message: message.trim(),
  });
  setSending(false);
  if (res) { setSent(true); }
};
```

---

## AiAssistantPage.tsx

**مسیر فایل:** `views/AiAssistantPage.tsx` — ۷۰۷ سطر

### هدف
دستیار هوش مصنوعی برای جستجو، خلاصه‌سازی، و پاسخ به سؤالات درباره محتوا.

### Interface Props

```typescript
interface AiAssistantPageProps {
  podcasts: Podcast[];
  videos: Video[];
  posts: Post[];
  books: PublishedBook[];
  authors: Author[];
  onPlayPodcast: (podcast: Podcast, episodeIndex: number) => void;
  onPlayVideo: (video: Video) => void;
  onShowBook: (book: PublishedBook) => void;
}
```

### پیام خوش‌آمدگویی

```typescript
const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `سلام! 👋 من **محفل AI** هستم، دستیار هوشمند پادکست، کتاب و ویدیو.
  میتونم:
  🎙️ **جستجو** پادکست‌ها و ویدیوها و کتاب‌ها
  📋 **خلاصه‌سازی** هر محتوایی
  🔍 **پاسخ** به سوالاتت درباره محتوا`,
};
```

### قابلیت‌ها
- **Chat session:** مدیریت جلسات چت
- **RAG sources:** نمایش منابع پاسخ AI
- **Content context:** انتخاب محتوا به‌عنوان زمینه
- **Smart search:** جستجوی هوشمند

---

## AdminPage.tsx

**مسیر فایل:** `views/AdminPage.tsx` — ۳۴۷۹ سطر

### هدف
پنل مدیریت شامل آمار، مدیریت کاربران، پست‌ها، نظرات، پادکست‌ها، ویدیوها، کتاب‌ها، نوتیفیکیشن‌ها، و تنظیمات.

### ویژگی‌ها (خط ۷)

```typescript
import {
  uploadFile, getAdminStats, getAdminUsers, updateUserRole, deleteUser,
  getAdminPosts, adminDeletePost, adminUpdatePost, getAdminComments,
  adminDeleteComment, adminUpdateComment, getPodcasts, getBooks,
  getAuthors, getVideos, getComments, getPosts, getPublishedBooks,
  getAdminAnalytics, muteUser, unmuteUser, unbanUser, banUser,
  resetUserWarnings, getNotifications, adminSendNotification,
  // ... بیش از ۵۰ تابع API
} from '../services/api';
```

### تب‌های مدیریت
1. **آمار کلی:** آمار کاربران، پست‌ها، نظرات
2. **کاربران:** مدیریت نقش‌ها، بن، میوت
3. **پست‌ها:** ویرایش، حذف، پین
4. **نظرات:** مدیریت نظرات
5. **پادکست‌ها:** افزودن، ویرایش، حذف
6. **ویدیوها:** مدیریت ویدیوها
7. **کتاب‌ها:** مدیریت کتاب‌ها
8. **یادداشت‌ها:** تأیید/حذف یادداشت‌ها
9. **نویسندگان:** مدیریت نویسندگان
10. **نسخه‌ها:** آپدیت اپلیکیشن
11. **خریدها:** مدیریت درخواست‌های خرید
12. **پشتیبانی:** مدیریت پیام‌های پشتیبانی
13. **نوتیفیکیشن‌ها:** ارسال نوتیفیکیشن همگانی
14. **تنظیمات:** تنظیمات سیستم
15. **تحلیل:** نمودارها و آمار تفصیلی

### ویرایشگر هوشمند

```typescript
const SmartEditButton = ({ text, onEdited }) => {
  const handleSmartEdit = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: { systemInstruction: "شما یک ویراستار حرفه‌ای هستید..." },
    });
    if (response.text) onEdited(response.text);
  };
};
```

---

## LoginPage.tsx

**مسیر فایل:** `views/LoginPage.tsx` — ۷۸۲ سطر

### هدف
صفحه ورود، ثبت‌نام، و بازیابی رمز عبور با سیستم OTP.

### حالت‌ها

```typescript
const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
const [step, setStep] = useState<'form' | 'otp' | 'password' | 'newPassword' | 'profile' | 'admin' | 'author'>('form');
```

### مراحل ثبت‌نام
1. **form:** پر کردن فرم (نام، شماره، رمز)
2. **otp:** دریافت و تأیید کد OTP
3. **profile:** تکمیل پروفایل (آواتار، علایق)

### مراحل بازیابی رمز
1. **form:** وارد کردن شماره موبایل
2. **otp:** تأیید کد OTP
3. **newPassword:** وارد کردن رمز جدید

### ویژگی‌ها
- **OTP autofill:** پر کردن خودکار کد OTP در اندروید
- **Avatar crop:** برش آواتار با زوم و جابجایی
- **Admin/Author role:** انتخاب نقش با رمز امنیتی
- **Password visibility:** نمایش/مخفی کردن رمز

---

## سایر صفحات

### VideoPlayerPage.tsx
پخش ویدیو با دو حالت:
- **isMini=false:** تمام‌صفحه با نظرات و ویدیوهای مرتبط
- **isMini=true:** مینی پلیر در گوشه صفحه

### PlaylistPage.tsx
جزئیات پادکست شامل:
- **تب about:** توضیحات و نویسنده
- **تب episodes:** لیست اپیزودها
- **تب comments:** نظرات مرتبط

### PostCommentsPage.tsx
صفحه نظرات یک پست خاص با:
- نمایش پست اصلی
- لیست نظرات به‌صورت درختی
- فیلتر نظرات بر اساس پادکست/ویدیو

### AuthorPage.tsx
پروفایل نویسنده شامل:
- اطلاعات شخصی
- پادکست‌ها
- کتاب‌ها
- ویدیوها

### BookPage.tsx
جزئیات کتاب شامل:
- اطلاعات کتاب
- پادکست‌های مرتبط
- نظرات

### InterestsPage.tsx
انتخاب علایق کاربر جدید برای شخصی‌سازی محتوا.

### LoadingPage.tsx
صفحه بارگذاری اولیه با انیمیشن.

---

## نحوه اتصال به App.tsx

### renderActivePage()

تمام صفحات از طریق `renderActivePage()` در `App.tsx` (خط ۱۷۸۴-۲۰۲۱) رندر می‌شوند:

```typescript
const renderActivePage = () => {
  // اولویت‌ها بر اساس state
  if (selectedPostForComments) return <PostCommentsPage ... />;
  if (selectedVideoComment) return <PostCommentsPage ... />;
  if (selectedPodcast) return <PlaylistPage ... />;
  if (selectedAuthor) return <AuthorPage ... />;
  if (selectedBook) return <BookPage ... />;
  if (selectedPublishedBook) return <NoteDetailView/BookDetailView ... />;
  if (activeVideo && !isVideoMini) return <VideoPlayerPage ... />;

  // صفحات اصلی بر اساس activeTab
  switch (activeTab) {
    case 'mahfel': return <MahfelPage ... />;
    case 'sowt': return <SowtPage ... />;
    case 'videos': return <VideoVaultPage ... />;
    case 'nashr': return <NashrPage ... />;
    case 'library': return <LibraryPage ... />;
    case 'support': return <SupportPage ... />;
    case 'ai': return <AiAssistantPage ... />;
    default: return null;
  }
};
```

### الگوی اتصال

1. **State-driven rendering:** صفحه فعال بر اساس state تعیین می‌شود
2. **Props passing:** تمام داده‌ها و callbackها از App.tsx ارسال می‌شوند
3. **Lazy loading:** صفحات با `React.lazy` و `Suspense` بارگذاری می‌شوند
4. **No routing library:** از react-router استفاده نشده — state-based navigation
5. **Layer system:** سیستم لایه‌ها برای مدیریت صفحات باز (خط ۱۷۰-۲۲۶)

### سیستم لایه‌ها

```typescript
const openLayers: string[] = [];
if (appState === 'admin') openLayers.push('admin');
if (isWriting) openLayers.push('writing');
if (instantView) openLayers.push('instant');
if (isProfileOpen) openLayers.push('profile');
if (isSearchOpen) openLayers.push('search');
// ...
const layersKey = openLayers.join('>');
```

این سیستم به دکمه «بازگشت» مرورگر/سیستم اجازه می‌دهد لایه‌ها را یکی‌یکی ببندد.
