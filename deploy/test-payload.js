const https = require('https');
const WebSocket = require('E:\\soha\\node_modules\\ws');

const BASE = 'https://app.soha-sima.ir';
const WS_URL = 'wss://app.soha-sima.ir/ws';

const request = (method, path, body, token) => new Promise((res, rej) => {
  const data = body ? JSON.stringify(body) : null;
  const r = https.request(BASE + path, {
    method, headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
    },
  }, (resp) => {
    let out = '';
    resp.on('data', d => out += d);
    resp.on('end', () => {
      try { res({ status: resp.statusCode, body: JSON.parse(out) }); }
      catch { res({ status: resp.statusCode, body: out }); }
    });
  });
  r.on('error', rej);
  if (data) r.write(data);
  r.end();
});

(async () => {
  const uname = 'rt_test_' + Date.now().toString(36);
  const reg = await request('POST', '/api/auth/register', { name: uname, username: uname, phoneNumber: '09' + String(Math.floor(100000000 + Math.random() * 899999999)), password: 'Pass1234!' });
  if (reg.status !== 201 && !reg.body?.token) { console.log('register FAILED', reg.status, JSON.stringify(reg.body).slice(0, 200)); process.exit(1); }
  const token = reg.body.token;
  console.log('registered:', uname, 'status', reg.status);

  const ws = new WebSocket(WS_URL);
  const messages = [];
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  console.log('WS connected');
  ws.on('message', d => {
    const m = JSON.parse(d.toString());
    if (m.event === 'data-changed') messages.push(m.data);
  });
  await new Promise(r => setTimeout(r, 500));

  const text = 'payload-e2e-' + Date.now();
  const create = await request('POST', '/api/posts', { text }, token);
  console.log('post create status:', create.status);
  if (create.status !== 201) { console.log('create failed:', JSON.stringify(create.body).slice(0, 300)); process.exit(1); }
  const postId = String(create.body._id || create.body.id);

  await new Promise(r => setTimeout(r, 1500));
  const ev = messages.find(m => m.type === 'posts');
  console.log('--- broadcast received:', ev ? JSON.stringify(ev) : 'NONE');
  const ok = ev && ev.action === 'create' && ev.item && String(ev.item._id || ev.item.id) === postId && ev.item.text === text;

  const del = await request('DELETE', `/api/posts/${postId}`, null, token);
  console.log('post delete status:', del.status);
  await new Promise(r => setTimeout(r, 800));
  const delEv = messages.find(m => m.type === 'posts' && m.action === 'delete');
  console.log('--- delete broadcast:', delEv ? JSON.stringify(delEv) : 'NONE');
  const delOk = delEv && String(delEv.id) === postId;

  ws.close();
  try { await request('DELETE', '/api/users/me', null, token); } catch {}
  console.log(ok && delOk ? 'RESULT: ALL PASS' : 'RESULT: FAIL');
  process.exit(ok && delOk ? 0 : 1);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });