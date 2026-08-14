// تست سرتاسری آمار فروش/سود/هزینه‌ها
//   node deploy/test-sales-stats.js <buyerPhone> <adminPhone>
const https = require('https');

const BASE = 'https://app.soha-sima.ir';
const API = BASE + '/api';
const BUYER_PHONE = process.argv[2];
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

    const logB = await req('POST', API + '/auth/login', { phoneNumber: BUYER_PHONE, password: 'test12345' });
    const buyer = logB.data?.token;
    const logA = await req('POST', API + '/auth/login', { phoneNumber: ADMIN_PHONE, password: 'test12345' });
    const admin = logA.data?.token;
    check('tokens', !!buyer && !!admin);

    // دو خرید با مبالغ مشخص
    const buy1 = await req('POST', API + '/purchase-requests', {
      items: [{ title: 'کتاب الف', price: '100000', quantity: 2 }],
      transferDate: '1404/05/24', transferTime: '12:00', trackingCode: 'AAAA1111',
    }, buyer);
    const buy2 = await req('POST', API + '/purchase-requests', {
      items: [{ title: 'کتاب ب', price: '50000', quantity: 1 }, { title: 'کتاب الف', price: '100000', quantity: 1 }],
      transferDate: '1404/05/24', transferTime: '12:01', trackingCode: 'BBBB2222',
    }, buyer);
    check('created 2 requests', buy1.status === 201 && buy2.status === 201);
    const id1 = buy1.data._id, id2 = buy2.data._id;

    // تایید هر دو (مبالغ: خرید۱ = ۲۰۰ هزار، خرید۲ = ۱۵۰ هزار → مجموع ۳۵۰ هزار)
    const c1 = await req('PATCH', API + '/purchase-requests/' + id1, { status: 'confirmed' }, admin);
    const c2 = await req('PATCH', API + '/purchase-requests/' + id2, { status: 'confirmed' }, admin);
    check('both confirmed', c1.status === 200 && c2.status === 200);

    // ثبت دو هزینه: ۸۰ هزار و ۲۰ هزار → مجموع ۱۰۰ هزار
    const e1 = await req('POST', API + '/expenses', { title: 'هزینه چاپ', amount: 80000, note: 'تست' }, admin);
    const e2 = await req('POST', API + '/expenses', { title: 'هزینه ارسال', amount: 20000 }, admin);
    check('expenses created', e1.status === 201 && e2.status === 201);
    const e1id = e1.data._id;

    // آمار
    const s = await req('GET', API + '/purchase-requests/admin/stats?period=all', null, admin);
    check('stats 200', s.status === 200);
    const stats = s.data;
    console.log('  confirmed:', JSON.stringify(stats.totals.confirmed));
    console.log('  expenses:', JSON.stringify(stats.expenses));
    console.log('  netProfit:', stats.netProfit);
    console.log('  topBooks:', JSON.stringify(stats.topBooks));
    console.log('  daily days:', stats.daily.length);
    check('confirmed sum = 350000', stats.totals.confirmed.sum === 350000);
    check('confirmed count = 2', stats.totals.confirmed.count === 2);
    check('expense sum = 100000', stats.expenses.sum === 100000);
    check('netProfit = 250000', stats.netProfit === 250000);
    const bookA = stats.topBooks.find(b => b.title === 'کتاب الف');
    const bookB = stats.topBooks.find(b => b.title === 'کتاب ب');
    check('topBook الف revenue = 300000 qty=3', bookA && bookA.revenue === 300000 && bookA.qty === 3);
    check('topBook ب revenue = 50000 qty=1', bookB && bookB.revenue === 50000 && bookB.qty === 1);
    check('daily has today with 350000', stats.daily.length > 0 && stats.daily[stats.daily.length - 1].value === 350000);

    // غیر ادمین نمی‌تواند آمار ببیند
    const deny = await req('GET', API + '/purchase-requests/admin/stats', null, buyer);
    check('non-admin denied stats', deny.status === 403);

    // لیست هزینه‌ها + حذف
    const elist = await req('GET', API + '/expenses', null, admin);
    check('expense list count=2', elist.status === 200 && elist.data.length === 2);
    const del = await req('DELETE', API + '/expenses/' + e1id, null, admin);
    check('expense deleted', del.status === 200);
    const s2 = await req('GET', API + '/purchase-requests/admin/stats?period=all', null, admin);
    check('expense sum now 20000', s2.data.expenses.sum === 20000);
    check('netProfit now 330000', s2.data.netProfit === 330000);

    console.log('\n=== RESULT: ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILED') + ' ===');
    process.exitCode = fail === 0 ? 0 : 1;
  } catch (e) {
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  }
})();
