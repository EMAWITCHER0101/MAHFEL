const CACHE_NAME = 'mahfel-v3-nocache-api';
const STATIC_ASSETS = [
  '/',
  '/logo.png',
  '/favicon.svg',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // API و WebSocket هرگز کش نشوند — همیشه مستقیم از شبکه (کش شدن دیتا = تاخیر آپدیت)
  const reqUrl = event.request.url || '';
  if (reqUrl.includes('/api/') || reqUrl.includes('/ws')) return;

  // صفحه‌ها (نویگیشن): اول شبکه → آپدیت‌ها بلافاصله دیده شوند (فقط آفلاین کش)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetched;
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'محفل', body: 'اعلان جدید' };
  }
  const title = data.title || 'محفل';
  const id = data.id || '';
  const options = {
    body: data.body || '',
    icon: data.icon || '/logo.png',
    badge: '/logo.png',
    data: { url: data.url || '/', id },
    vibrate: [100, 50, 100],
  };
  if (id) options.tag = id;
  event.waitUntil((async () => {
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const visible = clients.some((c) => c.visibilityState === 'visible');
      for (const client of clients) {
        client.postMessage({ type: 'mahfel-refresh' });
      }
      // اگر اپ باز و در فوکوس است → بنر داخل اپ نشان داده می‌شود (یک‌بار، نه دوبار)
      if (visible) return;
    } catch { /* ignore */ }
    return self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && url.includes(new URL(client.url).origin)) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
