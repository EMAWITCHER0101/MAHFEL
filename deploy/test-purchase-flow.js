// تست سرتاسری فلو خرید کتاب مجازی (کارت به کارت → درخواست → تایید ادمین)
//   node deploy/test-purchase-flow.js <buyerPhone> <adminPhone>
const https = require('https');
const http = require('http');

const BASE = 'https://app.soha-sima.ir';
const API = BASE + '/api';

const BUYER_PHONE = process.argv[2];
const ADMIN_PHONE = process.argv[3];

function req(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const r = mod.request(u, {
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
        resolve({ status: res.statusCode, data: j, raw: o });
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
    const stamp = Date.now().toString().slice(-6);
    let fail = 0;
    const check = (label, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' | ' + label); if (!cond) fail++; };

    console.log('--- 1. login buyer ---');
    const log = await req('POST', API + '/auth/login', { phoneNumber: BUYER_PHONE, password: 'test12345' });
    console.log('login:', log.status);
    const token = log.data?.token;
    check('buyer token', !!token);

    console.log('--- 2. create purchase request ---');
    const buy = await req('POST', API + '/purchase-requests', {
      items: [{ id: 't1', title: 'کتاب تست فروش مجازی', quantity: 1, price: 120000 }],
      transferDate: '1404/05/24',
      transferTime: '12:35',
      trackingCode: 'ABC1234567',
    }, token);
    console.log('create:', buy.status, JSON.stringify(buy.data).slice(0, 200));
    const orderNumber = buy.data?.orderNumber;
    const reqId = buy.data?._id;
    check('created (orderNumber=' + orderNumber + ')', buy.status === 201 && !!orderNumber);

    console.log('--- 3. validation: bad tracking code ---');
    const bad = await req('POST', API + '/purchase-requests', {
      items: [{ id: 't1', title: 'x', quantity: 1, price: 1000 }],
      transferDate: '1404/05/24',
      transferTime: '12:35',
      trackingCode: '123',
    }, token);
    console.log('bad:', bad.status, JSON.stringify(bad.data));
    check('rejected short tracking code', bad.status === 400);

    console.log('--- 4. user list own requests ---');
    const mine = await req('GET', API + '/purchase-requests', null, token);
    console.log('mine:', mine.status, 'count=' + (mine.data?.length ?? '?'));
    check('user sees own request', mine.status === 200 && (mine.data || []).some(x => x._id === reqId));

    console.log('--- 5. non-admin cannot access admin list ---');
    const unauth = await req('GET', API + '/purchase-requests/admin', null, token);
    console.log('user->admin list:', unauth.status);
    check('403 for non-admin', unauth.status === 403);

    console.log('--- 6. login admin + confirm ---');
    const logA = await req('POST', API + '/auth/login', { phoneNumber: ADMIN_PHONE, password: 'test12345' });
    console.log('admin login:', logA.status);
    const adminToken = logA.data?.token;
    check('admin token', !!adminToken);

    const adminList = await req('GET', API + '/purchase-requests/admin', null, adminToken);
    console.log('admin list:', adminList.status, 'count=' + (adminList.data?.length ?? '?'));
    const found = (adminList.data || []).find(x => x._id === reqId);
    check('request visible to admin', !!found && found.status === 'pending');

    const confirm = await req('PATCH', API + '/purchase-requests/' + reqId, { status: 'confirmed' }, adminToken);
    console.log('confirm:', confirm.status, JSON.stringify(confirm.data).slice(0, 160));
    check('confirmed', confirm.status === 200 && confirm.data?.status === 'confirmed');

    console.log('--- 7. user sees confirmed ---');
    const mine2 = await req('GET', API + '/purchase-requests', null, token);
    const myReq = (mine2.data || []).find(x => x._id === reqId);
    console.log('user final status:', myReq?.status);
    check('user sees confirmed', myReq?.status === 'confirmed');

    console.log('--- 8. filter by status ---');
    const pendList = await req('GET', API + '/purchase-requests/admin?status=pending', null, adminToken);
    check('pending filter works', pendList.status === 200 && (pendList.data || []).every(x => x.status === 'pending'));

    console.log('\n=== RESULT: ' + (fail === 0 ? 'ALL PASS' : fail + ' FAILED') + ' (orderNumber: ' + orderNumber + ') ===');
    process.exitCode = fail === 0 ? 0 : 1;
  } catch (e) {
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  }
})();
