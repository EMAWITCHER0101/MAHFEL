// تست: چت باز/بسته، پروفایل کاربر، نوتیفیکیشن پیام محفل، آمار books/buyers
//   node deploy/test-community.js <userPhone> <adminPhone>
const https = require('https');

const BASE = 'https://app.soha-sima.ir';
const API = BASE + '/api';
const USER_PHONE = process.argv[2];
const ADMIN_PHONE = process.argv[3];

function req(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? JSON.stringify(body) : null;
    const r = https.request(u, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: 20000,
    }, res => {
      let o = '';
      res.on('data', d => o += d);
      res.on('end', () => {
        let j = null;
        try { j = JSON.parse(o); } catch {}
        resolve({ status: res.statusCode, data: j });
      });
    });
    r.on('error', reject);
    r.on('timeout', () => { r.destroy(); reject(new Error('TIMEOUT')); });
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  try {
    let fail = 0;
    const check = (label, cond, extra = '') => { console.log((cond ? 'PASS' : 'FAIL') + ' | ' + label + (extra ? ' — ' + extra : '')); if (!cond) fail++; };

    const logU = await req('POST', API + '/auth/login', { phoneNumber: USER_PHONE, password: 'test12345' });
    const user = logU.data?.token;
    const logA = await req('POST', API + '/auth/login', { phoneNumber: ADMIN_PHONE, password: 'test12345' });
    const admin = logA.data?.token;
    check('tokens', !!user && !!admin);
    const userId = logU.data?.user?._id || logU.data?.user?.id;

    // 1) تنظیمات عمومی چت
    const st = await req('GET', API + '/community/settings');
    check('settings public 200', st.status === 200 && typeof st.data.chatEnabled === 'boolean');

    // 2) بستن چت توسط ادمین
    const close = await req('PUT', API + '/community/settings', { chatEnabled: false, chatMessage: 'کمی صبر کنید' }, admin);
    check('admin closed chat', close.status === 200 && close.data.chatEnabled === false);
    const st2 = await req('GET', API + '/community/settings');
    check('public sees closed', st2.data.chatEnabled === false && st2.data.chatMessage === 'کمی صبر کنید');

    // 3) کاربر نمیتواند پست بفرستد (403 با chatClosed)
    const post1 = await req('POST', API + '/posts', { text: 'پیام تست در حالت بسته' }, user);
    check('user post blocked 403', post1.status === 403 && post1.data?.chatClosed === true);

    // 4) کاربر نمیتواند کامنت بفرستد
    const c1 = await req('POST', API + '/posts', { text: 'پست پایه برای کامنت' }, admin);
    const postId = c1.data?._id || c1.data?.id;
    const com1 = await req('POST', API + '/posts/' + postId + '/comments', { text: 'کامنت تست' }, user);
    check('user comment blocked 403', com1.status === 403 && com1.data?.chatClosed === true);

    // 5) ادمین میتواند هنگام بسته بودن پست بفرستد
    const post2 = await req('POST', API + '/posts', { text: 'پیام ادمین در حالت بسته' }, admin);
    check('admin can post while closed', post2.status === 201 || post2.status === 200);

    // 6) پروفایل عمومی کاربر
    const prof = await req('GET', API + '/users/' + userId);
    check('profile public 200', prof.status === 200);
    check('profile fields', !!prof.data?.name && typeof prof.data?.postCount === 'number' && typeof prof.data?.commentCount === 'number');
    console.log('  profile:', JSON.stringify({ name: prof.data?.name, role: prof.data?.role, posts: prof.data?.postCount, comments: prof.data?.commentCount }));

    // 7) باز کردن چت
    const open = await req('PUT', API + '/community/settings', { chatEnabled: true }, admin);
    check('admin reopened chat', open.status === 200 && open.data.chatEnabled === true);

    // 8) کاربر دوباره میتواند پست بفرستد
    const post3 = await req('POST', API + '/posts', { text: 'پیام کاربر بعد از باز شدن' }, user);
    check('user post ok after reopen', post3.status === 201 || post3.status === 200);

    // 9) نوتیفیکیشن ادمین برای پیام کاربر
    const notif = await req('GET', API + '/notifications', null, admin);
    check('notifications list 200', notif.status === 200);
    const items = notif.data?.notifications || notif.data || [];
    const userName = logU.data?.user?.name || '';
    const found = items.find(n => n.type === 'admin' && String(n.body || n.text || '').includes(userName));
    check('admin got community-message notification', !!found);
    if (found) console.log('  notification:', JSON.stringify({ type: found.type, title: found.title, text: (found.body || found.text || '').slice(0, 60) }));

    // 10) آمار: books دارای خریدار
    const buy1 = await req('POST', API + '/purchase-requests', {
      items: [{ title: 'کتاب تست محفل', price: '75000', quantity: 2 }],
      transferDate: '1404/05/24', transferTime: '12:00', trackingCode: 'TESTCOMM1',
    }, user);
    check('purchase created', buy1.status === 201);
    const conf = await req('PATCH', API + '/purchase-requests/' + buy1.data._id, { status: 'confirmed' }, admin);
    check('purchase confirmed', conf.status === 200);
    const s = await req('GET', API + '/purchase-requests/admin/stats?period=all', null, admin);
    check('stats 200', s.status === 200);
    const books = s.data?.books || [];
    const withBuyers = books.find(b => (b.buyers || []).length > 0);
    check('books have buyers', !!withBuyers);
    if (withBuyers) console.log('  buyers sample:', JSON.stringify({ title: withBuyers.title, orders: withBuyers.orders, qty: withBuyers.qty, revenue: withBuyers.revenue, buyers: withBuyers.buyers.slice(0, 2) }));
    if (withBuyers) {
      const buyer = withBuyers.buyers[0];
      check('buyer has name/phone/qty', !!(buyer.name && buyer.phone && buyer.qty >= 1));
    }

    // 11) تنظیمات چت بدون توکن قابل تغییر نیست
    const unauth = await req('PUT', API + '/community/settings', { chatEnabled: false });
    check('unauth cannot change settings', unauth.status === 401 || unauth.status === 403);

    console.log('\n=== RESULT: ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILED') + ' ===');
    process.exitCode = fail === 0 ? 0 : 1;
  } catch (e) {
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  }
})();