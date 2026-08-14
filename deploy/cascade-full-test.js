const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });
const API = process.env.FE_API_BASE_URL || 'https://app.soha-sima.ir';
const WS_URL = API.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';

const stamp = Date.now().toString().slice(-6);
const phoneA = '09' + Math.floor(100000000 + Math.random() * 899999999);
const phoneB = '09' + Math.floor(100000000 + Math.random() * 899999999);
const phoneC = '09' + Math.floor(100000000 + Math.random() * 899999999);

const T_A = 'تست-آبشار-' + stamp + '-الف';
const T_B = 'تست-آبشار-' + stamp + '-ب';

async function req(method, url, body, token) {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { }
  return { status: r.status, data };
}

(async () => {
  // ── WS listener ──
  const usersEvents = [];
  const ws = new WebSocket(WS_URL);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(() => rej(new Error('ws timeout')), 15000); });
  ws.onmessage = (m) => {
    try {
      const j = JSON.parse(m.data);
      if (j.event === 'data-changed' && j.data?.type === 'users') usersEvents.push(j.data);
    } catch {}
  };
  console.log('WS connected:', WS_URL);

  // ── A: user عادی، B: کاربر، C: ادمین ──
  const regA = await req('POST', API + '/api/auth/register', { name: T_A, password: 'test12345', phoneNumber: phoneA });
  const tokenA = regA.data?.token;
  console.log('1. register A:', regA.status);

  const regB = await req('POST', API + '/api/auth/register', { name: T_B, password: 'test12345', phoneNumber: phoneB });
  const tokenB = regB.data?.token;
  console.log('2. register B:', regB.status);

  const otpC = await req('POST', API + '/api/auth/verify-otp', { phoneNumber: phoneC, otp: '0000' });
  const tokenC = otpC.data?.token;
  const adminC = await req('POST', API + '/api/auth/complete-profile', { name: 'ادمین-تست-' + stamp, role: 'admin', securityKey: 'admin123' }, tokenC);
  const tokenAdmin = adminC.data?.token || tokenC;
  console.log('3. admin C:', adminC.status);

  // ── B پست می‌سازد، A کامنت، B ریپلای به کامنت A ──
  const p1 = await req('POST', API + '/api/posts', { text: 'پست اصلی تست آبشار ' + stamp, channelId: 'general', type: 'text' }, tokenB);
  const p1Id = p1.data?._id;
  console.log('4. B post P1:', p1.status, p1Id?.slice(-6));

  const c1 = await req('POST', API + '/api/posts/' + p1Id + '/comments', { text: 'کامنت A روی پست B' }, tokenA);
  const cmtA1 = (c1.data?.comments || []).find((c) => c.text === 'کامنت A روی پست B');
  console.log('5. A comment on P1:', c1.status, cmtA1 ? String(cmtA1._id).slice(-6) : 'NOT FOUND');

  const r1 = await req('POST', API + '/api/posts/' + p1Id + '/comments', { text: 'ریپلای B به کامنت A', replyTo: String(cmtA1._id) }, tokenB);
  const repB1 = (r1.data?.comments || []).find((c) => c.text === 'ریپلای B به کامنت A');
  console.log('6. B reply to A comment:', r1.status, repB1 ? String(repB1._id).slice(-6) : 'NOT FOUND');

  // ── A پست خودش ──
  const p2 = await req('POST', API + '/api/posts', { text: 'پست شخصی A ' + stamp, channelId: 'general', type: 'text' }, tokenA);
  const p2Id = p2.data?._id;
  console.log('7. A own post P2:', p2.status, p2Id?.slice(-6));

  // ── کامنت مستقل: A روی پادکست + ریپلای B ──
  const pods = await req('GET', API + '/api/podcasts?limit=1');
  const podId = pods.data?.[0]?._id;
  console.log('8. podcast:', pods.status, podId?.slice(-6));

  const sc1 = await req('POST', API + '/api/comments', { podcastId: podId, type: 'podcast', text: 'کامنت مستقل A ' + stamp }, tokenA);
  const cmtS1 = sc1.data;
  console.log('9. A standalone comment:', sc1.status, cmtS1 ? String(cmtS1._id).slice(-6) : 'NOT FOUND');

  const sr1 = await req('POST', API + '/api/comments', { podcastId: podId, type: 'podcast', text: 'ریپلای مستقل B به A ' + stamp, parentId: String(cmtS1._id) }, tokenB);
  console.log('10. B standalone reply:', sr1.status, sr1.data ? String(sr1.data._id).slice(-6) : 'NOT FOUND');

  // ── C (ادمین) کاربر A را حذف می‌کند ──
  const aid = regA.data?.user?.id;
  const del = await req('DELETE', API + '/api/admin/users/' + aid, null, tokenAdmin);
  console.log('11. admin delete A:', del.status, JSON.stringify(del.data));

  await new Promise(r => setTimeout(r, 1500));

  // ── بررسی‌ها ──
  const posts = await req('GET', API + '/api/posts?limit=40');
  const all = JSON.stringify(posts.data);
  const p1Alive = posts.data.some(p => p._id === p1Id);
  const p2Gone = !posts.data.some(p => p._id === p2Id);
  const p1Post = posts.data.find(p => p._id === p1Id);
  const aCmtGone = p1Post ? !(p1Post.comments || []).some(c => c.text === 'کامنت A روی پست B') : true;
  const bRepGone = p1Post ? !(p1Post.comments || []).some(c => c.text === 'ریپلای B به کامنت A') : true;
  const leftover = all.includes(T_A);

  const cmts = await req('GET', API + '/api/comments?podcastId=' + podId);
  const cj = JSON.stringify(cmts.data);
  const s1Gone = !cj.includes('کامنت مستقل A ' + stamp);
  const s2Gone = !cj.includes('ریپلای مستقل B به A ' + stamp);

  const usersEv = usersEvents.filter(e => String(e.id) === String(aid) || (e.item && String(e.item._id) === String(aid)));
  console.log('12. users WS events for A:', usersEv.map(e => e.action).join(',') || 'NONE');

  console.log('---');
  console.log('P2 (post A) deleted:', p2Gone ? 'OK' : 'FAIL');
  console.log('A comment on P1 deleted:', aCmtGone ? 'OK' : 'FAIL');
  console.log('B reply to A comment deleted:', bRepGone ? 'OK' : 'FAIL');
  console.log('A standalone comment deleted:', s1Gone ? 'OK' : 'FAIL');
  console.log('B standalone reply deleted:', s2Gone ? 'OK' : 'FAIL');
  console.log('A name/other leftovers:', leftover ? 'FAIL' : 'OK');
  console.log('users delete event on WS:', usersEv.some(e => e.action === 'delete') ? 'OK' : 'NONE');
  console.log(p2Gone && aCmtGone && bRepGone && s1Gone && s2Gone && !leftover ? '=== ALL PASS ===' : '=== FAIL ===');
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });