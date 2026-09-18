# بخش ۴: لایه API Client — services/api.ts

## مسیر فایل
`E:\soha\services\api.ts` — 1072 خط

## خلاصه
این فایل لایه ارتباطی بین فرانت‌اند و بک‌اند است. تمام درخواست‌های HTTP از طریق این فایل ارسال می‌شوند.

## ساختار پایه

### تابع `getApiBase()` (خط 4)
```typescript
export const getApiBase = (): string => {
  const saved = localStorage.getItem('mahfel_server_url');
  if (saved) return saved;
  return '/api';
};
```
**توضیح**: آدرس سرور API. به صورت پیش‌فرض از پروکسی `/api` استفاده می‌شود. کاربر می‌تواند آدرس سرور را در localStorage تغییر دهد (برای توسعه).

### تابع `apiFetch()` (خط 23)
```typescript
const apiFetch = async <T>(endpoint: string, options?: RequestInit): Promise<T | null> => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers(), ...options?.headers },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'خطای سرور' }));
      if (err.banned) return { error: err.error, banned: true } as any;
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return null;
  }
};
```

**توضیح**:
- تابع ژنریک `<T>` برای type safety
- هدر `Authorization` به صورت خودکار اضافه می‌شود
- خطاها مدیریت شده و `null` برمی‌گرداند
- اگر کاربر مسدود شده باشد (`banned: true`)، اطلاعات مسدود شدن برگردانده می‌شود

## بخش‌های API

### 1. احراز هویت (خطوط 42-100)

| تابع | متد | endpoint | توضیح |
|------|------|----------|--------|
| `register()` | POST | `/auth/register` | ثبت‌نام با OTP |
| `login()` | POST | `/auth/login` | ورود با رمز عبور |
| `sendOtp()` | POST | `/auth/send-otp` | ارسال کد تایید |
| `verifyOtp()` | POST | `/auth/verify-otp` | تایید کد OTP |
| `resetPassword()` | POST | `/auth/reset-password` | بازیابی رمز عبور |
| `completeProfile()` | POST | `/auth/complete-profile` | تکمیل پروفایل |
| `getMe()` | GET | `/auth/me` | دریافت اطلاعات کاربر |
| `updateInterests()` | POST | `/auth/interests` | به‌روزرسانی علاقه‌مندی‌ها |
| `updateLibrary()` | PUT | `/auth/library` | به‌روزرسانی کتابخانه |
| `updateProfile()` | PUT | `/auth/profile` | ویرایش پروفایل |

### 2. پادکست‌ها (خطوط 110-165)

```typescript
export const getPodcasts = async (): Promise<Podcast[]> => {
  const data = await apiFetch<any[]>('/podcasts');
  return data.map((p: any) => ({
    ...p,
    id: p._id || p.id,
    speakerId: typeof p.speakerId === 'object' ? p.speakerId._id : p.speakerId,
    episodes: (p.episodes || []).map((e: any) => ({ ...e, id: e._id })),
  }));
};
```

**توضیح**: تبدیل `_id` MongoDB به `id` برای سازگاری با فرانت‌اند. `speakerId` ممکن است populated باشد (آبجکت) یا ساده (string).

**تابع `recordPodcastPlay`**: ثبت پخش پادکست. از `Set` برای جلوگیری از ثبت تکراری در هر نشست استفاده می‌شود.

### 3. ویدیوها و پلی‌لیست‌ها (خطوط 192-255)

```typescript
export const prefetchStream = (id: string) => {
  if (streamCache.has(id)) return;
  const promise = apiFetch<StreamData>(`/videos/${id}/stream`);
  streamCache.set(id, promise);
};
```

**توضیح**: `streamCache` (Map) برای کش کردن اطلاعات استریم ویدیو. وقتی کاربر نزدیک یک ویدیو اسکرول می‌کند، stream از پیش دریافت می‌شود.

### 4. کامنت‌ها (خطوط 257-298)

