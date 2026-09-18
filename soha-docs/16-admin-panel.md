# پنل مدیریت (AdminPage.tsx)

> [!info] اطلاعات کلی فایل
> - **مسیر فایل اصلی:** `views/AdminPage.tsx`
> - **تعداد خطوط:** ۳۴۷۹ خط
> - **تعداد تب‌ها:** ۱۷ تب مدیریتی
> - **تاریخ آخرین بررسی:** ۱۴۰۵/۰۶/۲۱
> - **واردیت‌ها:** `React`, `types`, `services/api`, `utils/aparatApi`, `@google/genai`, `components/AdminCharts`, `components/BookReader`, `components/AdminSalesPanel`

---

## ۱. نمای کلی (Overview)

### هدف و کاربرد

پنل مدیریت (Admin Panel) یک کامپوننت فول‌اسکرین (`fixed inset-0`) است که تمام قابلیت‌های مدیریتی اپلیکیشن سها سیما را در خود جای داده است. این پنل از طریق تب‌های مجزا، مدیریت کاربران، محتوا، آمار، تنظیمات و پشتیبانی را فراهم می‌کند.

### کاربران مجاز

| نقش | توضیحات |
|------|---------|
| `superadmin` | مدیر سیستم — به همه تب‌ها و دسترسی‌ها دسترسی کامل دارد |
| `admin` | ادمین — بر اساس دسترسی‌های اختصاصی (permissions) به تب‌های مشخصی دسترسی دارد |
| `author` | نویسنده — فقط به تب‌های تعیین‌شده بر اساس نقش نویسنده دسترسی دارد |
| `user` | کاربر عادی — به هیچ تبی دسترسی ندارد (مگر دسترسی اختصاصی) |

> [!warning] نکته مهم
> تب `roles` (مدیریت نقش) فقط برای `superadmin` قابل مشاهده و استفاده است. تب `dashboard` و `roles` هیچ محدودیت پرمیشنی ندارند (مقدار `null` در `TAB_PERMISSIONS`).

### معماری کلی

```
AdminPage
├── هدر (Global Search + Export + Close)
├── نوار تب‌ها (Drag & Drop + Long Press)
├── محتوای اصلی (Conditional Rendering بر اساس activeTab)
│   ├── renderDashboard()
│   ├── renderUsersPanel()
│   ├── renderPostsPanel()
│   ├── renderCommentsPanel()
│   ├── renderAnalytics()
│   ├── renderSowtPanel()
│   ├── renderLibraryPanel()
│   ├── renderNashrPanel()
│   ├── renderAdminNotesPanel()
│   ├── renderAdminAuthorsPanel()
│   ├── renderVideoPanel()
│   ├── renderNotificationsPanel()
│   ├── renderVersionsPanel()
│   ├── renderPurchasesPanel()
│   ├── renderSupportPanel()
│   ├── renderRolesPanel()
│   └── AdminSalesPanel (کامپوننت جداگانه)
├── فوتر (ذخیره + بازگشت)
├── AudioPickerModal
├── ConfirmToast (دیالوگ تأیید)
├── BookReader
└── Toast پیام‌ها
```

### کامپوننت‌های کمکی (Helper Components)

| کامپوننت | خطوط | توضیحات |
|-----------|------|---------|
| `FormField` | ۱۴-۱۹ | فیلد فرم با لیبل |
| `TextInput` | ۲۱-۲۳ | ورودی متنی استایل‌دار |
| `TextArea` | ۲۵-۲۷ | ورودی متن چندخطی |
| `UploadButton` | ۲۹-۴۰ | دکمه آپلود فایل |
| `SmartEditButton` | ۴۲-۶۳ | ویرایش هوشمند با Gemini AI |
| `WordToHtmlButton` | ۶۶-۷۷ | تبدیل فایل Word به HTML |
| `PersianDateInput` | ۷۹-۸۴ | ورودی تاریخ شمسی |
| `MiniAudioPlayer` | ۸۶-۱۷۱ | پلیر صوتی کوچک |
| `MiniVideoPlayer` | ۱۷۳-۲۳۶ | پلیر ویدیویی کوچک |
| `AudioPickerModal` | ۲۳۸-۲۷۱ | مدال انتخاب صوت |
| `StatCard` | ۲۷۳-۲۸۳ | کارت آماری |
| `MiniBarChart` | ۲۸۷-۳۰۱ | نمودار میله‌ای کوچک |
| `GrowthBadge` | ۳۰۳-۳۱۲ | بج رشد درصدی |

---

## ۲. سیستم تب‌ها (Tab System)

### تعریف تب‌ها

تب‌ها در خط ۳۲۳۹ تعریف شده‌اند:

```typescript
const tabs: { id: AdminTab; label: string; icon: string; color: string }[] = [
    { id: 'dashboard', label: 'داشبورد', icon: 'fa-chart-pie', color: '#6366f1' },
    { id: 'users', label: 'کاربران', icon: 'fa-users', color: '#10b981' },
    { id: 'posts', label: 'پست‌ها', icon: 'fa-newspaper', color: '#f97316' },
    { id: 'comments', label: 'نظرات', icon: 'fa-comment-dots', color: '#0d9488' },
    { id: 'analytics', label: 'آمار', icon: 'fa-chart-line', color: '#8b5cf6' },
    { id: 'sowt', label: 'صوت', icon: 'fa-microphone-alt', color: '#1ab394' },
    { id: 'library', label: 'کتابخانه', icon: 'fa-book-open', color: '#f97316' },
    { id: 'nashr', label: 'نشر', icon: 'fa-shopping-cart', color: '#2563eb' },
    { id: 'notes', label: 'یادداشت‌ها', icon: 'fa-feather-alt', color: '#7c3aed' },
    { id: 'authors', label: 'نویسندگان', icon: 'fa-pen-fancy', color: '#db2777' },
    { id: 'videos', label: 'ویدیو', icon: 'fa-video', color: '#2e86c1' },
    { id: 'notifications', label: 'نوتیفیکیشن', icon: 'fa-bell', color: '#f59e0b' },
    { id: 'versions', label: 'نسخه اپ', icon: 'fa-rocket', color: '#7c5cff' },
    { id: 'purchases', label: 'درخواست خرید', icon: 'fa-money-bill-transfer', color: '#059669' },
    { id: 'sales', label: 'آمار فروش', icon: 'fa-chart-line', color: '#2e86c1' },
    { id: 'support', label: 'پشتیبانی', icon: 'fa-headset', color: '#7c3aed' },
    { id: 'roles', label: 'مدیریت نقش', icon: 'fa-user-shield', color: '#dc2626' },
];
```

### نوع داده تب

```typescript
type AdminTab = 'dashboard' | 'users' | 'posts' | 'comments' | 'sowt' | 'videos' 
    | 'library' | 'nashr' | 'notes' | 'authors' | 'analytics' | 'notifications' 
    | 'versions' | 'purchases' | 'sales' | 'support' | 'roles';
```

### نقشه دسترسی تب‌ها (TAB_PERMISSIONS — خط ۳۲۵۹)

| تب | نیاز به پرمیشن | مقدار پرمیشن |
|----|----------------|--------------|
| `dashboard` | ❌ ندارد | `null` |
| `users` | ✅ | `users` |
| `posts` | ✅ | `posts` |
| `comments` | ✅ | `comments` |
| `analytics` | ✅ | `analytics` |
| `sowt` | ✅ | `podcasts` |
| `library` | ✅ | `library` |
| `nashr` | ✅ | `library` |
| `notes` | ✅ | `notes` |
| `authors` | ✅ | `authors` |
| `videos` | ✅ | `videos` |
| `notifications` | ✅ | `notifications` |
| `versions` | ✅ | `settings` |
| `purchases` | ✅ | `purchases` |
| `sales` | ✅ | `sales` |
| `support` | ✅ | `support` |
| `roles` | ❌ ندارد | `null` (فقط superadmin) |

### Drag & Drop مرتب‌سازی تب‌ها

> [!tip] قابلیت مرتب‌سازی
> فقط کاربر `superadmin` می‌تواند تب‌ها را با Drag & Drop مرتب کند. این قابلیت با Long Press (نگه‌داشتن ۵۰۰ms) فعال می‌شود.

**متغیرهای کلیدی (خطوط ۶۶۹-۷۴۲):**

```typescript
const [tabOrder, setTabOrder] = useState<AdminTab[]>(() => {
    // بارگذاری از localStorage
    const saved = localStorage.getItem('admin_tab_order');
    if (saved) return JSON.parse(saved);
    return ['dashboard', 'users', 'posts', 'comments', 'analytics', ...];
});
const [dragTabIdx, setDragTabIdx] = useState<number | null>(null);
const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

**عملکردهای اصلی:**

| تابع | خط | توضیحات |
|------|-----|---------|
| `handleTabLongPressStart(idx)` | ۷۱۲ | شروع Long Press — بعد از ۵۰۰ms drag فعال می‌شود |
| `handleTabLongPressEnd()` | ۷۱۸ | پایان Long Press — تایمر لغو می‌شود |
| `handleTabDragOver(idx)` | ۷۲۱ | تشخیص جایگاه هدف هنگام Drag |
| `handleTabDrop()` | ۷۲۵ | اجرای مرتب‌سازی نهایی و ذخیره در localStorage |
| `handleTabDragEnd()` | ۷۴۲ | پاکسازی state پس از پایان Drag |

> [!info] ذخیره‌سازی
> ترتیب تب‌ها در `localStorage` با کلید `admin_tab_order` ذخیره می‌شود و در بارگذاری‌های بعدی بازیابی می‌شود.

### Swipe موبایل (خطوط ۶۸۰-۷۰۹)

برای ناوبری با Swipe چپ/راست بین تب‌ها در موبایل:

```typescript
const adminSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
const handleAdminTouchStart = (e: React.TouchEvent) => {
    // اگر صفحه کوچکتر از 1024px باشد و در حالت ویرایش نباشد
    // مختصات شروع لمس ذخیره می‌شود
};
const handleAdminTouchEnd = (e: React.TouchEvent) => {
    // تشخیص جهت Swipe (حداقل 60px افقی و بیشتر از عمودی * 1.5)
    // رفتن به تب بعدی/قبلی
};
```

> [!warning] شرط Swipe
> Swipe فقط در صفحات کمتر از 1024px و در حالت ویرایش (`isEditing`) غیرفعال است. اگر المانی قابلیت scroll افقی داشته باشد، Swipe غیرفعال می‌شود.

---

## ۳. داشبورد (Dashboard)

### تابع رندر: `renderDashboard()` — خطوط ۹۳۷-۱۱۷۶

### State‌های کلیدی

```typescript
const [stats, setStats] = useState<any>(null);          // خط ۶۲۷
const [insights, setInsights] = useState<any>(null);    // خط ۶۵۶
const [insightsLoading, setInsightsLoading] = useState(false); // خط ۶۵۷
const [aiCorpus, setAiCorpus] = useState<any>(null);    // خط ۶۵۸
const [activity, setActivity] = useState<any[]>([]);     // خط ۶۵۹
```

### API‌های فراخوانی‌شده

| تابع API | زمان فراخوانی | توضیحات |
|----------|--------------|---------|
| `getAdminStats()` | خط ۷۸۳ | دریافت آمار کلی |
| `getAdminInsights()` | خط ۸۳۵ | تحلیل هوشمند |
| `getAICorpus()` | خط ۸۴۸ | اطلاعات موتور یادگیری |
| `getAdminActivity()` | خط ۸۴۳ | فعالیت‌های اخیر |

### کارت‌های آماری (StatCard)

داشبورد دارای **۱۴ کارت آماری** است:

| ردیف | آیکون | لیبل | رنگ |
|------|-------|------|-----|
| ۱ | `fa-users` | کاربران | `#1ab394` |
| ۲ | `fa-microphone-alt` | مجموعه صوتی | `#1ab394` |
| ۳ | `fa-video` | ویدیوها | `#2e86c1` |
| ۴ | `fa-newspaper` | پست‌ها | `#f97316` |
| ۵ | `fa-comment-dots` | نظرات | `#0d9488` |
| ۶ | `fa-book` | کتاب‌ها | `#8b5cf6` |
| ۷ | `fa-user-tie` | اساتید | `#ec4899` |
| ۸ | `fa-book` | کتاب‌های نشر | `#2563eb` |
| ۹ | `fa-sticky-note` | یادداشت‌ها | `#64748b` |
| ۱۰ | `fa-eye` | کل پخش‌ها | `#7c3aed` |
| ۱۱ | `fa-headphones` | بازدید صوتی | `#1ab394` |
| ۱۲ | `fa-play-circle` | بازدید ویدیو | `#2e86c1` |
| ۱۳ | `fa-heart` | لایک پادکست‌ها | `#f43f5e` |
| ۱۴ | `fa-heart` | لایک ویدیوها | `#ec4899` |

### دستور پاکسازی محفل (خط ۹۵۶-۹۷۵)

یک بخش قرمز رنگ خطرناک که امکان حذف تمام پیام‌های محفل را فراهم می‌کند:

```typescript
const handlePurgeChat = async () => {
    const res = await adminPurgePosts(); // خط ۷۶۲
    // نمایش تعداد پیام‌های حذف‌شده
};
```

> [!warning] عمل غیرقابل بازگشت
> دستور پاکسازی تمام پیام‌های محفل را برای همیشه حذف می‌کند و قابل بازگشت نیست. قبل از اجرا، دیالوگ تأیید نمایش داده می‌شود.

### تحلیل هوشمند (AI Insights — خط ۹۷۷-۱۰۰۴)

```typescript
const InsightLevelStyles: Record<string, { bg: string; text: string; icon: string }> = {
    success: { bg: 'bg-green-50 border-green-100', text: 'text-green-700', icon: 'text-green-500' },
    info:    { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', icon: 'text-blue-500' },
    warning: { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700', icon: 'text-amber-500' },
    danger:  { bg: 'bg-red-50 border-red-100', text: 'text-red-700', icon: 'text-red-500' },
};
```

حداکثر ۳ بینش نمایش داده می‌شود. هر بینش شامل `title`، `detail`، `level` و `icon` است.

### روند هفتگی (خط ۱۰۰۶-۱۰۲۲)

سه کارت برای نمایش آمار هفتگی:
- کاربران جدید (سبز)
- پست‌های جدید (نارنجی)
- نظرات جدید (سبزآبی)

### نمودار فعالیت پخش (خط ۱۰۲۴-۱۰۳۷)

از کامپوننت `StackedDailyBars` استفاده می‌کند و داده‌ها از `stats.dailyPlaysByType` دریافت می‌شوند:

```typescript
const buildDailyByType = (rows: any[]) => {
    const byDate: Record<string, { podcast: number; video: number }> = {};
    rows.forEach((r: any) => {
        const d = r._id?.date || '';
        if (!byDate[d]) byDate[d] = { podcast: 0, video: 0 };
        if (r._id?.event === 'podcast_play') byDate[d].podcast += r.count;
        else byDate[d].video += r.count;
    });
    return Object.entries(byDate).map(([date, v]) => ({ label: date.slice(5), ...v }));
};
```

### پادکست‌های محبوب (خط ۱۰۳۹-۱۰۵۲)

از کامپوننت `RankBars` استفاده می‌کند و ۵ پادکست برتر بر اساس بازدید واقعی نمایش داده می‌شود.

### ویدیوهای محبوب (خط ۱۰۵۴-۱۰۷۷)

لیست ویدیوهای محبوب با نمایش تعداد بازدید، لایک و نوار پیشرفت.

### موتور یادگیری هوشمند (خط ۱۰۷۹-۱۱۰۴)

نمایش آمار موتور یادگیری شامل:
- بخش کتاب‌ها
- بخش پادکست‌ها
- بخش ویدیوها
- بخش‌های دانش (chunk)

آخرین به‌روزرسانی خودکار هر ۳۰ دقیقه انجام می‌شود.

### آخرین کاربران و پست‌ها (خط ۱۱۰۶-۱۱۴۰)

لیست ۵ کاربر و ۵ پست آخر با نمایش اطلاعات پایه.

### توزیع نقش‌ها و نظرات (خط ۱۱۴۲-۱۱۶۴)

نمایش توزیع نقش‌ها (کاربر/نویسنده/ادمین) و توزیع نظرات بر اساس نوع (صوتی/ویدیویی/کتاب).

---

## ۴. مدیریت کاربران (Users Management)

### تابع رندر: `renderUsersPanel()` — خطوط ۱۱۷۸-۱۲۹۸

### State‌های کلیدی

```typescript
const [users, setUsers] = useState<any[]>([]);                    // خط ۶۲۸
const [usersPage, setUsersPage] = useState(1);                    // خط ۶۲۹
const [usersTotal, setUsersTotal] = useState(0);                  // خط ۶۳۰
const [usersSearch, setUsersSearch] = useState('');               // خط ۶۳۱
const [usersRoleFilter, setUsersRoleFilter] = useState('');       // خط ۶۳۲
const [selectedUsers, setSelectedUsers] = useState<string[]>([]); // خط ۶۴۹
```

### API‌های فراخوانی‌شده

| تابع API | توضیحات |
|----------|---------|
| `getAdminUsers({ search, role, page })` | دریافت لیست کاربران |
| `updateUserRole(userId, role)` | تغییر نقش کاربر |
| `deleteUser(userId)` | حذف کاربر |
| `banUser(userId)` | بن کردن کاربر |
| `unbanUser(userId)` | رفع بن |
| `muteUser(userId, duration, reason)` | سکوت کاربر (۱۰ دقیقه) |
| `unmuteUser(userId)` | رفع سکوت |
| `adminBulkUsers(ids, action, value)` | عملیات گروهی |
| `resetUserWarnings(userId)` | بازنشانی اخطارها |

### جستجو و فیلتر

**فیلتر نقش:** چهار دکمه — همه / کاربر / نویسنده / ادمین

```typescript
{[
    { v: '', l: 'همه' },
    { v: 'user', l: 'کاربر' },
    { v: 'author', l: 'نویسنده' },
    { v: 'admin', l: 'ادمین' }
].map(r => (
    <button onClick={() => setUsersRoleFilter(r.v)} ...>{r.l}</button>
))}
```

### عملیات گروهی (Bulk Actions)

وقتی کاربرانی انتخاب شوند، نوار عملیات گروهی نمایش داده می‌شود:
- **تبدیل به نویسنده:** `adminBulkUsers(selectedUsers, 'role', 'author')`
- **حذف:** `adminBulkUsers(selectedUsers, 'delete')`

### سیستم بن/سکوت

| وضعیت | دکمه | توضیحات |
|--------|------|---------|
| بن نشده | 🚫 بن | `banUser()` — تمام پیام‌ها حذف می‌شوند |
| بن شده | ✅ رفع بن | `unbanUser()` |
| سکوت نشده | 🔇 سکوت | `muteUser()` — ۱۰ دقیقه |
| سکوت شده | 🔊 رفع سکوت | `unmuteUser()` |

> [!warning] بن کردن
> بن کردن کاربر تمام پیام‌ها و محتوای او را حذف می‌کند. این عملیات با دیالوگ تأیید انجام می‌شود.

### صفحه‌بندی

صفحه‌بندی با ۲۰ آیتم در هر صفحه انجام می‌شود:

```typescript
{usersTotal > 20 && (
    <div className="flex justify-center gap-2">
        <button onClick={() => loadUsers(usersPage - 1)} disabled={usersPage <= 1}>قبلی</button>
        <span>{toPersianDigits(usersPage)} / {toPersianDigits(Math.ceil(usersTotal / 20))}</span>
        <button onClick={() => loadUsers(usersPage + 1)} disabled={usersPage >= Math.ceil(usersTotal / 20)}>بعدی</button>
    </div>
)}
```

### ریل‌تایم مدیریت کاربران (خط ۸۹۴-۸۹۹)

```typescript
useEffect(() => {
    if (activeTab !== 'users' || currentUsersVersion <= 0) return;
    const t = setTimeout(() => loadUsers(usersPage), 250);
    return () => clearTimeout(t);
}, [currentUsersVersion, activeTab, usersPage, loadUsers]);
```

هر تغییر کاربر (ثبت‌نام/نقش/حذف) باعث ری‌فچ لحظه‌ای صفحه فعلی می‌شود.

---

## ۵. مدیریت پست‌ها (Posts Management)

### تابع رندر: `renderPostsPanel()` — خطوط ۱۳۰۰-۱۴۴۹

### State‌های کلیدی

```typescript
const [adminPosts, setAdminPosts] = useState<any[]>([]);           // خط ۶۳۳
const [adminPostsPage, setAdminPostsPage] = useState(1);           // خط ۶۳۴
const [adminPostsTotal, setAdminPostsTotal] = useState(0);         // خط ۶۳۵
const [adminPostsSearch, setAdminPostsSearch] = useState('');      // خط ۶۳۶
const [selectedPosts, setSelectedPosts] = useState<string[]>([]);  // خط ۶۵۰
const [editingPostId, setEditingPostId] = useState<string | null>(null); // خط ۶۴۴
const [editingPostText, setEditingPostText] = useState('');        // خط ۶۴۵
const [chatEnabled, setChatEnabled] = useState(true);              // خط ۶۶۲
const [chatMessage, setChatMessage] = useState('');                // خط ۶۶۳
```

### API‌های فراخوانی‌شده

| تابع API | توضیحات |
|----------|---------|
| `getAdminPosts({ search, page })` | دریافت لیست پست‌ها |
| `adminDeletePost(id)` | حذف پست |
| `adminUpdatePost(id, data)` | ویرایش پست |
| `adminBulkPosts(ids, action)` | عملیات گروهی (pin/delete) |
| `getCommunitySettings()` | دریافت تنظیمات چت |
| `updateCommunitySettings(chatEnabled, chatMessage)` | ذخیره تنظیمات چت |
| `adminPurgePosts()` | پاکسازی کامل محفل |

### تنظیمات چت محفل (خط ۱۳۰۲-۱۳۳۴)

یک بخش اختصاصی برای کنترل وضعیت چت:
- **Toggle باز/بسته:** با کلیک روی دکمه toggle
- **پیام نمایشی:** متنی که هنگام بسته بودن چت نمایش داده می‌شود
- **ذخیره پیام:** دکمه جداگانه برای ذخیره پیام نمایشی

### عملیات گروهی

- **سنجاق کردن:** `adminBulkPosts(selectedPosts, 'pin')`
- **حذف:** `adminBulkPosts(selectedPosts, 'delete')`

### ویرایش Inline

ویرایش پست به صورت Inline و بدون باز شدن صفحه جداگانه:

```typescript
{editingPostId === p._id ? (
    <div className="flex gap-2 mt-2">
        <TextInput value={editingPostText} onChange={(e) => setEditingPostText(e.target.value)} />
        <button onClick={async () => {
            const r = await adminUpdatePost(p._id, { text: editingPostText });
            if (r) { /* به‌روزرسانی state */ setEditingPostId(null); }
        }}>ذخیره</button>
        <button onClick={() => setEditingPostId(null)}>لغو</button>
    </div>
) : (
    <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-3">{p.text}</p>
)}
```

### انواع محتوای پست

هر پست می‌تواند حاوی محتوای مختلفی باشد:
- **متن ساده** (`p.text`)
- **صوت** (`p.podcastData`) → `MiniAudioPlayer`
- **ویدیو** (`p.videoData`) → `MiniVideoPlayer`
- **کتاب** (`p.bookData`) → کارت صورتی
- **رسانه** (`p.media`) → تصاویر/ویدیوها
- **نظرات** (`p.comments`) → حداکثر ۳ نظر نمایش داده می‌شود

### انیمیشن حذف

```typescript
${deletingIds.has(p._id) ? 'animate-deleteCollapse opacity-0 scale-95 -translate-y-2' : ''}
```

حذف با انیمیشن collapse انجام می‌شود: المان به مدت ۵۰۰ms کوچک و محو می‌شود.

---

## ۶. مدیریت نظرات (Comments Management)

### تابع رندر: `renderCommentsPanel()` — خطوط ۱۴۵۱-۱۵۷۷

### State‌های کلیدی

```typescript
const [adminComments, setAdminComments] = useState<any[]>([]);        // خط ۶۳۷
const [adminCommentsPage, setAdminCommentsPage] = useState(1);        // خط ۶۳۸
const [adminCommentsTotal, setAdminCommentsTotal] = useState(0);      // خط ۶۳۹
const [adminCommentsSearch, setAdminCommentsSearch] = useState('');   // خط ۶۴۰
const [adminCommentsType, setAdminCommentsType] = useState('');       // خط ۶۴۱
const [selectedComments, setSelectedComments] = useState<string[]>([]); // خط ۶۵۱
const [editingCommentId, setEditingCommentId] = useState<string | null>(null); // خط ۶۴۲
const [editingCommentText, setEditingCommentText] = useState('');     // خط ۶۴۳
```

### API‌های فراخوانی‌شده

| تابع API | توضیحات |
|----------|---------|
| `getAdminComments({ type, search, page })` | دریافت لیست نظرات |
| `adminDeleteComment(id)` | حذف نظر |
| `adminUpdateComment(id, data)` | ویرایش نظر |
| `adminBulkComments(ids, action)` | عملیات گروهی (feature/delete) |

### فیلتر نوع نظر

چهار دکمه: همه / صوتی / ویدیویی / کتاب

```typescript
{[
    { v: '', l: 'همه', icon: 'fa-comments' },
    { v: 'podcast', l: 'صوتی', icon: 'fa-podcast' },
    { v: 'video', l: 'ویدیویی', icon: 'fa-video' },
    { v: 'book', l: 'کتاب', icon: 'fa-book' }
].map(t => (
    <button onClick={() => setAdminCommentsType(t.v)} ...>{t.l}</button>
))}
```

### عملیات گروهی

- **ویژه کردن:** `adminBulkComments(selectedComments, 'feature')`
- **حذف:** `adminBulkComments(selectedComments, 'delete')`

### عملیات روی هر نظر

| عمل | آیکون | توضیحات |
|-----|-------|---------|
| ویرایش | ✏️ | ویرایش inline متن نظر |
| ویژه کردن | ⭐ | `adminUpdateComment(id, { isFeatured: !c.isFeatured })` |
| سنجاق | 📌 | `adminUpdateComment(id, { isPinned: !c.isPinned })` |
| حذف | 🗑️ | `adminDeleteComment(id)` |

### انیمیشن ویژه کردن (خط ۱۵۴۶-۱۵۴۸)

```typescript
if (!c.isFeatured) {
    setFeaturedGlowIds(prev => new Set([...prev, c._id]));
    setTimeout(() => setFeaturedGlowIds(prev => { 
        const n = new Set(prev); n.delete(c._id); return n; 
    }), 1200);
}
```

وقتی نظری ویژه می‌شود، یک انیمیشن درخشش (glow) به مدت ۱۲۰۰ms نمایش داده می‌شود.

### نمایش محتوای نظر

- **نظر صوتی:** `MiniAudioPlayer` با timestamp
- **نظر ویدیویی:** `MiniVideoPlayer` (غیرقابل پخش)
- **نظر کتاب:** کارت صورتی با کاور کتاب
- **زمان‌stamp:** نمایش زمان دقیق در فرمت دقیقه:ثانیه

---

## ۷. آمار و تحلیل (Analytics)

### تابع رندر: `renderAnalytics()` — خطوط ۲۱۱۱-۲۴۰۹

### State‌های کلیدی

```typescript
const [analytics, setAnalytics] = useState<any>(null);          // خط ۶۵۲
const [analyticsPeriod, setAnalyticsPeriod] = useState('7d');    // خط ۶۵۳
const [analyticsTab, setAnalyticsTab] = useState<'audio' | 'video' | 'community' | 'sales'>('audio'); // خط ۶۵۴
const [segments, setSegments] = useState<any>(null);             // خط ۶۵۵
```

### API‌های فراخوانی‌شده

| تابع API | توضیحات |
|----------|---------|
| `getAdminAnalytics({ period })` | آمار کلی |
| `getAdminAnalyticsSegments({ period })` | آمار بخش‌بندی‌شده |
| `adminExportData(type)` | خروجی داده‌ها |

### انتخاب بازه زمانی

سه دکمه: ۷ روز / ۳۰ روز / ۹۰ روز

### تب‌های بخش‌بندی

| تب | آیکون | رنگ | محتوا |
|-----|-------|-----|-------|
| `audio` | `fa-microphone-alt` | `#10b981` | پخش صوتی، لایک پادکست |
| `video` | `fa-video` | `#2e86c1` | بازدید ویدیو، لایک ویدیو |
| `community` | `fa-users` | `#f97316` | کاربر جدید، پست جدید، نظر جدید |
| `sales` | `fa-chart-line` | `#8b5cf6` | فروش تایید شده، پرفروش‌ترین کتاب‌ها |

### نمودارها بر اساس تب

#### تب صوتی (Audio)
- **روند پخش صوتی روزانه:** `AreaTrendChart` با رنگ `#10b981`
- **ساعت‌های اوج:** `AreaTrendChart` با رنگ `#34d399`
- **محبوب‌ترین پادکست‌ها:** `RankBars`

#### تب ویدیو (Video)
- **روند بازدید ویدیو روزانه:** `AreaTrendChart` با رنگ `#2e86c1`
- **ساعت‌های اوج:** `AreaTrendChart` با رنگ `#5dade2`
- **محبوب‌ترین ویدیوها:** `RankBars`

#### تب محفل (Community)
- **روند کاربران جدید:** `AreaTrendChart` با رنگ `#f97316`
- **روند پست‌های جدید:** `AreaTrendChart` با رنگ `#8b5cf6`
- **نویسندگان برتر:** `RankBars`
- **پست‌های پر بحث:** `RankBars`
- **نظردهندگان برتر:** `RankBars`

#### تب فروش (Sales)
از کامپوننت `AdminSalesPanel` استفاده می‌کند.

### تحلیل هوشمند (خط ۲۳۴۷-۲۳۷۵)

نمایش بینش‌های هوشمند با اطلاعات وضعیت (کش/بروز، هوش مصنوعی/موتور داده).

### فعالیت اخیر (خط ۲۳۷۷-۲۳۹۴)

لیست ۵۰ فعالیت اخیر با نمایش نوع (عضویت/پست/نظر).

### خروجی داده‌ها (خط ۲۳۹۶-۲۴۰۶)

پنج دکمه خروجی:
- کاربران (`users`)
- پست‌ها (`posts`)
- نظرات (`comments`)
- صوت‌ها (`podcasts`)
- ویدیوها (`videos`)

---

## ۸. صوت/پادکست‌ها (Audio/Podcasts)

### تابع رندر: `renderSowtPanel()` — خطوط ۱۷۶۳-۱۸۲۵

### State‌های کلیدی

```typescript
const [editingItem, setEditingItem] = useState<{ type: string, id: any } | null>(null); // خط ۳۶۳
const [podcastSearch, setPodcastSearch] = useState('');              // خط ۳۶۶
const [podcastSort, setPodcastSort] = useState<'newest' | 'year' | 'master'>('newest'); // خط ۳۶۷
const [selectedMasterFilter, setSelectedMasterFilter] = useState<number | 'all'>('all'); // خط ۳۶۸
```

### حالت‌ها

**حالت لیست:**
- دکمه ایجاد مجموعه صوتی جدید
- جستجو
- فیلتر مرتب‌سازی (جدیدترین/سال برگزاری/نام استاد)
- فیلتر اساتید
- لیست مجموعه‌ها با دکمه‌های ویرایش/حذف/شیر در محفل

**حالت ویرایش (editingItem.type === 'Podcast'):**
- فرم ویرایش شامل:
  - عنوان مجموعه صوتی
  - دبیر (ارائه‌دهنده) — dropdown
  - سال برگزاری (شمسی)
  - کاور مجموعه
- لیست جلسات با قابلیت:
  - زیرعنوان جلسه
  - آپلود صوت
  - لینک صوت
  - تاریخ انتشار
  - متن جلسه (مطالعه)
  - تبدیل Word به HTML
  - ویرایش هوشمند با AI
  - حذف جلسه
- دکمه افزودن جلسه جدید

### API‌های فراخوانی‌شده

API‌ها از طریق `localData` و `updateTable()` مدیریت می‌شوند. ذخیره نهایی با `onSave(localData)` انجام می‌شود.

### مرتب‌سازی (useMemo — خط ۹۲۴-۹۳۵)

```typescript
const sortedPodcasts = useMemo(() => {
    let list = [...localData.podcasts].filter(p => p.title.includes(podcastSearch));
    if (selectedMasterFilter !== 'all') 
        list = list.filter(p => p.speakerId === selectedMasterFilter || p.authorId === selectedMasterFilter);
    if (podcastSort === 'newest') list.sort((a,b) => b.id - a.id);
    if (podcastSort === 'year') list.sort((a,b) => b.year - a.year);
    if (podcastSort === 'master') list.sort((a, b) => {
        const authorA = localData.authors.find((au: any) => au.id === a.speakerId)?.name || '';
        const authorB = localData.authors.find((au: any) => au.id === b.speakerId)?.name || '';
        return authorA.localeCompare(authorB);
    });
    return list;
}, [localData.podcasts, podcastSearch, podcastSort, selectedMasterFilter, localData.authors]);
```

---

## ۹. کتابخانه (Library)

### تابع رندر: `renderLibraryPanel()` — خطوط ۱۸۲۷-۱۸۷۹

### State‌های کلیدی

```typescript
const [librarySubTab, setLibrarySubTab] = useState<'podcasts' | 'books'>('podcasts'); // خط ۳۳۳
const [pickerConfig, setPickerConfig] = useState<any>(null); // خط ۳۶۴
```

### زیرتب‌ها

| زیرتب | آیکون | محتوا |
|-------|-------|-------|
| `podcasts` | `fa-podcast` | لیست مجموعه‌های صوتی |
| `books` | `fa-book` | لیست کتاب‌ها |

### حالت‌ها

**حالت لیست پادکست‌ها:**
- لیست مجموعه‌ها با نمایش کاور، عنوان، تعداد جلسات
- دکمه‌های ویرایش/حذف

**حالت لیست کتاب‌ها:**
- لیست کتاب‌ها با نمایش کاور و عنوان
- دکمه ایجاد کتاب جدید
- دکمه‌های ویرایش/حذف

**حالت ویرایش کتاب (editingItem.type === 'Book'):**
- عنوان کتاب
- انتخاب استاد (مولف) — فقط اساتید با نقش `master`
- کاور کتاب
- **صوت‌های متصل شده:** امکان اتصال صوت‌های مختلف به کتاب

**حالت ویرایش Author (editingItem.type === 'Author'):**
- نام استاد/دبیر
- نقش (استاد/دبیر)
- تصویر آواتار
- بایوگرافی

### اتصال صوت به کتاب (خط ۱۸۵۶-۱۸۵۸)

از `AudioPickerModal` برای انتخاب صوت استفاده می‌شود:

```typescript
<button onClick={() => setPickerConfig({ 
    podcasts: localData.podcasts, 
    onSelect: (ep) => { 
        const n = [...(b.relatedEpisodes || []), { podcastId: ep.podcastId, episodeIndex: ep.episodeIndex }];
        setField('relatedEpisodes', n);
    }
})}>+ اتصال صوت جدید</button>
```

---

## ۱۰. نشر (Publishing/Nashr)

### تابع رندر: `renderNashrPanel()` — خطوط ۱۸۸۱-۱۹۲۱

### State‌های کلیدی

```typescript
const [readingBook, setReadingBook] = useState<PublishedBook | null>(null); // خط ۶۶۵
```

### حالت لیست

- دکمه ایجاد محصول جدید
- لیست محصولات با نمایش کاور و عنوان
- دکمه‌ها:
  - 📖 باز کردن با پلیر کتاب (`BookReader`)
  - 📤 شیر در محفل (`shareToMahfel`)
  - ✏️ ویرایش
  - 🗑️ حذف

### حالت ویرایش (editingItem.type === 'PublishedBook')

فرم ویرایش شامل:
- نوع اثر (کتاب/یادداشت)
- عنوان
- زیرعنوان
- کاور اثر
- قیمت (تومان)
- لینک فایل PDF
- فهرست مطالب
- درباره کتاب
- مقدمه / متن محصول (قابل تبدیل از Word)

---

## ۱۱. یادداشت‌ها (Notes)

### تابع رندر: `renderAdminNotesPanel()` — خطوط ۱۵۷۹-۱۷۰۸

### State‌های کلیدی

```typescript
const [adminNotes, setAdminNotes] = useState<any[]>([]);           // خط ۵۹۱
const [adminNotesPage, setAdminNotesPage] = useState(1);           // خط ۵۹۲
const [adminNotesTotal, setAdminNotesTotal] = useState(0);         // خط ۵۹۳
const [adminNotesPages, setAdminNotesPages] = useState(1);         // خط ۵۹۴
const [adminNotesSearch, setAdminNotesSearch] = useState('');      // خط ۵۹۵
const [adminNotesStatus, setAdminNotesStatus] = useState('');      // خط ۵۹۶
const [editingNote, setEditingNote] = useState<any | null>(null);  // خط ۵۹۷
const [noteComposer, setNoteComposer] = useState<{ open: boolean; note?: any }>({ open: false }); // خط ۵۹۸
const [noteTitle, setNoteTitle] = useState('');                     // خط ۵۹۹
const [noteContent, setNoteContent] = useState('');                 // خط ۶۰۰
const [noteAuthorName, setNoteAuthorName] = useState('');           // خط ۶۰۱
const [noteIsDraft, setNoteIsDraft] = useState(false);             // خط ۶۰۲
const [noteSaving, setNoteSaving] = useState(false);               // خط ۶۰۳
```

### API‌های فراخوانی‌شده

| تابع API | توضیحات |
|----------|---------|
| `adminGetNotes({ search, status, page })` | دریافت یادداشت‌ها |
| `adminCreateNote(payload)` | ایجاد یادداشت |
| `adminUpdateNote(id, payload)` | ویرایش یادداشت |
| `adminDeleteNote(id)` | حذف یادداشت |

### فیلتر وضعیت

چهار دکمه:
- **همه:** همه یادداشت‌ها
- **درخواست‌ها:** `pendingApproval === true`
- **منتشر شده:** `isDraft === false`
- **پیش‌نویس‌ها:** `isDraft === true`

### وضعیت‌های یادداشت

| وضعیت | رنگ بج | آیکون |
|--------|--------|-------|
| پیش‌نویس | کهربایی | `fa-pen-alt` |
| در انتظار تأیید | نارنجی | `fa-hourglass-half` |
| منتشر شده | سبز | `fa-globe` |

### عملیات روی یادداشت

| عمل | آیکون | توضیحات |
|-----|-------|---------|
| تأیید و انتشار | ✅ | `adminUpdateNote(id, { isDraft: false, pendingApproval: false })` |
| رد درخواست | ❌ | `adminUpdateNote(id, { pendingApproval: false, isDraft: true })` |
| سنجاق | 📌 | `adminUpdateNote(id, { isPinned: !n.isPinned })` |
| ویرایش | ✏️ | باز کردن فرم ویرایش |
| انتشار/پیش‌نویس | 🌍/📝 | `adminUpdateNote(id, { isDraft: !n.isDraft })` |
| حذف | 🗑️ | `adminDeleteNote(id)` |

### فرم ایجاد/ویرایش یادداشت (خط ۱۵۸۰-۱۶۱۴)

```typescript
const payload = {
    title: noteTitle.trim(),
    description: noteContent.trim().replace(/<[^>]*>/g, '').slice(0, 140),
    contentHtml: noteContent.trim().split('\n').map(p => `<p style="white-space:pre-line">${p.replace(/ /g, '&nbsp;')}</p>`).join(''),
    authorName: noteAuthorName.trim() || 'سیمای هنر و اندیشه',
    isDraft: noteIsDraft,
    type: 'note'
};
```

---

## ۱۲. نویسندگان (Authors)

### تابع رندر: `renderAdminAuthorsPanel()` — خطوط ۱۷۱۰-۱۷۶۱

### State‌های کلیدی

```typescript
const [adminAuthors, setAdminAuthors] = useState<any[]>([]);    // خط ۶۰۴
const [authorsLoading, setAuthorsLoading] = useState(false);     // خط ۶۰۵
```

### API‌های فراخوانی‌شده

| تابع API | توضیحات |
|----------|---------|
| `adminGetAuthors()` | دریافت لیست نویسندگان |
| `updateUserRole(id, role)` | تغییر نقش |

### نمایش اطلاعات هر نویسنده

- آواتار
- نام
- شماره تلفن/ایمیل
- نقش (مدیر سیستم/نویسنده)
- تعداد یادداشت‌ها
- تعداد پیش‌نویس‌ها
- وضعیت مسدود

### عملیات

| عمل | شرط | توضیحات |
|-----|-----|---------|
| حذف از نویسندگی | `role === 'author'` | تغییر نقش به `user` |
| نویسنده کردن | `role === 'admin'` | تغییر نقش به `author` |

---

## ۱۳. ویدیوها (Videos)

### تابع رندر: `renderVideoPanel()` — خطوط ۱۹۲۳-۱۹۷۵

### State‌های کلیدی

```typescript
const [videoSubTab, setVideoSubTab] = useState<'videos' | 'playlists'>('videos'); // خط ۳۳۴
const [aparatUrl, setAparatUrl] = useState('');                    // خط ۳۶۵
const [adminPlaylists, setAdminPlaylists] = useState<any[]>([]);  // خط ۴۶۶
const [playlistSearch, setPlaylistSearch] = useState('');          // خط ۴۶۷
const [editingPlaylist, setEditingPlaylist] = useState<any | null>(null); // خط ۴۶۸
```

### API‌های فراخوانی‌شده

| تابع API | توضیحات |
|----------|---------|
| `fetchAparatVideoDetails(id)` | دریافت اطلاعات ویدیو از آپارات |
| `extractAparatId(url)` | استخراج شناسه ویدیو از لینک |
| `getAdminVideoPlaylists()` | دریافت پلی‌لیست‌ها |
| `createVideoPlaylist(data)` | ایجاد پلی‌لیست |
| `updateVideoPlaylist(id, data)` | ویرایش پلی‌لیست |
| `deleteVideoPlaylist(id)` | حذف پلی‌لیست |

### زیرتب‌ها

| زیرتب | آیکون | محتوا |
|-------|-------|-------|
| `videos` | `fa-video` | لیست ویدیوها |
| `playlists` | `fa-list-ul` | مدیریت پلی‌لیست‌ها |

### دریافت ویدیو از آپارات (خط ۱۹۵۱-۱۹۵۸)

```typescript
const id = extractAparatId(aparatUrl);
const { details } = await fetchAparatVideoDetails(id);
const nv: Video = { 
    id: details.uid, 
    embedId: details.uid, 
    title: details.title, 
    description: details.description, 
    thumbnailUrl: details.big_poster, 
    viewCount: details.visit_cnt, 
    uploadDate: details.sdate, 
    duration: details.duration, 
    categories: ["ویدیو"] 
};
```

### مدیریت پلی‌لیست‌ها (خط ۲۰۲۶-۲۱۰۹)

**فرم ویرایش پلی‌لیست:**
- نام پلی‌لیست
- توضیحات
- کاور (با پیش‌نمایش)
- ترتیب (order)
- وضعیت (نمایش/مخفی)
- اعمال خودکار ویدیوها بر اساس نام

**عملیات پلی‌لیست:**
- ایجاد جدید
- ویرایش
- حذف
- جابه‌جایی با فلش‌ها (بالا/پایین)

```typescript
const movePlaylist = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= adminPlaylists.length) return;
    const a = adminPlaylists[index];
    const b = adminPlaylists[target];
    const okA = await updateVideoPlaylist(a.id, { order: b.order, autoFill: false });
    const okB = await updateVideoPlaylist(b.id, { order: a.order, autoFill: false });
    if (okA && okB) loadAdminPlaylists();
};
```

---

## ۱۴. نوتیفیکیشن‌ها (Notifications)

### تابع رندر: `renderNotificationsPanel()` — خطوط ۲۶۰۷-۲۷۷۷

### State‌های کلیدی

```typescript
const [notifList, setNotifList] = useState<any[]>([]);               // خط ۳۷۰
const [notifTitle, setNotifTitle] = useState('');                     // خط ۳۷۱
const [notifBody, setNotifBody] = useState('');                       // خط ۳۷۲
const [notifTarget, setNotifTarget] = useState('all');                // خط ۳۷۳
const [notifSending, setNotifSending] = useState(false);              // خط ۳۷۴
const [notifItemType, setNotifItemType] = useState('');               // خط ۳۷۵
const [notifItemId, setNotifItemId] = useState('');                   // خط ۳۷۶
const [notifLink, setNotifLink] = useState('');                       // خط ۳۷۷
const [notifUserId, setNotifUserId] = useState('');                   // خط ۳۷۸
const [notifUserLabel, setNotifUserLabel] = useState('');             // خط ۳۷۹
const [notifUserAvatar, setNotifUserAvatar] = useState('');           // خط ۳۸۰
const [notifUserSearch, setNotifUserSearch] = useState('');           // خط ۳۸۱
const [notifUserResults, setNotifUserResults] = useState<any[] | null>(null); // خط ۳۸۲
const [notifUsersLoading, setNotifUsersLoading] = useState(false);    // خط ۳۸۳
```

### API‌های فراخوانی‌شده

| تابع API | توضیحات |
|----------|---------|
| `getNotifications()` | دریافت لیست نوتیفیکیشن‌ها |
| `adminSendNotification(title, body, target, link, type, userId)` | ارسال نوتیفیکیشن |
| `adminDeleteNotification(id)` | حذف نوتیفیکیشن |
| `getAdminUsers({ search })` | جستجوی کاربر |

### مخاطبان

| مقدار | مخاطب |
|--------|-------|
| `all` | همه کاربران |
| `users` | کاربران عادی |
| `authors` | نویسندگان |
| `user` | کاربر خاص (با جستجو) |

### انتخاب مورد مرتبط

امکان اتصال نوتیفیکیشن به محتوای خاص:

| نوع | آیکون | منبع داده |
|-----|-------|----------|
| ویدیو | 🎬 | `localData.videos` |
| پلی‌لیست صوت | 🎧 | `localData.podcasts` |
| کتاب | 📚 | `localData.publishedBooks` |
| یادداشت | 📝 | `localData.publishedBooks` (type: note) |
| پیام محفل | 💬 | `localData.posts` |

