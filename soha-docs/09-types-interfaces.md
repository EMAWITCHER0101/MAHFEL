# بخش ۹: اینترفیس‌های TypeScript — تحلیل types.ts

**مسیر فایل:** `types.ts` (ریشه پروژه) — ۱۹۴ خط  
**هدف:** تحلیل جزئی تمام اینترفیس‌ها و تایپ‌های TypeScript که ساختار داده‌های کل پلتفرم را تعریف می‌کنند

---

## فهرست مطالب

1. [مقدمه](#مقدمه)
2. [UserRole — تایپ نقش کاربر](#userrole-تایپ-نقش-کاربر)
3. [User — اینترفیس کاربر (خط ۴-۲۵)](#user-اینترفیس-کاربر-خط-۴-۲۵)
4. [Episode — اینترفیس اپیزود (خط ۲۷-۳۹)](#episode-اینترفیس-اپیزود-خط-۲۷-۳۹)
5. [Podcast — اینترفیس پادکست (خط ۴۱-۵۵)](#podcast-اینترفیس-پادکست-خط-۴۱-۵۵)
6. [Author — اینترفیس نویسنده (خط ۵۷-۶۴)](#author-اینترفیس-نویسنده-خط-۵۷-۶۴)
7. [Book — اینترفیس کتاب (خط ۶۶-۷۵)](#book-اینترفیس-کتاب-خط-۶۶-۷۵)
8. [Video — اینترفیس ویدیو (خط ۷۷-۹۰)](#video-اینترفیس-ویدیو-خط-۷۷-۹۰)
9. [Comment — اینترفیس نظر (خط ۹۲-۱۲۱)](#comment-اینترفیس-نظر-خط-۹۲-۱۲۱)
10. [PostComment — اینترفیس نظر پست (خط ۱۲۳-۱۳۹)](#postcomment-اینترفیس-نظر-پست-خط-۱۲۳-۱۳۹)
11. [MediaItem — اینترفیس آیتم رسانه (خط ۱۴۱-۱۴۴)](#mediaitem-اینترفیس-آیتم-رسانه-خط-۱۴۱-۱۴۴)
12. [Post — اینترفیس پست (خط ۱۴۶-۱۷۰)](#post-اینترفیس-پست-خط-۱۴۶-۱۷۰)
13. [PublishedBook — اینترفیس کتاب منتشر شده (خط ۱۷۲-۱۹۲)](#publishedbook-اینترفیس-کتاب-منتشر-شده-خط-۱۷۲-۱۹۲)
14. [Page — تایپ صفحات (خط ۱۹۴)](#page-تایپ-صفحات-خط-۱۹۴)
15. [تایپ‌های اضافی در services/api.ts](#تایپ‌های-اضافی-در-servicesapits)
16. [نحوه استفاده از اینترفیس‌ها در پروژه](#نحوه-استفاده-از-اینترفیس‌ها-در-پروژه)

---

## مقدمه

فایل `types.ts` در ریشه پروژه، تمام اینترفیس‌ها و تایپ‌هایی که بین فرانت‌اند و بک‌اند مشترک هستند را تعریف می‌کند. این فایل ** Parsing Error ** ندارد و شامل **export** است (یعنی ماژول محسوب می‌شود).

**اهمیت این فایل:**
1. **سندسازی خودکار** — هر فیلد و نوع آن مستند شده
2. **تشخیص خطا** — TypeScript در زمان کامپایل خطاها را پیدا می‌کند
3. **هماهنگی فرانت‌بک** — هر دو طرف از یک ساختار استفاده می‌کنند
4. **IDE Support** — تکمیل خودکار و نمایش اطلاعات فیلدها

**تعداد اینترفیس‌ها:** ۱۰ اینترفیس + ۲ تایپ  
**تعداد خطوط:** ۱۹۴

---

## UserRole — تایپ نقش کاربر

```typescript
export type UserRole = 'user' | 'author' | 'admin';
```

**تحلیل:** یک **Union Type** که سه مقدار ممکن را تعریف می‌کند:

| مقدار | توضیح | دسترسی‌ها |
|-------|-------|----------|
| `'user'` | کاربر عادی | ایجاد پست، نظر، آلبوم، یادداشت، لایک |
| `'author'` | نویسنده | + ایجاد/ویرایش کتاب، پادکست و اپیزود |
| `'admin'` | ادمین | + مدیریت کاربران، محتوا، آمار و تنظیمات |

**نکته:** در مدل MongoDB نقش `superadmin` نیز وجود دارد اما در `types.ts` تعریف نشده. این نقش فقط در سمت سرور استفاده می‌شود.

---

## User — اینترفیس کاربر (خط ۴-۲۵)

```typescript
export interface User {
  id?: string;
  _id?: string;
  email?: string;
  phoneNumber: string;
  name: string;
  avatar: string;
  role: UserRole;
  interests: string[];
  warnings?: number;
  banned?: boolean;
  muted?: boolean;
  mutedUntil?: string | null;
  mutedReason?: string;
  library?: {
    podcasts: string[];
    episodes: { podcastId: string; episodeIndex: number }[];
    videos: string[];
    books: number[];
    notes: number[];
  };
}
```

### تحلیل فیلدها

#### فیلدهای شناسایی

| فیلد | نوع | اختیاری | توضیح |
|------|------|---------|-------|
| `id` | string | بله | شناسه یکتا (تبدیل شده از _id MongoDB) |
| `_id` | string | بله | شناسه اصلی MongoDB (برای سازگاری) |

**دلیل وجود هر دو:** MongoDB از `_id` استفاده می‌کند اما TypeScript conventions از `id`. بنابراین هر دو تعریف شده‌اند.

#### فیلدهای احراز هویت

| فیلد | نوع | اختیاری | توضیح |
|------|------|---------|-------|
| `email` | string | بله | ایمیل (اختیاری در ثبت‌نام) |
| `phoneNumber` | string | **خیر** | شماره موبایل (اجباری) |
| `name` | string | **خیر** | نام نمایشی |
| `avatar` | string | **خیر** | آواتار (Base64 یا URL) |

#### فیلدهای مدیریتی

| فیلد | نوع | اختیاری | توضیح |
|------|------|---------|-------|
| `role` | UserRole | **خیر** | نقش کاربر |
| `interests` | string[] | **خیر** | علاقه‌مندی‌ها |
| `warnings` | number | بله | تعداد اخطارها |
| `banned` | boolean | بله | وضعیت بن |
| `muted` | boolean | بله | وضعیت سکوت |
| `mutedUntil` | string \| null | بله | تاریخ پایان سکوت |
| `mutedReason` | string | بله | دلیل سکوت |

#### فیلد library — کتابخانه شخصی

```typescript
library?: {
  podcasts: string[];           // آیدی پادکست‌های ذخیره شده
  episodes: { podcastId: string; episodeIndex: number }[]; // اپیزودهای ذخیره شده
  videos: string[];             // آیدی ویدیوهای ذخیره شده
  books: number[];              // آیدی کتاب‌های ذخیره شده
  notes: number[];              // آیدی یادداشت‌های ذخیره شده
};
```

**تحلیل:** کتابخانه شخصی هر کاربر شامل پنج دسته آیتم است. هر دسته نوع متفاوتی دارد:
- `podcasts` و `videos` و `posts` — آیدی رشته‌ای (string)
- `episodes` — آبجکت با دو فیلد (podcastId + episodeIndex)
- `books` و `notes` — آیدی عددی (number)

**نکته:** فیلد `posts` در اینترفیس وجود ندارد اما در مدل MongoDB وجود دارد. همچنین فیلد `bookmarks` در مدل MongoDB وجود دارد اما در اینترفیس وجود ندارد.

---

## Episode — اینترفیس اپیزود (خط ۲۷-۳۹)

```typescript
export interface Episode {
  title: string;
  subtitle?: string;
  description: string;
  duration: string;
  audioUrl: string;
  date: string;
  isNew: boolean;
  cover?: string;
  relatedFileUrl?: string;
  viewCount: number;
  fullText?: string;
}
```

### تحلیل فیلدها

| فیلد | نوع | اختیاری | توضیح |
|------|------|---------|-------|
| `title` | string | **خیر** | عنوان اپیزود |
| `subtitle` | string | بله | زیرعنوان |
| `description` | string | **خیر** | توضیحات اپیزود |
| `duration` | string | **خیر** | مدت زمان (فرمت: "HH:MM" یا "MM:SS") |
| `audioUrl` | string | **خیر** | لینک فایل صوتی |
| `date` | string | **خیر** | تاریخ انتشار (متنی) |
| `isNew` | boolean | **خیر** | آیا جدید است (نمایش badge) |
| `cover` | string | بله | لینک کاور اختصاصی |
| `relatedFileUrl` | string | بله | لینک فایل مرتبط (PDF, ZIP) |
| `viewCount` | number | **خیر** | تعداد بازدیدها |
| `fullText` | string | بله | متن کامل (برای جستجوی AI) |

**نکته:** `duration` به صورت string است (نه number). این فرمت برای نمایش راحت‌تر در UI است.

---

## Podcast — اینترفیس پادکست (خط ۴۱-۵۵)

```typescript
export interface Podcast {
  id: number;
  title: string;
  description: string;
  cover: string;
  speakerId: number;
  authorId?: number;
  duration: string;
  episodes: Episode[];
  year: number;
  categories: string[];
  isSquare?: boolean;
  likes?: number;
  likedBy?: string[];
}
```

### تحلیل فیلدها

| فیلد | نوع | اختیاری | توضیح |
|------|------|---------|-------|
| `id` | number | **خیر** | شناسه یکتا |
| `title` | string | **خیر** | عنوان پادکست |
| `description` | string | **خیر** | توضیحات |
| `cover` | string | **خیر** | لینک کاور |
| `speakerId` | number | **خیر** | شناسه گوینده |
| `authorId` | number | بله | شناسه نویسنده |
| `duration` | string | **خیر** | مدت زمان کل |
| `episodes` | Episode[] | **خیر** | لیست اپیزودها |
| `year` | number | **خیر** | سال انتشار |
| `categories` | string[] | **خیر** | دسته‌بندی‌ها |
| `isSquare` | boolean | بله | آیا کاور مربعی است |
| `likes` | number | بله | تعداد لایک‌ها |
| `likedBy` | string[] | بله | لیست لایک‌کنندگان |

**نکته:** `episodes` به صورت آرایه توکار تعریف شده. این یعنی اپیزودها مستقیماً در سند پادکست ذخیره می‌شوند (Embedded).

---

## Author — اینترفیس نویسنده (خط ۵۷-۶۴)

```typescript
export interface Author {
  id: number;
  name: string;
  avatar: string;
  bio: string;
  role: 'master' | 'secretary';
  coverImage?: string;
}
```

### تحلیل فیلدها

| فیلد | نوع | اختیاری | توضیح |
|------|------|---------|-------|
| `id` | number | **خیر** | شناسه یکتا |
| `name` | string | **خیر** | نام نویسنده |
| `avatar` | string | **خیر** | آواتار |
| `bio` | string | **خیر** | بیوگرافی |
| `role` | 'master' \| 'secretary' | **خیر** | نقش (استاد/دبیر) |
| `coverImage` | string | بله | تصویر کاور |

---

## Book — اینترفیس کتاب (خط ۶۶-۷۵)

```typescript
export interface Book {
  id: number;
  title: string;
  authorId: number;
  cover: string;
  relatedEpisodes: Array<{ podcastId: number; episodeIndex: number; }>;
  categories: string[];
  addedDate?: string;
  description?: string;
}
```

### تحلیل فیلدها

| فیلد | نوع | اختیاری | توضیح |
|------|------|---------|-------|
| `id` | number | **خیر** | شناسه یکتا |
| `title` | string | **خیر** | عنوان کتاب |
| `authorId` | number | **خیر** | شناسه نویسنده |
| `cover` | string | **خیر** | لینک کاور |
| `relatedEpisodes` | Array | **خیر** | اپیزودهای مرتبط پادکست |
| `categories` | string[] | **خیر** | دسته‌بندی‌ها |
| `addedDate` | string | بله | تاریخ اضافه شدن |
| `description` | string | بله | توضیحات |

**نکته:** این مدل برای کتاب‌های **کتابخانه** است (مرتبط با پادکست‌ها)، نه کتاب‌های منتشر شده.

---

## Video — اینترفیس ویدیو (خط ۷۷-۹۰)

```typescript
export interface Video {
  id: string;
  embedId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  viewCount: number;
  uploadDate: string;
  duration: number;
  categories: string[];
  likes?: number;
  fullText?: string;
  authorId?: string;
}
```

### تحلیل فیلدها

| فیلد | نوع | اختیاری | توضیح |
|------|------|---------|-------|
| `id` | string | **خیر** | شناسه یکتا |
| `embedId` | string | **خیر** | شناسه در پلتفرم خارجی (آپارات/یوتیوب) |
| `title` | string | **خیر** | عنوان |
| `description` | string | **خیر** | توضیحات |
| `thumbnailUrl` | string | **خیر** | لینک تصویر بندانگشتی |
| `viewCount` | number | **خیر** | تعداد بازدیدها |
| `uploadDate` | string | **خیر** | تاریخ آپلود |
| `duration` | number | **خیر** | مدت زمان (بر حسب ثانیه) |
| `categories` | string[] | **خیر** | دسته‌بندی‌ها |
| `likes` | number | بله | تعداد لایک‌ها |
| `fullText` | string | بله | متن کامل (برای جستجوی AI) |
| `authorId` | string | بله | شناسه نویسنده |

**تفاوت با Episode:** `duration` در Video عددی (ثانیه) و در Episode رشته‌ای ("HH:MM") است.

---

## Comment — اینترفیس نظر (خط ۹۲-۱۲۱)

```typescript
export interface Comment {
  id: number;
  _id?: string;
  type: 'podcast' | 'video' | 'book';
  author: string;
  authorAvatarUrl?: string;
  userId?: string;
  text: string;
  date: string;
  isoDate: string;
  likes: number;
  isFeatured: boolean;
  isEdited?: boolean;
  podcastId?: number;
  episodeIndex?: number;
  podcastTitle?: string;
  episodeTitle?: string;
  timestamp?: number;
  videoId?: string;
  videoTitle?: string;
  bookId?: number;
  videoTimestamp?: number;
  audioTimestamp?: number;
  parentId?: string | null;
  quotedText?: string;
  replies?: Comment[];
  authorName?: string;
  media?: { type: 'image' | 'video' | 'audio'; url: string }[];
  likedBy?: string[];
}
```

### تحلیل فیلدها

#### فیلدهای پایه

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | number | شناسه یکتا |
| `_id` | string | شناسه MongoDB (اختیاری) |
| `type` | union | نوع محتوا: podcast, video, book |
| `author` | string | نام نویسنده |
| `authorAvatarUrl` | string | آواتار نویسنده |
| `userId` | string | شناسه کاربر |
| `text` | string | متن نظر |
| `date` | string | تاریخ نمایشی |
| `isoDate` | string | تاریخ دقیق ISO |

#### فیلدهای تعامل

| فیلد | نوع | توضیح |
|------|------|-------|
| `likes` | number | تعداد لایک‌ها |
| `isFeatured` | boolean | آیا ویژه شده (توسط ادمین) |
| `isEdited` | boolean | آیا ویرایش شده |
| `likedBy` | string[] | لیست لایک‌کنندگان |

#### فیلدهای مرتبط با پادکست

| فیلد | نوع | توضیح |
|------|------|-------|
| `podcastId` | number | شناسه پادکست |
| `episodeIndex` | number | شماره اپیزود |
| `podcastTitle` | string | عنوان پادکست (Denormalized) |
| `episodeTitle` | string | عنوان اپیزود (Denormalized) |
| `timestamp` | number | زمان دقیق در فایل صوتی |
| `audioTimestamp` | number | زمان دقیق صوتی |

#### فیلدهای مرتبط با ویدیو

| فیلد | نوع | توضیح |
|------|------|-------|
| `videoId` | string | شناسه ویدیو |
| `videoTitle` | string | عنوان ویدیو (Denormalized) |
| `videoTimestamp` | number | زمان دقیق در ویدیو |

#### فیلدهای مرتبط با کتاب

| فیلد | نوع | توضیح |
|------|------|-------|
| `bookId` | number | شناسه کتاب |

#### فیلدهای ساختار درختی

| فیلد | نوع | توضیح |
|------|------|-------|
| `parentId` | string \| null | شناسه نظر والد |
| `quotedText` | string | متن نقل‌قول شده |
| `replies` | Comment[] | لیست ریپلای‌ها |
| `authorName` | string | نام نویسنده (نسخه جایگزین) |

#### فیلدهای رسانه

| فیلد | نوع | توضیح |
|------|------|-------|
| `media` | Array | آیتم‌های رسانه (تصویر/ویدیو/صوت) |

**نکته مهم:** `Comment` یک اینترفیس **بازگشتی (Recursive)** است — فیلد `replies` نوع `Comment[]` دارد.

---

## PostComment — اینترفیس نظر پست (خط ۱۲۳-۱۳۹)

```typescript
export interface PostComment {
  id: number;
  _id?: string;
  author: string;
  authorAvatarUrl: string;
  userId?: string;
  text: string;
  date: string;
  isoDate: string;
  replyTo?: string;
  quotedText?: string;
  likes?: number;
  isEdited?: boolean;
  media?: { type: 'image' | 'video' | 'audio'; url: string }[];
  videoTimestamp?: number;
  audioTimestamp?: number;
}
```

### تفاوت با Comment

| فیلد | Comment | PostComment | توضیح |
|------|---------|-------------|-------|
| `type` | `type: union` | ❌ | PostComment همیشه نوع پست دارد |
| `podcastId` | ✅ | ❌ | نظر پست ممکن است محتوای خاصی نداشته باشد |
| `videoId` | ✅ | ❌ | — |
| `bookId` | ✅ | ❌ | — |
| `parentId` | ✅ | ❌ | از `replyTo` استفاده می‌شود |
| `replyTo` | ❌ | ✅ | آیدی نظر والد (رشته‌ای، نه ObjectId) |
| `isFeatured` | ✅ | ❌ | ویژه کردن فقط برای نظرات مستقل |
| `likedBy` | ✅ | ❌ | — |
| `authorAvatarUrl` | اختیاری | **اجباری** | — |

**تحلیل:** `PostComment` ساده‌تر از `Comment` است چون نظرات پست فقط یک نوع دارند و نیازی به فیلدهای اضافی ندارند.

---

## MediaItem — اینترفیس آیتم رسانه (خط ۱۴۱-۱۴۴)

```typescript
export interface MediaItem {
  type: 'image' | 'video' | 'audio';
  url: string;
}
```

**تحلیل:** یک اینترفیس ساده برای آیتم‌های رسانه. هر آیتم یک نوع (تصویر/ویدیو/صوت) و یک URL دارد.

**استفاده:** در `Post.media` و `PostComment.media` و `Comment.media`.

---

## Post — اینترفیس پست (خط ۱۴۶-۱۷۰)

```typescript
export interface Post {
  id: number;
  author: string;
  authorAvatarUrl: string;
  userId?: string;
  date: string;
  isoDate: string;
  text?: string;
  media?: MediaItem[];
  videoId?: string;
  podcastId?: number;
  episodeIndex?: number;
  bookId?: number;
  timestamp?: number;
  comments: PostComment[];
  likes: number;
  reactions?: { [key: string]: number };
  isPinned?: boolean;
  replyToId?: number;
  isEdited?: boolean;
  sourceText?: string;
  isLive?: boolean;
  liveStatus?: 'streaming' | 'ended';
}
```

### تحلیل فیلدها

#### فیلدهای پایه

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | number | شناسه یکتا |
| `author` | string | نام نویسنده (Denormalized) |
| `authorAvatarUrl` | string | آواتار نویسنده (Denormalized) |
| `userId` | string | شناسه کاربر |
| `date` | string | تاریخ نمایشی |
| `isoDate` | string | تاریخ دقیق ISO |

#### فیلدهای محتوا

| فیلد | نوع | توضیح |
|------|------|-------|
| `text` | string | متن پست (اختیاری — پست فقط رسانه) |
| `media` | MediaItem[] | آیتم‌های رسانه |

#### فیلدهای مرتبط

| فیلد | نوع | توضیح |
|------|------|-------|
| `videoId` | string | ارجاع به ویدیو |
| `podcastId` | number | ارجاع به پادکست |
| `episodeIndex` | number | شماره اپیزود |
| `bookId` | number | ارجاع به کتاب |
| `timestamp` | number | زمان دقیق در محتوا |

#### فیلدهای تعامل

| فیلد | نوع | توضیح |
|------|------|-------|
| `comments` | PostComment[] | نظرات توکار |
| `likes` | number | تعداد لایک‌ها |
| `reactions` | { [key: string]: number } | واکنش‌های emoji |

#### فیلدهای مدیریتی

| فیلد | نوع | توضیح |
|------|------|-------|
| `isPinned` | boolean | آیا سنجاق شده |
| `replyToId` | number | ارجاع به پست دیگر |
| `isEdited` | boolean | آیا ویرایش شده |
| `sourceText` | string | متن اصلی قبل از ویرایش |

#### فیلدهای پخش زنده

| فیلد | نوع | توضیح |
|------|------|-------|
| `isLive` | boolean | آیا پخش زنده است |
| `liveStatus` | 'streaming' \| 'ended' | وضعیت زنده |

---

## PublishedBook — اینترفیس کتاب منتشر شده (خط ۱۷۲-۱۹۲)

```typescript
export interface PublishedBook {
  id: number;
  cover: string;
  backCover?: string;
  title: string;
  subtitle: string;
  description: string;
  authorName: string;
  pdfUrl?: string;
  pdfPages?: string[];
  buyUrl?: string;
  isNew?: boolean;
  price?: string;
  contentHtml?: string;
  tableOfContents?: string;
  type?: 'book' | 'pamphlet' | 'note';
  date?: string;
  relatedAudioIds?: number[];
  authorId?: string;
  isDraft?: boolean;
}
```

### تحلیل فیلدها

#### فیلدهای اصلی

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | number | شناسه یکتا |
| `cover` | string | کاور جلو |
| `backCover` | string | کاور پشت (اختیاری) |
| `title` | string | عنوان |
| `subtitle` | string | زیرعنوان |
| `description` | string | توضیحات |
| `authorName` | string | نام نویسنده |

#### فیلدهای محتوا

| فیلد | نوع | توضیح |
|------|------|-------|
| `pdfUrl` | string | لینک فایل PDF |
| `pdfPages` | string[] | تصاویر صفحات PDF |
| `contentHtml` | string | محتوای HTML |
| `tableOfContents` | string | فهرست مطالب |

#### فیلدهای فروش

| فیلد | نوع | توضیح |
|------|------|-------|
| `buyUrl` | string | لینک خرید |
| `price` | string | قیمت (متنی: "۵۰,۰۰۰ تومان") |

#### فیلدهای نوع و وضعیت

| فیلد | نوع | توضیح |
|------|------|-------|
| `type` | 'book' \| 'pamphlet' \| 'note' | نوع محتوا |
| `isNew` | boolean | آیا جدید است |
| `date` | string | تاریخ انتشار |
| `isDraft` | boolean | آیا پیش‌نویس است |
| `authorId` | string | شناسه نویسنده |

#### فیلدهای مرتبط

| فیلد | نوع | توضیح |
|------|------|-------|
| `relatedAudioIds` | number[] | شناسه‌های پادکست‌های مرتبط |

---

## Page — تایپ صفحات (خط ۱۹۴)

```typescript
export type Page = 'mahfel' | 'sowt' | 'matn' | 'videos' | 'library' | 'nashr' | 'support';
```

**تحلیل:** یک Union Type که صفحات اصلی اپلیکیشن را تعریف می‌کند:

| مقدار | صفحه | توضیح |
|-------|------|-------|
| `'mahfel'` | محفل | صفحه اصلی جامعه |
| `'sowt'` | سوّت | صفحه پادکست‌ها |
| `'matn'` | متن | صفحه محتوا/متن |
| `'videos'` | ویدیوها | صفحه ویدیوها |
| `'library'` | کتابخانه | صفحه کتابخانه |
| `'nashr'` | نشر | صفحه انتشارات |
| `'support'` | پشتیبانی | صفحه پشتیبانی |

---

## تایپ‌های اضافی در services/api.ts

فایل `services/api.ts` شامل تایپ‌های اضافی است که در `types.ts` تعریف نشده‌اند:

### PurchaseRequestItem (خط ۶۹۱-۶۹۶)

```typescript
export interface PurchaseRequestItem {
  title: string;
  cover?: string;
  price?: string;
  quantity: number;
}
```

### PurchaseRequest (خط ۶۹۸-۷۱۳)

```typescript
export interface PurchaseRequest {
  _id: string;
  userId: string;
  userName: string;
  userPhone: string;
  orderNumber: string;
  items: PurchaseRequestItem[];
  totalPrice: number;
  cardNumber: string;
  transferDate: string;
  transferTime: string;
  trackingCode: string;
  status: 'pending' | 'confirmed' | 'rejected';
  adminNote?: string;
  createdAt?: string;
}
```

### Expense (خط ۷۴۶-۷۵۳)

```typescript
export interface Expense {
  _id: string;
  title: string;
  amount: number;
  note?: string;
  date?: string;
  createdAt?: string;
}
```

### PurchaseStats (خط ۷۵۵-۷۷۳)

```typescript
export interface PurchaseStats {
  period: string;
  totals: {
    confirmed: { count: number; sum: number };
    pending: { count: number; sum: number };
    rejected: { count: number; sum: number };
  };
  daily: { date: string; value: number }[];
  topBooks: { title: string; revenue: number; qty: number }[];
  books: {
    title: string;
    qty: number;
    revenue: number;
    orders: number;
    buyers: { name: string; phone: string; qty: number; date: string }[];
  }[];
  expenses: { count: number; sum: number };
  netProfit: number;
}
```

### PublicUserProfile (خط ۷۹۵-۸۰۷)

```typescript
export interface PublicUserProfile {
  id: string;
  name: string;
  avatar: string;
  role: string;
  createdAt?: string;
  banned?: boolean;
  muted?: boolean;
  mutedUntil?: string | null;
  warnings?: number;
  postCount?: number;
  commentCount?: number;
}
```

### CommunityChatSettings (خط ۸۱۳-۸۱۶)

```typescript
export interface CommunityChatSettings {
  chatEnabled: boolean;
  chatMessage: string;
}
```

### AppUpdateInfo (خط ۸۳۰-۸۳۸)

```typescript
export interface AppUpdateInfo {
  apkVersion?: string;
  apkUrl?: string;
  apkMessage?: string;
  desktopVersion?: string;
  desktopUrl?: string;
  desktopMessage?: string;
  updatedAt?: string;
}
```

### SupportCategory و SupportMessage (خط ۹۰۲-۹۱۲)

```typescript
export type SupportCategory = 'bug' | 'suggestion' | 'question' | 'other';

export type SupportMessage = {
  _id: string;
  name: string;
  contact: string;
  category: SupportCategory;
  message: string;
  userId?: string;
  isRead: boolean;
  createdAt: string;
};
```

### VideoPlaylist (خط ۱۹۲)

```typescript
export type VideoPlaylist = {
  id: string;
  name: string;
  slug: string;
  description: string;
  cover: string;
  count: number;
  order: number;
  visible?: boolean;
};
```

### StreamData (خط ۲۳۷)

```typescript
type StreamData = {
  defaultUrl: string;
  qualities: { profile: string; label: string; url: string; size: string }[];
};
```

---

## نحوه استفاده از اینترفیس‌ها در پروژه

### در فرانت‌اند (React)

```typescript
import { Podcast, Video, Post } from '../types';

const PodcastPage: React.FC = () => {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  
  useEffect(() => {
    getPodcasts().then(setPodcasts);
  }, []);
  
  return (
    <div>
      {podcasts.map(p => (
        <PodcastCard key={p.id} podcast={p} />
      ))}
    </div>
  );
};
```

### در API Client

```typescript
import type { Podcast, Comment, Video, Post } from '../types';

export const getPodcasts = async (): Promise<Podcast[]> => {
  const data = await apiFetch<any[]>('/podcasts');
  if (!data) return [];
  return data.map((p: any) => ({
    ...p,
    id: p._id || p.id,
    speakerId: typeof p.speakerId === 'object' ? p.speakerId._id || p.speakerId.id : p.speakerId,
  }));
};
```

### در سرویس‌ها

```typescript
import { Podcast, Video, Post, PublishedBook, Author } from '../types';

export async function aiAssistant(message: string, data: { 
  podcasts: Podcast[]; 
  videos: Video[]; 
  posts: Post[]; 
  books: PublishedBook[]; 
  authors: Author[] 
}): Promise<string> {
  // ...
}
```

### در مدل‌های MongoDB

```javascript
// مدل MongoDB (server-side)
const podcastSchema = new mongoose.Schema({
  title: { type: String, required: true },
  episodes: [episodeSchema],
  // ...
});

// اینترفیس TypeScript (client-side)
export interface Podcast {
  id: number;
  title: string;
  episodes: Episode[];
  // ...
}
```

**نکته:** مدل MongoDB و اینترفیس TypeScript همیشه ۱۰۰٪ مطابقت ندارند. ممکن است فیلدهایی در MongoDB باشند که در TypeScript تعریف نشده‌اند (مثل `securityKey`, `fcmTokens`).

---

## الگوهای طراحی

### الگوی Denormalization

بسیاری از فیلدها به صورت **Denormalized** تعریف شده‌اند:
- `Post.author` — نام نویسنده مستقیماً ذخیره شده (نه فقط `userId`)
- `Comment.podcastTitle` — عنوان پادکست ذخیره شده
- `AnalyticsEvent.refTitle` — عنوان محتوا ذخیره شده

**مزیت:** خواندن سریع (بدون JOIN)  
**عیب:** به‌روزرسانی دشوار (باید در تمام مکان‌ها به‌روز شود)

### الگوی Optional Fields

بسیاری از فیلدها با `?` اختیاری تعریف شده‌اند. این یعنی:
- ممکن است در دیتابیس وجود نداشته باشند
- ممکن است API پاسخ ندهد
- باید همیشه با `?.` یا `||` دسترسی پیدا کنیم

### الگوی Union Types

تایپ‌های `UserRole`، `Page`، `SupportCategory` و `MediaItem.type` از **Union Type** استفاده می‌کنند که:
- محدودیت مقدار ایجاد می‌کند
- تشخیص خطا را بهبود می‌بخشد
- خوانایی کد را افزایش می‌دهد

---

**تعداد کل اینترفیس‌ها:** ۱۰ اصلی + ۸ اضافی = ۱۸ اینترفیس  
**تعداد کل تایپ‌ها:** ۳ تایپ (UserRole, Page, SupportCategory)  
**تعداد خطوط:** ۱۹۴ (types.ts) + ~۱۰۰ (api.ts types) = ~۲۹۴ خط
