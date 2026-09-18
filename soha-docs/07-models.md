# بخش ۷: مدل‌های MongoDB — تحلیل کامل models

**مسیر فایل‌ها:** `server/models/*.js`  
**هدف:** تحلیل جزئی تمام مدل‌های MongoDB، ساختار Schema، ایندکس‌ها و روابط بین مدل‌ها

---

## فهرست مطالب

1. [مقدمه](#مقدمه)
2. [User.js — مدل کاربر (۷۵ خط)](#userjs-مدل-کاربر-۷۵-خط)
3 [Post.js — مدل پست (۵۸ خط)](#postjs-مدل-پست-۵۸-خط)
4. [Comment.js — مدل نظر (۳۸ خط)](#commentjs-مدل-نظر-۳۸-خط)
5. [Podcast.js — مدل پادکست (۳۵ خط)](#podcastjs-مدل-پادکست-۳۵-خط)
6. [Book.js — مدل کتاب (۱۸ خط)](#bookjs-مدل-کتاب-۱۸-خط)
7. [PublishedBook.js — مدل کتاب منتشر شده (۳۱ خط)](#publishedbookjs-مدل-کتاب-منتشر-شده-۳۱-خط)
8. [Video.js — مدل ویدیو (۲۰ خط)](#videojs-مدل-ویدیو-۲۰-خط)
9. [Author.js — مدل نویسنده (۱۱ خط)](#authorjs-مدل-نویسنده-۱۱-خط)
10. [سایر مدل‌ها](#سایر-مدل‌ها)
11. [نحوه اتصال مدل‌ها به types.ts](#نحوه-اتصال-مدل‌ها-به-typests)
12. [الگوهای طراحی و روابط](#الگوهای-طراحی-و-روابط)

---

## مقدمه

پروژه محفل از **MongoDB** به عنوان پایگاه داده اصلی استفاده می‌کند و **Mongoose** به عنوان ODM (Object Document Mapper) عمل می‌کند. هر مدل در فایل جداگانه‌ای تعریف شده و شامل Schema، ایندکس‌ها و متد‌های اختصاصی است.

**تعداد کل مدل‌ها:** ۱۶ مدل

| مدل | فایل | خطوط | توضیح |
|-----|------|------|-------|
| User | User.js | ۷۵ | کاربران سیستم |
| Post | Post.js | ۵۸ | پست‌های جامعه |
| Comment | Comment.js | ۳۸ | نظرات مستقل |
| Podcast | Podcast.js | ۳۵ | پادکست‌ها |
| Episode | (توکار در Podcast) | — | اپیزودهای پادکست |
| Book | Book.js | ۱۸ | کتاب‌های کتابخانه |
| PublishedBook | PublishedBook.js | ۳۱ | کتاب‌های منتشر شده |
| Video | Video.js | ۲۰ | ویدیوها |
| Author | Author.js | ۱۱ | نویسندگان |
| Notification | Notification.js | ۲۱ | نوتیفیکیشن‌ها |
| AnalyticsEvent | AnalyticsEvent.js | ۱۶ | رویدادهای تحلیلی |
| Setting | Setting.js | ۱۱ | تنظیمات کلید-مقدار |
| PushSubscription | PushSubscription.js | ۲۰ | اشتراک‌های Push |
| Expense | Expense.js | ۱۵ | هزینه‌ها |
| PurchaseRequest | PurchaseRequest.js | ۳۲ | درخواست‌های خرید |
| SupportMessage | SupportMessage.js | ۱۳ | پیام‌های پشتیبانی |
| VideoPlaylist | VideoPlaylist.js | ۱۳ | لیست‌های پخش ویدیو |
| Album | Album.js | ۲۵ | آلبوم‌های شخصی |
| AppUpdate | AppUpdate.js | ۱۶ | به‌روزرسانی اپ |

---

## User.js — مدل کاربر (۷۵ خط)

**مسیر فایل:** `server/models/User.js`  
**تعداد خطوط:** ۷۵

### Schema اصلی

```javascript
const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password: { type: String },
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['user', 'author', 'admin', 'superadmin'], default: 'user' },
  adminPermissions: [{ type: String }],
  adminRequests: [adminRequestSchema],
  rolePermissions: {
    type: Map,
    of: [String],
    default: {
      user: ['create_post', 'create_comment', 'create_album', 'create_note', 'purchase_request', 'like_content', 'manage_library'],
      author: ['create_post', 'create_comment', 'create_album', 'create_note', 'purchase_request', 'like_content', 'manage_library', 'create_book', 'edit_book', 'create_podcast', 'edit_podcast', 'manage_episodes'],
      admin: ['users', 'posts', 'comments', 'analytics', 'sales', 'videos', 'podcasts', 'library', 'notes', 'authors', 'versions', 'purchases', 'support', 'notifications', 'settings'],
    },
  },
  warnings: { type: Number, default: 0 },
  banned: { type: Boolean, default: false },
  muted: { type: Boolean, default: false },
  mutedUntil: { type: Date, default: null },
  mutedReason: { type: String, default: '' },
  interests: [{ type: String }],
  securityKey: String,
  fcmTokens: [{ type: String }],
  library: {
    podcasts: [{ type: String }],
    episodes: [{ podcastId: String, episodeIndex: Number }],
    videos: [{ type: String }],
    books: [{ type: Number }],
    notes: [{ type: Number }],
    posts: [{ type: String }],
    bookmarks: [{ bookId: String, bookTitle: String, page: Number, text: String }],
  },
}, { timestamps: true });
```

### تحلیل فیلدها

#### فیلدهای احراز هویت

| فیلد | نوع | توضیح |
|------|------|-------|
| `phoneNumber` | String (unique, sparse) | شماره موبایل — کلید اصلی احراز هویت |
| `email` | String (unique, sparse, lowercase) | ایمیل — اختیاری |
| `password` | String | رمز عبور هش شده با bcrypt |
| `securityKey` | String | کلید امنیتی برای تأیید هویت admin/author |

**نکته `sparse`:** ایندکس unique با گزینه sparse یعنی مقادیر null در ایندکس شرکت نمی‌کنند. بنابراین چند کاربر می‌توانند email نداشته باشند (null) اما اگر email داشته باشند، باید یکتا باشد.

#### فیلدهای نقش و دسترسی

| فیلد | نوع | توضیح |
|------|------|-------|
| `role` | String (enum) | نقش کاربر: user, author, admin, superadmin |
| `adminPermissions` | [String] | لیست مجوزهای ادمین |
| `adminRequests` | [adminRequestSchema] | درخواست‌های ارتقاء نقش |
| `rolePermissions` | Map<String, [String]> | مجوزهای پیش‌فرض هر نقش |

**سیستم نقش‌ها:**
- **user:** دسترسی پایه (ایجاد پست، نظر، آلبوم، یادداشت، لایک)
- **author:** + ایجاد/ویرایش کتاب، پادکست و اپیزود
- **admin:** + مدیریت کاربران، پست‌ها، نظرات، آمار و تنظیمات
- **superadmin:** دسترسی کامل (فوق همه)

#### فیلدهای مدیریت کاربر

| فیلد | نوع | توضیح |
|------|------|-------|
| `warnings` | Number | تعداد اخطارها (حداکثر ۳ → بن) |
| `banned` | Boolean | وضعیت بن |
| `muted` | Boolean | وضعیت سکوت |
| `mutedUntil` | Date | تاریخ پایان سکوت |
| `mutedReason` | String | دلیل سکوت |

#### فیلدهای اطلاعات شخصی

| فیلد | نوع | توضیح |
|------|------|-------|
| `name` | String | نام نمایشی |
| `avatar` | String | آواتار (Base64 یا URL) |
| `interests` | [String] | علاقه‌مندی‌ها |
| `fcmTokens` | [String] | توکن‌های FCM برای push notification |

#### فیلد library — کتابخانه شخصی

```javascript
library: {
  podcasts: [{ type: String }],           // آیدی پادکست‌های ذخیره شده
  episodes: [{ podcastId: String, episodeIndex: Number }], // اپیزودهای ذخیره شده
  videos: [{ type: String }],             // آیدی ویدیوهای ذخیره شده
  books: [{ type: Number }],              // آیدی کتاب‌های ذخیره شده
  notes: [{ type: Number }],              // آیدی یادداشت‌های ذخیره شده
  posts: [{ type: String }],              // آیدی پست‌های ذخیره شده
  bookmarks: [{ bookId: String, bookTitle: String, page: Number, text: String }], // نشانک‌ها
}
```

**تحلیل:** کتابخانه شخصی هر کاربر در همان سند User ذخیره شده (Embedded). این الگو برای مواردی مناسب است که:
- حجم داده محدود است (هر کاربر حداکثر چند صد آیتم)
- نیاز به خواندن سریع کتابخانه بدون JOIN داریم
- تغییرات کتابخانه کمتر از خواندن آن است

### Middleware pre-save

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

**تحلیل:** قبل از ذخیره هر سند User:
- اگر `securityKey` تغییر کرده باشد → با bcrypt هش می‌شود ( salt rounds = 10 )
- اگر `password` تغییر کرده باشد → با bcrypt هش می‌شود

**نکته امنیتی:** رمز عبور هیچ‌وقت به صورت متن ساده ذخیره نمی‌شود.

### متدهای نمونه

```javascript
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.compareSecurityKey = async function (candidateKey) {
  if (!this.securityKey) return false;
  return bcrypt.compare(candidateKey, this.securityKey);
};
```

**تحلیل:** این متدها برای مقایسه رمز عبور/کلید امنیتی ورودی با مقدار هش شده در دیتابیس استفاده می‌شوند.

### ایندکس‌ها

```javascript
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ name: 1 });
```

| ایندکس | هدف |
|--------|-----|
| `{ role: 1, createdAt: -1 }` | جستجوی کاربران بر اساس نقش (مرتب شده بر اساس تاریخ) |
| `{ createdAt: -1 }` | لیست آخرین کاربران |
| `{ name: 1 }` | جستجوی کاربر بر اساس نام |

---

## Post.js — مدل پست (۵۸ خط)

**مسیر فایل:** `server/models/Post.js`  
**تعداد خطوط:** ۵۸

### Schema رسانه (MediaItem)

```javascript
const mediaItemSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'video', 'audio'], required: true },
  url: { type: String, required: true },
}, { _id: false });
```

**تحلیل:** هر پست می‌تواند شامل چند آیتم رسانه باشد. گزینه `_id: false` یعنی برای هر آیتم رسانه آیدی جداگانه تولید نمی‌شود (چون نیازی به آن نیست).

### Schema نظر توکار (PostComment)

```javascript
const postCommentSchema = new mongoose.Schema({
  author: { type: String, required: true },
  authorAvatarUrl: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  text: { type: String, required: true },
  date: { type: String, default: '' },
  isoDate: { type: String, default: () => new Date().toISOString() },
  replyTo: String,
  quotedText: String,
  likes: { type: Number, default: 0 },
  isEdited: { type: Boolean, default: false },
  media: { type: [mediaItemSchema], default: [] },
  audioTimestamp: { type: Number, default: null },
  videoTimestamp: { type: Number, default: null },
}, { timestamps: true });
```

**تحلیل:** نظرات پست‌ها به صورت **Embedded** در سند پست ذخیره می‌شوند. هر نظر شامل:
- **`replyTo`** — آیدی نظر والد (برای ریپلای)
- **`quotedText`** — متن نقل‌قول شده
- **`audioTimestamp`** — زمان دقیق در فایل صوتی (اگر نظر به لحظه خاصی اشاره کند)
- **`videoTimestamp`** — زمان دقیق در ویدیو

### Schema اصلی پست

```javascript
const postSchema = new mongoose.Schema({
  author: { type: String, required: true },
  authorAvatarUrl: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  date: { type: String, default: '' },
  isoDate: { type: String, default: () => new Date().toISOString() },
  text: { type: String, default: '' },
  media: { type: [mediaItemSchema], default: [] },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  podcastId: { type: mongoose.Schema.Types.ObjectId, ref: 'Podcast' },
  episodeIndex: Number,
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'PublishedBook' },
  albumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' },
  timestamp: Number,
  comments: [postCommentSchema],
  likes: { type: Number, default: 0 },
  reactions: { type: Map, of: Number },
  isPinned: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  replyToId: Number,
  isEdited: { type: Boolean, default: false },
  sourceText: String,
  isLive: { type: Boolean, default: false },
  liveStatus: { type: String, enum: ['streaming', 'ended'] },
}, { timestamps: true });
```

### تحلیل فیلدها

| فیلد | نوع | توضیح |
|------|------|-------|
| `author` | String | نام نویسنده (Denormalized) |
| `authorAvatarUrl` | String | آواتار نویسنده (Denormalized) |
| `userId` | ObjectId → User | ارجاع به کاربر واقعی |
| `date` | String | تاریخ نمایشی ("همین الان"، "۵ دقیقه پیش") |
| `isoDate` | String | تاریخ دقیق ISO 8601 |
| `text` | String | متن پست |
| `media` | [MediaItem] | آیتم‌های رسانه |
| `videoId` | ObjectId → Video | ارجاع به ویدیو (اگر پست اشتراک ویدیو باشد) |
| `podcastId` | ObjectId → Podcast | ارجاع به پادکست |
| `episodeIndex` | Number | شماره اپیزود |
| `bookId` | ObjectId → PublishedBook | ارجاع به کتاب |
| `albumId` | ObjectId → Album | ارجاع به آلبوم |
| `timestamp` | Number | زمان دقیق در محتوای صوتی/ویدیویی |
| `comments` | [PostComment] | نظرات توکار |
| `likes` | Number | تعداد لایک‌ها |
| `reactions` | Map< String, Number > | واکنش‌های emoji |
| `isPinned` | Boolean | آیا پست سنجاق شده |
| `isFeatured` | Boolean | آیا پست ویژه |
| `isEdited` | Boolean | آیا ویرایش شده |
| `sourceText` | String | متن اصلی قبل از ویرایش |
| `isLive` | Boolean | آیا پخش زنده است |
| `liveStatus` | String | وضعیت زنده: streaming یا ended |

### ایندکس‌ها

```javascript
postSchema.index({ author: 'text', text: 'text' });
postSchema.index({ author: 1 });
postSchema.index({ isoDate: -1 });
postSchema.index({ videoId: 1 });
postSchema.index({ podcastId: 1 });
postSchema.index({ bookId: 1 });
postSchema.index({ userId: 1 });
```

| ایندکس | هدف |
|--------|-----|
| `text(author, text)` | جستجوی متنی در پست‌ها |
| `author: 1` | جستجوی پست‌های یک نویسنده |
| `isoDate: -1` | مرتب‌سازی بر اساس تاریخ (جدیدترین اول) |
| `videoId: 1` | جستجوی پست‌های مرتبط با یک ویدیو |
| `podcastId: 1` | جستجوی پست‌های مرتبط با یک پادکست |
| `bookId: 1` | جستجوی پست‌های مرتبط با یک کتاب |
| `userId: 1` | جستجوی پست‌های یک کاربر |

---

## Comment.js — مدل نظر (۳۸ خط)

**مسیر فایل:** `server/models/Comment.js`  
**تعداد خطوط:** ۳۸

**نکته مهم:** این مدل برای **نظرات مستقل** است (پادکست، ویدیو، کتاب). نظرات پست‌ها به صورت توکار در مدل Post ذخیره می‌شوند.

```javascript
const commentSchema = new mongoose.Schema({
  type: { type: String, enum: ['podcast', 'video', 'book'], required: true },
  author: { type: String, required: true },
  authorAvatarUrl: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  text: { type: String, required: true },
  date: { type: String, default: '' },
  isoDate: { type: String, default: () => new Date().toISOString() },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }],
  isFeatured: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  podcastId: { type: mongoose.Schema.Types.ObjectId, ref: 'Podcast' },
  episodeIndex: Number,
  podcastTitle: String,
  episodeTitle: String,
  timestamp: Number,
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  videoTitle: String,
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'PublishedBook' },
  videoTimestamp: { type: Number, default: null },
  audioTimestamp: { type: Number, default: null },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  quotedText: String,
  media: [{ type: { type: String, enum: ['image', 'video', 'audio'] }, url: { type: String } }],
}, { timestamps: true });
```

### تحلیل ساختار درختی

```javascript
parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }
```

**تحلیل:** نظرات از ساختار درختی (Tree Structure) استفاده می‌کنند. هر نظر می‌تواند یک `parentId` داشته باشد که به نظر والد ارجاع می‌دهد. این اجازه می‌دهد ریپلای‌های سطح چندم پشتیبانی شوند (نه فقط ریپلای مستقیم).

**تفاوت با PostComment:**
- `PostComment` توکار در Post است (Embedded)
- `Comment` یک کالکشن جداگانه است (Referenced)

**دلیل تفکیک:** نظرات پست‌ها معمولاً کم هستند و با پست خوانده می‌شوند. اما نظرات پادکست/ویدیو/کتاب ممکن است هزاران عدد باشند و نیاز به صفحه‌بندی جداگانه دارند.

### ایندکس‌ها

```javascript
commentSchema.index({ author: 'text', text: 'text' });
commentSchema.index({ type: 1, videoId: 1 });
commentSchema.index({ type: 1, podcastId: 1 });
commentSchema.index({ type: 1, bookId: 1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ userId: 1 });
```

| ایندکس | هدف |
|--------|-----|
| `text(author, text)` | جستجوی متنی در نظرات |
| `{ type, videoId }` | نظرات یک ویدیوی خاص |
| `{ type, podcastId }` | نظرات یک پادکست خاص |
| `{ type, bookId }` | نظرات یک کتاب خاص |
| `parentId` | جستجوی ریپلای‌های یک نظر |
| `createdAt: -1` | مرتب‌سازی بر اساس تاریخ |
| `userId` | نظرات یک کاربر خاص |

---

## Podcast.js — مدل پادکست (۳۵ خط)

**مسیر فایل:** `server/models/Podcast.js`  
**تعداد خطوط:** ۳۵

### Schema اپیزود (توکار)

```javascript
const episodeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: String,
  description: { type: String, default: '' },
  duration: { type: String, default: '00:00' },
  audioUrl: { type: String, default: '' },
  date: { type: String, default: '' },
  isNew: { type: Boolean, default: true },
  cover: String,
  relatedFileUrl: String,
  viewCount: { type: Number, default: 0 },
  fullText: { type: String, default: '' },
}, { suppressReservedKeysWarning: true });
```

**تحلیل:** اپیزودها به صورت **Embedded** در سند پادکست ذخیره می‌شوند. این الگو مناسب است چون:
- هر پادکست معمولاً حداکثر چند ده اپیزود دارد
- خواندن یک پادکست با تمام اپیزودهایش فقط یک query می‌خواهد
- اپیزودها به ندرت به صورت جداگانه آپدیت می‌شوند

**نکته `suppressReservedKeysWarning`:** Mongoose هشدار می‌دهد اگر فیلدهایی با نام‌های رزرو شده (مثل `delete`) استفاده شوند. این گزینه هشدار را غیرفعال می‌کند.

### Schema اصلی پادکست

```javascript
const podcastSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  cover: { type: String, default: '' },
  speakerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
  duration: { type: String, default: '0' },
  episodes: [episodeSchema],
  year: { type: Number, default: new Date().getFullYear() },
  categories: [{ type: String }],
  isSquare: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }],
  viewCount: { type: Number, default: 0 },
}, { timestamps: true });
```

| فیلد | نوع | توضیح |
|------|------|-------|
| `title` | String | عنوان پادکست |
| `speakerId` | ObjectId → Author | گوینده (اجباری) |
| `authorId` | ObjectId → Author | نویسنده (اختیاری) |
| `episodes` | [episodeSchema] | اپیزودهای توکار |
| `categories` | [String] | دسته‌بندی‌ها |
| `isSquare` | Boolean | آیا کاور مربعی است |
| `likes` | Number | تعداد لایک‌ها |
| `likedBy` | [String] | لیست لایک‌کنندگان |
| `viewCount` | Number | تعداد بازدیدها |

---

## Book.js — مدل کتاب (۱۸ خط)

**مسیر فایل:** `server/models/Book.js`  
**تعداد خطوط:** ۱۸

```javascript
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
  cover: { type: String, default: '' },
  relatedEpisodes: [{
    podcastId: { type: mongoose.Schema.Types.ObjectId, ref: 'Podcast' },
    episodeIndex: { type: Number, default: 0 },
  }],
  categories: [{ type: String }],
  addedDate: { type: String, default: '' },
  description: { type: String, default: '' },
}, { timestamps: true });
```

**تحلیل:** این مدل برای کتاب‌های **کتابخانه** است (نه کتاب‌های منتشر شده). هر کتاب می‌تواند به اپیزودهای پادکست مرتبط باشد (`relatedEpisodes`).

**تفاوت با PublishedBook:**
- `Book` — کتاب‌هایی که در کتابخانه نمایش داده می‌شوند (مرتبط با پادکست‌ها)
- `PublishedBook` — کتاب‌هایی که توسط نویسندگان منتشر شده‌اند

---

## PublishedBook.js — مدل کتاب منتشر شده (۳۱ خط)

**مسیر فایل:** `server/models/PublishedBook.js`  
**تعداد خطوط:** ۳۱

```javascript
const publishedBookSchema = new mongoose.Schema({
  cover: { type: String, default: '' },
  backCover: String,
  title: { type: String, required: true, index: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  authorName: { type: String, default: 'نشر سرای هنر و اندیشه' },
  pdfUrl: String,
  pdfPages: [{ type: String, default: [] }],
  buyUrl: String,
  isNew: { type: Boolean, default: false },
  price: { type: String, default: '۰' },
  contentHtml: { type: String, default: '' },
  tableOfContents: String,
  type: { type: String, enum: ['book', 'pamphlet', 'note'], default: 'book' },
  date: String,
  relatedAudioIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Podcast' }],
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDraft: { type: Boolean, default: false },
  pendingApproval: { type: Boolean, default: false },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPinned: { type: Boolean, default: false },
}, { timestamps: true, suppressReservedKeysWarning: true });
```

### تحلیل فیلدها

| فیلد | نوع | توضیح |
|------|------|-------|
| `type` | String (enum) | نوع: book (کتاب)، pamphlet (팸فلت)، note (یادداشت) |
| `pdfUrl` | String | لینک فایل PDF |
| `pdfPages` | [String] | تصاویر صفحات PDF |
| `contentHtml` | String | محتوای HTML کتاب |
| `tableOfContents` | String | فهرست مطالب |
| `isDraft` | Boolean | آیا پیش‌نویس است |
| `pendingApproval` | Boolean | آیا در انتظار تأیید ادمین |
| `likes` | [ObjectId → User] | لایک‌کنندگان |
| `relatedAudioIds` | [ObjectId → Podcast] | پادکست‌های مرتبط |

**سیستم یادداشت‌ها:** نویسندگان می‌توانند یادداشت‌هایی با type='note' ایجاد کنند. این یادداشت‌ها می‌توانند draft باشند (isDraft=true) یا در انتظار تأیید ادمین (pendingApproval=true).

---

## Video.js — مدل ویدیو (۲۰ خط)

**مسیر فایل:** `server/models/Video.js`  
**تعداد خطوط:** ۲۰

```javascript
const videoSchema = new mongoose.Schema({
  embedId: { type: String, required: true },
  title: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  thumbnailUrl: { type: String, default: '' },
  viewCount: { type: Number, default: 0 },
  uploadDate: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  categories: [{ type: String }],
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }],
  fullText: { type: String, default: '' },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
}, { timestamps: true });
```

**تحلیل:** `embedId` شناسه ویدیو در پلتفرم خارجی (آپارات/یوتیوب) است. `fullText` متن کامل ویدیو (احتمالاً از سرویس تبدیل گفتار به نوشتار) برای جستجوی متنی استفاده می‌شود.

---

## Author.js — مدل نویسنده (۱۱ خط)

**مسیر فایل:** `server/models/Author.js`  
**تعداد خطوط:** ۱۱

```javascript
const authorSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  role: { type: String, enum: ['master', 'secretary'], default: 'secretary' },
  coverImage: String,
}, { timestamps: true });
```

**تحلیل:** نقش نویسنده دو نوع است:
- **`master`** — استاد (levels بالاتر)
- **`secretary`** — دبیر (levels پایین‌تر)

---

## سایر مدل‌ها

### Notification.js (۲۱ خط)

```javascript
const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  target: { type: String, default: 'all' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  link: { type: String, default: '' },
  type: { type: String, default: 'admin' },
  sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  createdAt: { type: Date, default: Date.now },
});
```

**تحلیل:**
- `target`: `'all'` (همگانی) یا `'admins'` (فقط ادمین‌ها) یا `'user'` (فقط یک کاربر)
- `userId`: اگر null نباشد، نوتیفیکیشن فقط برای آن کاربر است
- `type`: `'admin'`، `'reply'`، `'video'`، `'playlist'`، `'book'`، `'note'`
- `sourceId`: آیدی منبع (پست/نظر) — برای حذف نوتیفیکیشن هنگام حذف منبع

### AnalyticsEvent.js (۱۶ خط)

```javascript
const analyticsEventSchema = new mongoose.Schema({
  event: { type: String, required: true, index: true },
  refType: { type: String, default: '' },
  refId: { type: mongoose.Schema.Types.Mixed, default: null },
  refTitle: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.Mixed, default: null },
  identifier: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
```

**تحلیل:** رویدادهای تحلیلی شامل:
- `event`: `'podcast_play'`، `'video_view'`، `'podcast_like'`، `'video_like'`
- `refId`: آیدی محتوای مرتبط
- `refTitle`: عنوان محتوا (Denormalized برای سرعت)
- `meta`: اطلاعات اضافی (Device, OS و غیره)

### Setting.js (۱۱ خط)

```javascript
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });
```

**تحلیل:** الگوی **Key-Value Store** برای ذخیره تنظیمات. مثال:
- `key: 'community_chat'` → `value: { chatEnabled: true, chatMessage: '...' }`

### PushSubscription.js (۲۰ خط)

```javascript
const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  userAgent: { type: String, default: '' },
  deviceLabel: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
}, { timestamps: true });
```

**تحلیل:** اشتراک‌های Web Push. هر دستگاه کاربر یک سند جداگانه دارد. `endpoint` یکتاست و `keys` برای رمزگذاری نوتیفیکیشن استفاده می‌شود.

### Expense.js (۱۵ خط)

```javascript
const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  note: { type: String, default: '' },
  date: { type: Date, default: Date.now },
}, { timestamps: true });
```

**تحلیل:** هزینه‌های پلتفرم (هزینه سرور، تبلیغات و غیره).

### PurchaseRequest.js (۳۲ خط)

```javascript
const purchaseRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, default: '' },
  userPhone: { type: String, default: '' },
  orderNumber: { type: String, required: true, unique: true },
  items: [{
    title: { type: String, required: true },
    cover: { type: String, default: '' },
    price: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
  }],
  totalPrice: { type: Number, default: 0 },
  cardNumber: { type: String, default: '' },
  transferDate: { type: String, default: '' },
  transferTime: { type: String, default: '' },
  trackingCode: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
  adminNote: { type: String, default: '' },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });
```

**تحلیل:** سیستم خرید کتاب به صورت **کارت به کارت**. کاربر درخواست خرید ثبت کرده و ادمین آن را تأیید یا رد می‌کند.

### SupportMessage.js (۱۳ خط)

```javascript
const supportMessageSchema = new mongoose.Schema({
  name: { type: String, default: 'کاربر' },
  contact: { type: String, default: '' },
  category: { type: String, default: 'other' },
  message: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
```

**تحلیل:** پیام‌های پشتیبانی از کاربران. `category`: `'bug'`، `'suggestion'`، `'question'`، `'other'`.

### VideoPlaylist.js (۱۳ خط)

```javascript
const videoPlaylistSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  cover: { type: String, default: '' },
  videoIds: [{ type: String, ref: 'Video' }],
  order: { type: Number, default: 0 },
  visible: { type: Boolean, default: true },
}, { timestamps: true });
```

**تحلیل:** لیست‌های پخش ویدیو. `slug` برای URL‌های دوستانه استفاده می‌شود. `visible` مشخص می‌کند آیا لیست عمومی است.

### Album.js (۲۵ خط)

```javascript
const albumItemSchema = new mongoose.Schema({
  podcastId: { type: mongoose.Schema.Types.ObjectId, ref: 'Podcast', default: null },
  episodeIndex: { type: Number, default: null },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
  noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'PublishedBook', default: null },
  title: { type: String, default: '' },
  cover: { type: String, default: '' },
  content: { type: String, default: '' },
}, { _id: true });

const albumSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['audio', 'video'], default: 'audio' },
  title: { type: String, required: true, trim: true },
  cover: { type: String, default: '' },
  items: { type: [albumItemSchema], default: [] },
  shared: { type: Boolean, default: false },
}, { timestamps: true });
```

**تحلیل:** آلبوم‌های شخصی کاربران. هر آلبوم می‌تواند شامل اپیزودهای پادکست، ویدیو یا یادداشت باشد. `shared` مشخص می‌کند آیا آلبوم عمومی است.

### AppUpdate.js (۱۶ خط)

```javascript
const appUpdateSchema = new mongoose.Schema({
  apkVersion: { type: String, default: '' },
  apkUrl: { type: String, default: '' },
  apkMessage: { type: String, default: '' },
  desktopVersion: { type: String, default: '' },
  desktopUrl: { type: String, default: '' },
  desktopMessage: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});
```

**تحلیل:** فقط یک سند واحد در کالکشن `appupdates` ذخیره می‌شود. حاوی آخرین نسخه اندروید (APK) و دسکتاپ (Windows).

---

## نحوه اتصال مدل‌ها به types.ts

فایل `types.ts` در ریشه پروژه، اینترفیس‌های TypeScript را تعریف می‌کند. هر مدل MongoDB یک اینترفیس معادل در `types.ts` دارد:

| مدل MongoDB | اینترفیس TypeScript | تفاوت‌ها |
|-------------|---------------------|----------|
| `User` | `User` | `id` و `_id` هر دو وجود دارند |
| `Post` | `Post` | `id` و `_id` هر دو وجود دارند |
| `Comment` | `Comment` | `id` و `_id` هر دو وجود دارند |
| `Podcast` | `Podcast` | `id` به جای `_id` |
| `Book` | `Book` | `id` به جای `_id` |
| `PublishedBook` | `PublishedBook` | `id` به جای `_id` |
| `Video` | `Video` | `id` به جای `_id` |
| `Author` | `Author` | `id` به جای `_id` |
| `PostComment` | `PostComment` | نظرات توکار پست |

**الگوی تبدیل در API Client:**
```javascript
const data = await apiFetch<any[]>('/podcasts');
return data.map((p: any) => ({
  ...p,
  id: p._id || p.id,  // MongoDB _id → id
}));
```

**تحلیل:** وقتی داده از سرور می‌آید، `_id` MongoDB به `id` تبدیل می‌شود تا با اینترفیس‌های TypeScript سازگار باشد.

---

## الگوهای طراحی و روابط

### نمودار روابط بین مدل‌ها

```
User ──────────┬──────────────────┬──────────────────┬─────────────────┐
  │            │                  │                  │                 │
  │ 1:N        │ 1:N              │ 1:N              │ N:1             │ N:N
  ▼            ▼                  ▼                  ▼                 ▼
Post        Comment          PublishedBook    PushSubscription  Notification
  │            │ (comments)      │ (authorId)     │ (userId)        │ (userId)
  │ 1:N        │                  │                │                 │
  ▼            │                  │                │                 │
PostComment    │                  │                │                 │
(embedded)     │                  │                │                 │
               │                  │                │                 │
Podcast ───────┼──────────────────┤                │                 │
  │ 1:N        │                  │                │                 │
  ▼            │                  │                │                 │
Episode        │                  │                │                 │
(embedded)     │                  │                │                 │
               │                  │                │                 │
Video ─────────┘                  │                │                 │
                                   │                │                 │
Author ────────────────────────────┘                │                 │
                                                    │                 │
AnalyticsEvent (Standalone) ──────────────────────────────┘                 │
                                                                     │
Setting (Standalone) ───────────────────────────────────────────────────────┘
```

### الگوهای استفاده شده

| الگو | مدل‌ها | توضیح |
|------|-------|-------|
| **Embedded** | Episode در Podcast | اپیزودها توکار در پادکست |
| **Embedded** | PostComment در Post | نظرات پست توکار |
| **Embedded** | AlbumItem در Album | آیتم‌های آلبوم توکار |
| **Referenced** | User → Post | ارجاع با ObjectId |
| **Referenced** | Author → Podcast | ارجاع با ObjectId |
| **Referenced** | Podcast → Episode | ارجاع توکار + ObjectId |
| **Denormalized** | Post.author | نام نویسنده مستقیماً ذخیره |
| **Denormalized** | AnalyticsEvent.refTitle | عنوان محتوا ذخیره شده |
| **Polymorphic** | Comment.type | یک مدل برای podcast/video/book |
| **Key-Value** | Setting | تنظیمات کلید-مقدار |
| **Tree** | Comment.parentId | ساختار درختی نظرات |

---

**تعداد کل خطوط مدل‌ها:** ~۴۰۰ خط  
**تعداد کل مدل‌ها:** ۱۶ مدل  
**تعداد کل ایندکس‌ها:** ۳۰+ ایندکس