### جستجوی کاربر (خطوط ۹۱۲-۹۲۲)

```typescript
useEffect(() => {
    if (notifTarget !== 'user') return;
    if (notifUserSearch.trim().length < 2) { setNotifUserResults(null); return; }
    let alive = true;
    setNotifUsersLoading(true);
    const t = setTimeout(async () => {
        const r = await getAdminUsers({ search: notifUserSearch.trim() });
        if (alive) { setNotifUserResults(r ? r.users : []); setNotifUsersLoading(false); }
    }, 400);
    return () => { alive = false; clearTimeout(t); };
}, [notifUserSearch, notifTarget]);
```

جستجو با تاخیر ۴۰۰ms (debounce) انجام می‌شود.

### تاریخچه نوتیفیکیشن‌ها (خط ۲۷۳۷-۲۷۷۵)

لیست نوتیفیکیشن‌های ارسال‌شده با امکان حذف.

---

## ۱۵. نسخه‌های اپ (App Versions)

### تابع رندر: `renderVersionsPanel()` — خطوط ۲۴۱۲-۲۵۰۹

### State‌های کلیدی

```typescript
const [versionForm, setVersionForm] = useState<AppUpdateInfo>({
    apkVersion: '', apkUrl: '', apkMessage: '',
    desktopVersion: '', desktopUrl: '', desktopMessage: '',
}); // خط ۴۱۵-۴۱۸
const [versionSaving, setVersionSaving] = useState(false);        // خط ۴۱۹
const [versionUploading, setVersionUploading] = useState(false);  // خط ۴۲۰
const versionFileInputRef = useRef<HTMLInputElement>(null);        // خط ۴۲۱
```

### API‌های فراخوانی‌شده

| تابع API | توضیحات |
|----------|---------|
| `getAppUpdate()` | دریافت اطلاعات نسخه فعلی |
| `adminSaveAppUpdate(data)` | ذخیره اطلاعات نسخه |
| `adminUploadApk(file)` | آپلود فایل APK |

### بخش اندروید (APK)

- شماره نسخه جدید
- پیام به کاربران
- آپلود فایل APK
- حذف انتشار

### بخش دسکتاپ ویندوز

- شماره نسخه جدید
- لینک نصاب جدید
- پیام به کاربران
- حذف انتشار

### عملیات ذخیره

```typescript
const res = await adminSaveAppUpdate(versionForm);
// نمایش toast موفقیت/خطا
// فراخوانی مجدد loadVersions()
```

> [!info] رفتار کاربر
> کاربران اپ اندروید به‌محض باز کردن اپ، پیشنهاد «دانلود و نصب» نسخه جدید را می‌بینند. در دسکتاپ نیز هنگام باز شدن اپ، پیشنهاد دانلود نصاب جدید داده می‌شود.

---

## ۱۶. درخواست‌های خرید (Purchase Requests)

### تابع رندر: `renderPurchasesPanel()` — خطوط ۲۵۱۰-۲۶۰۶

### State‌های کلیدی

```typescript
const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]); // خط ۴۲۴
const [purchaseFilter, setPurchaseFilter] = useState('');             // خط ۴۲۵
const [purchaseLoading, setPurchaseLoading] = useState(false);        // خط ۴۲۶
```

### API‌های فراخوانی‌شده

| تابع API | توضیحات |
|----------|---------|
| `adminGetPurchaseRequests(status)` | دریافت درخواست‌ها |
| `adminUpdatePurchaseRequest(id, status)` | تایید/رد درخواست |

### فیلتر وضعیت

چهار دکمه:
- **همه:** بدون فیلتر
- **⏳ در انتظار:** `status: 'pending'`
- **✅ تایید شده:** `status: 'confirmed'`
- **❌ رد شده:** `status: 'rejected'`

### رفرش خودکار (خط ۴۴۹-۴۵۴)

```typescript
useEffect(() => {
    if (activeTab !== 'purchases') return;
    loadPurchaseRequests();
    const t = setInterval(loadPurchaseRequests, 10000); // هر ۱۰ ثانیه
    return () => clearInterval(t);
}, [activeTab, loadPurchaseRequests]);
```

> [!tip] رفرش خودکار
> وقتی تب درخواست خرید باز باشد، لیست هر ۱۰ ثانیه به‌طور خودکار رفرش می‌شود.

### نمایش هر درخواست

- **اطلاعات کاربر:** نام، شماره تلفن
- **اقلام خرید:** عنوان، تعداد، قیمت
- **اطلاعات انتقال:** تاریخ، ساعت، کد پیگیری
- **مبلغ کل**
- **دکمه‌های عملیات:**
  - ✅ تایید و فعال‌سازی
  - ❌ رد

---

## ۱۷. پشتیبانی (Support)

### تابع رندر: `renderSupportPanel()` — خطوط ۲۷۷۸-۲۸۷۰

### State‌های کلیدی

```typescript
const [supportMessages, setSupportMessages] = useState<any[]>([]); // خط ۳۸۵
const [supportTotal, setSupportTotal] = useState(0);               // خط ۳۸۶
const [supportPage, setSupportPage] = useState(1);                 // خط ۳۸۷
const [supportReadFilter, setSupportReadFilter] = useState<'' | 'true' | 'false'>(''); // خط ۳۸۸
```

### API‌های فراخوانی‌شده

| تابع API | توضیحات |
|----------|---------|
| `getSupportMessages(page, limit, readFilter)` | دریافت پیام‌ها |
| `markSupportMessageRead(id)` | علامت‌گذاری خوانده‌شده |
| `deleteSupportMessage(id)` | حذف پیام |

### فیلتر وضعیت خواندن

سه دکمه: همه / خوانده‌نشده / خوانده‌شده

### نمایش هر پیام

- نام کاربر
- وضعیت خوانده‌نشده (نقطه زرد)
- دسته‌بندی (گزارش باگ/پیشنهاد/سؤال/سایر)
- اطلاعات تماس
- متن پیام
- دکمه‌ها:
  - ✅ علامت‌گذاری خوانده‌شده
  - 🗑️ حذف

---

## ۱۸. مدیریت نقش (Role Management)

### تابع رندر: `renderRolesPanel()` — خطوط ۲۸۷۱-۳۲۳۸

### State‌های کلیدی

```typescript
const [rolesTab, setRolesTab] = useState<'requests' | 'admins' | 'request' | 'allusers' | 'rolePerms'>('request'); // خط ۳۹۰
const [adminRequests, setAdminRequests] = useState<any[]>([]);   // خط ۳۹۱
const [adminList, setAdminList] = useState<any[]>([]);           // خط ۳۹۲
const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({}); // خط ۳۹۳
const [editingRole, setEditingRole] = useState<string | null>(null); // خط ۳۹۴
const [editingRolePerms, setEditingRolePerms] = useState<string[]>([]); // خط ۳۹۵
const [editingUserPerms, setEditingUserPerms] = useState<string | null>(null); // خط ۳۹۶
const [editingUserPermsList, setEditingUserPermsList] = useState<string[]>([]); // خط ۳۹۷
const [myRole, setMyRole] = useState<string>('admin');           // خط ۴۱۰
const [myPerms, setMyPerms] = useState<string[]>([]);            // خط ۴۱۱
```

### API‌های فراخوانی‌شده

| تابع API | توضیحات |
|----------|---------|
| `requestAdminAccess(message)` | ارسال درخواست ادمین شدن |
| `getMyAdminRequest()` | دریافت درخواست خود |
| `getAdminRequests(status)` | دریافت لیست درخواست‌ها |
| `getAdminList()` | دریافت لیست ادمین‌ها |
| `approveAdminRequest(id, role, permissions)` | تایید درخواست |
| `rejectAdminRequest(id)` | رد درخواست |
| `changeUserRole(id, role, permissions)` | تغییر نقش |
| `removeAdmin(id)` | حذف ادمین |
| `getAdminUsers({ search })` | جستجوی کاربران |
| `getRolePermissions()` | دریافت دسترسی‌های نقش‌ها |
| `updateAdminPermissions(id, perms)` | به‌روزرسانی دسترسی‌ها |
| `updateRolePermissions(perms)` | به‌روزرسانی دسترسی‌های نقش |
| `resetUserPermissions(id)` | بازنشانی دسترسی‌ها |

