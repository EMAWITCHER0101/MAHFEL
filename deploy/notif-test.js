const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });
const API = process.env.FE_API_BASE_URL || 'https://app.soha-sima.ir';
const WS_URL = API.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';

const stamp = Date.now().toString().slice(-6);
const phoneA = '09' + Math.floor(100000000 + Math.random() * 899999999);
const phoneB = '09' + Math.floor(100000000 + Math.random() * 899999999);
const phoneC = '09' + Math.floor(100000000 + Math.random() * 899999999);

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
  const notifEvents = [];
  const ws = new WebSocket(WS_URL);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(() => rej(new Error('ws timeout')), 15000); });
  ws.onmessage = (m) => {
    try {
      const j = JSON.parse(m.data);
      if (j.event === 'data-changed' && j.data?.type === 'notifications' && j.data?.action === 'create') notifEvents.push(j.data.item);
    } catch {}
  };

  const regA = await req('POST', API + '/api/auth/register', { name: 'نویسنده-تست-' + stamp, password: 'test12345', phoneNumber: phoneA });
  const regB = await req('POST', API + '/api/auth/register', { name: 'پاسخگو-تست-' + stamp, password: 'test12345', phoneNumber: phoneB });
  const tokenA = regA.data?.token, tokenB = regB.data?.token;
  const aid = regA.data?.user?.id;
  console.log('1. register A/B:', regA.status, regB.status);

  const p1 = await req('POST', API + '/api/posts', { text: 'پست پایه نوتیفیکیشن ' + stamp, channelId: 'general', type: 'text' }, tokenB);
  const p1Id = p1.data?._id;
  console.log('2. post:', p1.status, p1Id?.slice(-6));

  const c1 = await req('POST', API + '/api/posts/' + p1Id + '/comments', { text: 'نظر پایه ' + stamp }, tokenA);
  const cmtA = (c1.data?.comments || []).find(c => c.text === 'نظر پایه ' + stamp);
  console.log('3. A comment:', c1.status, cmtA ? String(cmtA._id).slice(-6) : 'NOT FOUND');

  const r1 = await req('POST', API + '/api/posts/' + p1Id + '/comments', { text: 'ریپلای به A ' + stamp, replyTo: String(cmtA._id) }, tokenB);
  console.log('4. B reply to A:', r1.status);

  await new Promise(r => setTimeout(r, 1200));
  const nA = await req('GET', API + '/api/notifications', null, tokenA);
  const replyNotif = (nA.data || []).find(n => n.type === 'reply' && String(n.userId) === aid);
  console.log('5. A sees reply notification:', replyNotif ? 'OK ' + replyNotif.title : 'MISSING');

  const nAnon = await req('GET', API + '/api/notifications');
  const replyLeak = JSON.stringify(nAnon.data || []).includes('ریپلای به A');
  console.log('6. anonymous does NOT see it:', replyLeak ? 'FAIL (leak)' : 'OK');

  const otpC = await req('POST', API + '/api/auth/verify-otp', { phoneNumber: phoneC, otp: '0000' });
  const adminC = await req('POST', API + '/api/auth/complete-profile', { name: 'ادمین-نوت-' + stamp, role: 'admin', securityKey: 'admin123' }, otpC.data?.token);
  const tokenAdmin = adminC.data?.token || otpC.data?.token;
  console.log('7. admin token:', adminC.status);

  const m1 = await req('POST', API + '/api/notifications', { title: 'پیام ادمین ' + stamp, body: 'متن پیام ادمین', link: '/mahfel', type: 'admin' }, tokenAdmin);
  console.log('8. admin message:', m1.status);

  const v1 = await req('POST', API + '/api/videos', { title: 'ویدیو تست نوت ' + stamp, embedId: 'test' + stamp, thumbnailUrl: '', duration: 60 }, tokenAdmin);
  console.log('9. new video:', v1.status, v1.data?._id?.slice(-6));

  const pl1 = await req('POST', API + '/api/playlists', { name: 'پلیلیست تست نوت ' + stamp, description: 't', videoIds: [] }, tokenAdmin);
  console.log('10. new playlist:', pl1.status, pl1.data?._id?.slice(-6));

  await new Promise(r => setTimeout(r, 1500));
  const nFinal = await req('GET', API + '/api/notifications', null, tokenA);
  const list = nFinal.data || [];
  const adminHit = list.some(n => n.type === 'admin' && (n.body || '').includes('متن پیام ادمین'));
  const videoHit = list.some(n => n.type === 'video' && (n.title || '').includes('ویدیوی جدید') && (n.body || '').includes('ویدیو تست نوت ' + stamp));
  const plHit = list.some(n => n.type === 'playlist' && (n.body || '').includes('پلیلیست تست نوت ' + stamp));
  const wsVideo = notifEvents.some(n => n.type === 'video');
  const wsPl = notifEvents.some(n => n.type === 'playlist');
  const wsAdmin = notifEvents.some(n => n.type === 'admin' && (n.body || '').includes('متن پیام ادمین'));
  const wsReply = notifEvents.some(n => n.type === 'reply');

  console.log('---');
  console.log('11. admin message in-app:', adminHit ? 'OK' : 'FAIL');
  console.log('12. new video notif:', videoHit ? 'OK' : 'FAIL');
  console.log('13. new playlist notif:', plHit ? 'OK' : 'FAIL');
  console.log('14. WS realtime admin/video/playlist/reply:', (wsAdmin && wsVideo && wsPl && wsReply) ? 'OK' : `FAIL admin=${wsAdmin} video=${wsVideo} pl=${wsPl} reply=${wsReply}`);

  console.log('--- CLEANUP ---');
  if (m1.data?._id) await req('DELETE', API + '/api/notifications/' + m1.data._id, null, tokenAdmin);
  const nts = await req('GET', API + '/api/notifications', null, tokenAdmin);
  for (const n of (nts.data || [])) {
    if (String(n.userId) === aid) await req('DELETE', API + '/api/notifications/' + n._id, null, tokenAdmin);
  }
  if (v1.data?._id) await req('DELETE', API + '/api/videos/' + v1.data._id, null, tokenAdmin);
  if (pl1.data?._id) await req('DELETE', API + '/api/playlists/' + pl1.data._id, null, tokenAdmin);
  await req('DELETE', API + '/api/auth/me', null, tokenA);
  await req('DELETE', API + '/api/auth/me', null, tokenB);
  await req('DELETE', API + '/api/admin/users/' + (adminC.data?.user?.id || ''), null, tokenAdmin);
  console.log('cleanup done');
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });