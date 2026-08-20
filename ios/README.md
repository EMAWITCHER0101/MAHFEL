# نسخه iOS اپ محفل

اپ iOS محفل — یک رپر WKWebView دور سایت `https://app.soha-sima.ir` با قابلیت‌های نیتیو:

## قابلیت‌ها (معادل نسخه APK)
- ✅ بارگذاری وب‌اپ محفل در WKWebView
- ✅ نوتیفیکیشن پوش FCM (حتی وقتی اپ بسته است)
- ✅ ارسال توکن FCM به سرور (رویداد `mahfel-fcm-token` در وب)
- ✅ باز کردن لینک با کلیک روی نوتیفیکیشن (رویداد `mahfel-open-notif` در وب)
- ✅ نمایش اعلان بومی هنگام باز بودن اپ (بریج `MahfelIosBridge.showNotification`)
- ✅ پخش صدا در پس‌زمینه (UIBackgroundModes: audio)
- ✅ صفحه آفلاین هنگام قطع اینترنت
- ✅ صفحه‌ی خطای آفلاین خودکار

## ساختار پروژه
```
ios/
├── Mahfel.xcodeproj/          پروژه Xcode
├── Mahfel/
│   ├── AppDelegate.swift      Firebase + FCM + نوتیفیکیشن
│   ├── SceneDelegate.swift    راه‌اندازی ویندو
│   ├── WebViewController.swift  WKWebView + بریج جاوااسکریپت
│   ├── Info.plist
│   ├── Mahfel.entitlements    (aps-environment)
│   ├── GoogleService-Info.plist  ← باید از Firebase دانلود شود
│   ├── Assets.xcassets        آیکون‌ها
│   └── offline.html
└── Podfile                    Firebase/Messaging
```

## بیلد خودکار با GitHub Actions (بدون مک!)

فایل `.github/workflows/build-ios.yml` اضافه شده. با هر push به پوشه `ios/`، روی سرورهای macOS گیتهاب `.ipa` ساخته و آپلود میشود (رایگان در ریپوی عمومی؛ در ریپوی خصوصی دقیقههای macOS ضربدر ۱۰ حساب میشود).

### مراحل استفاده
1. ریپو را به گیتهاب push کنید.
2. تب Actions → «Build iOS» → نتیجه را دانلود کنید (آرتيفکت `Mahfel-iOS` شامل `Mahfel.ipa`).
3. بدون گواهی، خروجی **unsigned** است — قابل نصب روی آیفون نیست، فقط برای تست ساخت.

### امضای واقعی (برای نصب روی آیفون و انتشار)
در Settings → Secrets and variables → Actions این secrets را بسازید (همه base64):
- `IOS_P12_CERT` — گواهی Distribution یا Development (خروجی `base64 Certificates.p12`)
- `IOS_P12_PASSWORD` — رمز P12
- `IOS_PROVISIONING_PROFILE_B64` — پروفایل پروویژنینگ مخصوص Bundle ID (`base64 -i profile.mobileprovision`)
- `IOS_TEAM_ID` — شناسه تیم (Apple Developer)

با وجود این secrets، بیلد خودکار امضا میشود (code signing automatic) و `.ipa` روی آیفون نصب میشود. برای آپلود TestFlight، روش `app-store` را در workflow_dispatch انتخاب کنید + پروفایل App Store.

> گواهیها و پروفایلها را از Apple Developer Account میگیرید (۱٬۱ دقیقه)؛ بدون حساب Apple Developer اصلاً امضا ممکن نیست.

1. **Firebase:** در کنسول Firebase (پروژه `mahfel-a9ec2`) یک اپ iOS با Bundle ID برابر با `PRODUCT_BUNDLE_IDENTIFIER` (پیش‌فرض `com.mahfel.app`) بسازید → فایل `GoogleService-Info.plist` را دانلود کنید و جایگزین `ios/Mahfel/GoogleService-Info.plist` کنید.
2. **CocoaPods:** `sudo gem install cocoapods` سپس `cd ios && pod install`.
3. `open Mahfel.xcworkspace` در Xcode.
4. در Signing & Capabilities، `DEVELOPMENT_TEAM` (تیم Apple Developer خود) را انتخاب کنید.
5. **راه‌اندازی APNs:** در کنسول Firebase → Cloud Messaging → تب Apple، کلید APNs (بخش Apple Developer → Certificates/Keys) را آپلود کنید. بدون این مرحله، FCM روی دستگاه واقعی کار نمی‌کند.
6. اجرا روی دستگاه: `xcodebuild -workspace Mahfel.xcworkspace -scheme Mahfel -configuration Debug -destination 'platform=iOS,name=<iPhone شما>'` (یا مستقیماً از Xcode).

## نکات مهم
- **حساب Apple Developer** (۹۹ دلار/سال) برای نصب روی دستگاه و انتشار الزامی است.
- **توزیع:** روی iOS امکان دانلود APK/به‌روزرسانی مستقیم نیست؛ به‌روزرسانی‌ها باید از طریق **TestFlight** (برای تست) یا **App Store** منتشر شوند. فایل `downloadAndInstallApk` در بریج iOS همیشه `false` برمی‌گرداند.
- **کد OTP:** iOS برخلاف اندروید امکان خواندن پیامک را به اپ نمی‌دهد؛ فیلدهای OTP وب با `autocomplete="one-time-code"` از Autofill سیستم استفاده می‌کنند.
- **نماد اپ:** آیکون‌های فعلی placeholder هستند (پس‌زمینه سبز + حرف «م»)؛ قبل از انتشار، آیکون واقعی را با Xcode جایگزین کنید.
- هنگام باز بودن اپ، اعلان سیستم سرکوب می‌شود (بنر داخل اپ از WebSocket می‌آید) — دقیقاً مثل نسخه اندروید.

## بریج جاوااسکریپت
وب‌اپ این آبجکت را می‌بیند (مثل `AndroidBridge` در اندروید):

```js
window.MahfelIosBridge = {
  isApp: () => true,
  isIos: () => true,
  getAppVersion: () => '1.0.0',
  getFcmToken: () => window.__mahfelFcmToken || '',
  showNotification: (title, body, link) => { /* ارسال به نیتیو */ },
  downloadAndInstallApk: () => false,
  startOtpAutofill: () => false
}
```

نیتیو → وب:
- `window.__mahfelFcmToken = '...'` + رویداد `mahfel-fcm-token`
- رویداد `mahfel-open-notif` با `detail` برابر لینک