### ۵ زیرتب

#### ۱. درخواست ادمین شدن (`request`)

فرم ارسال درخواست با پیام توضیحی. نمایش وضعیت فعلی (ادمین/مدیر/در انتظار).

#### ۲. درخواست‌ها (`requests`)

لیست درخواست‌های در انتظار با امکان:
- **تأیید:** انتخاب نقش (ادمین/نویسنده) و دسترسی‌ها
- **رد**

#### ۳. ادمین‌ها (`admins`)

لیست ادمین‌ها و نویسندگان با امکان:
- **تغییر نقش:** انتخاب از dropdown
- **ویرایش دسترسی‌ها:** toggle دسترسی‌ها
- **حذف ادمین**

#### ۴. همه کاربران (`allusers`)

لیست همه کاربران با قابلیت:
- جستجو
- تغییر نقش
- ویرایش دسترسی‌های اختصاصی

#### ۵. دسترسی‌های نقش‌ها (`rolePerms`)

مدیریت دسترسی‌های پیش‌فرض برای هر نقش:

| نقش | رنگ | توضیحات |
|-----|-----|---------|
| کاربر | `#6b7280` | دسترسی‌های پیش‌فرض کاربران عادی |
| نویسنده | `#8b5cf6` | دسترسی‌های پیش‌فرض نویسندگان |
| ادمین | `#3b82f6` | دسترسی‌های پنل مدیریت ادمین‌ها |

### سیستم دسترسی‌ها (Permissions)

```typescript
const effectivePerms = isSuperAdmin 
    ? ALL_ROLE_PERMISSIONS.map(p => p.id) 
    : isAdmin 
        ? (myPerms.length > 0 ? myPerms : (rolePermissions['admin'] || [])) 
        : (rolePermissions[myRole] || []);
```

- **superadmin:** تمام دسترسی‌ها
- **admin:** بر اساس `myPerms` یا دسترسی‌های پیش‌فرض نقش admin
- **نقش‌های دیگر:** بر اساس دسترسی‌های پیش‌فرض نقش

---

## ۱۹. سیستم همگام‌سازی لحظه‌ای (Realtime Sync)

### همگام‌سازی با State اصلی (خط ۳۴۸-۳۶۱)

```typescript
useEffect(() => {
    setLocalData(prev => {
        const next = {
            podcasts: JSON.parse(JSON.stringify(currentPodcasts)),
            videos: JSON.parse(JSON.stringify(currentVideos)),
            publishedBooks: JSON.parse(JSON.stringify(currentPublishedBooks)),
            authors: JSON.parse(JSON.stringify(currentAuthors)),
            books: JSON.parse(JSON.stringify(currentBooks)),
            posts: JSON.parse(JSON.stringify(currentPosts)),
            comments: JSON.parse(JSON.stringify(currentComments))
        };
        return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
}, [currentPodcasts, currentVideos, currentPublishedBooks, currentAuthors, currentBooks, currentPosts, currentComments]);
```

> [!info] بهینه‌سازی
> از مقایسه JSON برای جلوگیری از رندرهای غیرضروری استفاده می‌شود. اگر داده‌ها تغییر نکرده باشند، state به‌روزرسانی نمی‌شود.

### ریفرش نوتیفیکیشن‌ها (خط ۸۸۷-۸۹۲)

```typescript
useEffect(() => {
    const onRefresh = () => { if (activeTab === 'notifications') loadNotifications(); };
    window.addEventListener('mahfel-notifs-refresh', onRefresh);
    return () => window.removeEventListener('mahfel-notifs-refresh', onRefresh);
}, [activeTab, loadNotifications]);
```

### گوش دادن به رویداد ناوبری (خط ۹۰۱-۹۰۹)

```typescript
useEffect(() => {
    const handler = (e: Event) => {
        const tab = (e as CustomEvent).detail;
        if (tab && typeof tab === 'string') setActiveTab(tab as AdminTab);
    };
    window.addEventListener('admin-goto-tab', handler);
    return () => window.removeEventListener('admin-goto-tab', handler);
}, []);
```

---

## ۲۰. نوار پیام‌ها (Toast System)

### Toast معمولی

```typescript
const showAdminToast = (message: string, type: 'error' | 'success' | 'warning' = 'success') => {
    setAdminToast({ message, type });
    setTimeout(() => setAdminToast(null), 4000);
};
```

### Toast تأیید (Confirm Dialog)

```typescript
const showConfirmToast = (message: string, onConfirm: () => void, type: 'danger' | 'warning' = 'danger') => {
    setConfirmToast({ message, onConfirm, type });
};
```

### Permission Toast

```typescript
const [permToast, setPermToast] = useState<{ message: string; type: 'enabled' | 'disabled' } | null>(null);
```

برای نمایش پیام‌های مربوط به تغییر دسترسی‌ها استفاده می‌شود.

---

## ۲۱. ساختار ذخیره‌سازی محلی (LocalData)

```typescript
const [localData, setLocalData] = useState({
    podcasts: JSON.parse(JSON.stringify(currentPodcasts)),
    videos: JSON.parse(JSON.stringify(currentVideos)),
    publishedBooks: JSON.parse(JSON.stringify(currentPublishedBooks)),
    authors: JSON.parse(JSON.stringify(currentAuthors)),
    books: JSON.parse(JSON.stringify(currentBooks)),
    posts: JSON.parse(JSON.stringify(currentPosts)),
    comments: JSON.parse(JSON.stringify(currentComments))
});
```

> [!warning] Deep Copy
> تمام داده‌ها با `JSON.parse(JSON.stringify(...))` کپی می‌شوند تا تغییرات محلی روی state اصلی تأثیر نگذارد. ذخیره نهایی با `onSave(localData)` انجام می‌شود.

---

## ۲۲. توابع کمکی مهم

### `updateTable` (خط ۷۷۷)

```typescript
const updateTable = (key: keyof typeof localData, val: any) => 
    setLocalData(prev => ({ ...prev, [key]: val }));
```

### `handleDelete` (خط ۷۷۸-۷۸۱)

```typescript
const handleDelete = (key: string, id: any, label?: string, onConfirm?: () => void) => {
    const confirmAction = onConfirm || (() => updateTable(key as any, localData[key].filter((x: any) => x.id !== id)));
    showConfirmToast(label || 'آیا از حذف این آیتم اطمینان دارید؟', confirmAction);
};
```

### `applyNotifItem` (خط ۴۷۷-۵۱۱)

پر کردن خودکار عنوان، متن و لینک نوتیفیکیشن بر اساس نوع و شناسه مورد انتخاب‌شده.

---

## ۲۳. نکات فنی مهم

> [!tip] بهینه‌سازی رندر
> - از `useMemo` برای مرتب‌سازی پادکست‌ها استفاده شده
> - از `useCallback` برای تمام توابع بارگذاری استفاده شده
> - مقایسه JSON برای جلوگیری از رندرهای غیرضروری

> [!warning] مدیریت حافظه
> - تمام Audio/Video elements با `useRef` مدیریت می‌شوند
> - event listenerها در `useEffect` cleanup حذف می‌شوند
> - setTimeoutها با `clearTimeout` لغو می‌شوند

> [!info] الگوی طراحی
> - ** optimistic update:** بعد از هر API call، state محلی فوراً به‌روزرسانی می‌شود
> - **Confirmation dialogs:** تمام عملیات خطرناک (حذف، بن) با دیالوگ تأیید انجام می‌شوند
> - **Toast notifications:** تمام نتایج عملیات با toast اطلاع‌رسانی می‌شوند