```typescript
export const getComments = async (filters?: { videoId?: string; type?: string }): Promise<Comment[]> => {
  const params = new URLSearchParams();
  if (filters?.videoId) params.set('videoId', filters.videoId);
  if (filters?.type) params.set('type', filters.type);
  const data = await apiFetch<any[]>(`/comments${qs ? '?' + qs : ''}`);
  return data.map((c: any) => ({
    ...c,
    id: c._id || c.id,
    replies: (c.replies || []).map((r: any) => ({ ...r, id: r._id || r.id })),
  }));
};
```

**توضیح**: کامنت‌ها به صورت درختی ساختار دارند. `parentId` ارجاع به کامنت والد دارد.

### 5. پست‌های اجتماعی (خطوط 327-402)

```typescript
export const addPostComment = async (
  postId: string, text: string, replyTo?: string, 
  media?: { type: string; url: string }[], 
  quotedText?: string, audioTimestamp?: number, videoTimestamp?: number
): Promise<Post | null> => {
  const data = await apiFetch<any>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text, replyTo, media, quotedText, audioTimestamp, videoTimestamp }),
  });
```

**توضیح**: کامنت‌های پست از نوع `PostComment` هستند و در داخل پست ذخیره می‌شوند (متفاوت با کامنت‌های پادکست/ویدیو که در مدل `Comment` جداگانه هستند).

### 6. یادداشت‌ها و کتاب‌های منتشر شده (خطوط 404-490)

| تابع | متد | endpoint |
|------|------|----------|
| `getPublishedBooks()` | GET | `/published-books` |
| `getMyNotes()` | GET | `/published-books/mine` |
| `createPublishedBook()` | POST | `/published-books` |
| `updatePublishedBook()` | PUT | `/published-books/:id` |
| `deletePublishedBook()` | DELETE | `/published-books/:id` |
| `toggleNoteLike()` | POST | `/published-books/:id/like` |
| `getAuthorNotes()` | GET | `/published-books/author/:authorId` |

### 7. مدیریت ادمین (خطوط 513-660)

| تابع | endpoint | توضیح |
|------|----------|--------|
| `getAdminStats()` | `/admin/stats` | آمار کلی |
| `getAdminUsers()` | `/admin/users` | لیست کاربران |
| `updateUserRole()` | `/admin/users/:id/role` | تغییر نقش |
| `adminDeletePost()` | `/admin/posts/:id` | حذف پست |
| `adminBulkUsers()` | `/admin/users/bulk` | عملیات گروهی |
| `adminPurgePosts()` | `/admin/posts/purge` | حذف تمام پست‌ها |
| `muteUser()` | `/admin/users/:id/mute` | بی‌صدا کردن |
| `banUser()` | `/admin/users/:id/ban` | مسدود کردن |

### 8. درخواست‌های خرید (خطوط 690-793)

```typescript
export interface PurchaseRequest {
  _id: string;
  userId: string;
  items: PurchaseRequestItem[];
  totalPrice: number;
  cardNumber: string;
  transferDate: string;
  trackingCode: string;
  status: 'pending' | 'confirmed' | 'rejected';
}
```

**توضیح**: سیستم خرید کتاب با کارت به کارت. کاربر اطلاعات انتقال را وارد می‌کند و ادمین تأیید یا رد می‌کند.

### 9. پشتیبانی (خطوط 901-940)

```typescript
export type SupportCategory = 'bug' | 'suggestion' | 'question' | 'other';
```

### 10. مجوزهای ادمین (خطوط 947-1072)

```typescript
export const ALL_ROLE_PERMISSIONS = [
  { id: 'create_post', label: 'ایجاد پست', category: 'user' },
  { id: 'users', label: 'مدیریت کاربران', category: 'admin' },
  // ...
];
```

**توضیح**: سیستم مجوزهای ریز (fine-grained permissions) برای مدیریت نقش‌ها. هر نقش مجموعه‌ای از مجوزها را دارد.

## الگوهای مهم

### Type Mapping
تمام پاسخ‌ها از `_id` (MongoDB) به `id` تبدیل می‌شوند:
```typescript
id: p._id || p.id
```

### Error Handling
تمام توابع `null` در صورت خطا برمی‌گردانند. کالرها باید بررسی کنند.

### Session Deduplication
برای ثبت پخش/بازدید، از `Set` برای جلوگیری از ثبت تکراری در هر نشست استفاده می‌شود.
