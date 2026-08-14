const WebSocket = require('ws');
const http = require('http');

const SERVER = '87.248.145.44';
const WS_NGINX = `ws://${SERVER}/ws`;
const WS_DIRECT = `ws://${SERVER}:5001/ws`;

function sendBroadcast(event, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ event, data });
    const req = http.request({
      hostname: SERVER, port: 5001, path: '/broadcast', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 5000,
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function connectWS(url, label) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws._label = label;
    ws._messages = [];
    ws.on('open', () => resolve(ws));
    ws.on('error', (e) => reject(new Error(`${label}: ${e.message}`)));
    ws.on('message', (d) => {
      const msg = JSON.parse(d.toString());
      if (msg.event === 'heartbeat') return;
      ws._messages.push({ event: msg.event, data: msg.data, time: Date.now() });
    });
    setTimeout(() => reject(new Error(`${label}: connect timeout`)), 8000);
  });
}

function waitForEvent(ws, eventName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const found = ws._messages.find(m => m.event === eventName);
      if (found) return resolve(found);
      if (Date.now() - start > timeoutMs) return reject(new Error(`${ws._label} waitForEvent "${eventName}" timeout`));
      setTimeout(check, 20);
    };
    const existing = ws._messages.find(m => m.event === eventName);
    if (existing) return resolve(existing);
    check();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  let webWs, apkWs;
  const results = [];

  try {
    console.log('=== BIDIRECTIONAL SYNC TEST ===\n');

    // Step 1: Connect both clients
    console.log('--- Step 1: Connect both clients ---');
    webWs = await connectWS(WS_NGINX, 'WEB');
    console.log('  [WEB]  Connected via Nginx /ws');
    apkWs = await connectWS(WS_DIRECT, 'APK');
    console.log('  [APK]  Connected via direct :5001');
    results.push({ test: 'Both clients connect', pass: true });
    console.log('');

    // Step 2: Backend broadcasts "post-created" → both should receive instantly
    console.log('--- Step 2: Broadcast post-created → both receive ---');
    webWs._messages = [];
    apkWs._messages = [];
    const t1 = Date.now();
    await sendBroadcast('post-created', { postId: 'test123', author: 'tester', text: 'sync test post' });
    console.log('  Broadcast sent');

    const webEvt = await waitForEvent(webWs, 'post-created', 3000);
    const webTime = Date.now() - t1;
    console.log('  [WEB]  Received in ' + webTime + 'ms');
    results.push({ test: 'WEB receives post-created', pass: webEvt.event === 'post-created', time: webTime });

    const apkEvt = await waitForEvent(apkWs, 'post-created', 3000);
    const apkTime = Date.now() - t1;
    console.log('  [APK]  Received in ' + apkTime + 'ms');
    results.push({ test: 'APK receives post-created', pass: apkEvt.event === 'post-created', time: apkTime });
    console.log('');

    // Step 3: Broadcast "comment-changed" → both receive
    console.log('--- Step 3: Broadcast comment-changed → both receive ---');
    webWs._messages = [];
    apkWs._messages = [];
    const t2 = Date.now();
    await sendBroadcast('comment-changed', { commentId: 'c123', postId: 'p123' });

    const webComment = await waitForEvent(webWs, 'comment-changed', 3000);
    const webCommentTime = Date.now() - t2;
    console.log('  [WEB]  Received in ' + webCommentTime + 'ms');
    results.push({ test: 'WEB receives comment-changed', pass: webComment.event === 'comment-changed', time: webCommentTime });

    const apkComment = await waitForEvent(apkWs, 'comment-changed', 3000);
    const apkCommentTime = Date.now() - t2;
    console.log('  [APK]  Received in ' + apkCommentTime + 'ms');
    results.push({ test: 'APK receives comment-changed', pass: apkComment.event === 'comment-changed', time: apkCommentTime });
    console.log('');

    // Step 4: Broadcast "post-deleted" → both receive
    console.log('--- Step 4: Broadcast post-deleted → both receive ---');
    webWs._messages = [];
    apkWs._messages = [];
    const t3 = Date.now();
    await sendBroadcast('post-deleted', { postId: 'test123' });

    const webDel = await waitForEvent(webWs, 'post-deleted', 3000);
    const webDelTime = Date.now() - t3;
    console.log('  [WEB]  Received in ' + webDelTime + 'ms');
    results.push({ test: 'WEB receives post-deleted', pass: webDel.event === 'post-deleted', time: webDelTime });

    const apkDel = await waitForEvent(apkWs, 'post-deleted', 3000);
    const apkDelTime = Date.now() - t3;
    console.log('  [APK]  Received in ' + apkDelTime + 'ms');
    results.push({ test: 'APK receives post-deleted', pass: apkDel.event === 'post-deleted', time: apkDelTime });
    console.log('');

    // Step 5: Broadcast "data-changed" → both receive
    console.log('--- Step 5: Broadcast data-changed (full refresh) → both receive ---');
    webWs._messages = [];
    apkWs._messages = [];
    const t4 = Date.now();
    await sendBroadcast('data-changed', { type: 'all' });

    const webData = await waitForEvent(webWs, 'data-changed', 3000);
    const webDataTime = Date.now() - t4;
    console.log('  [WEB]  Received in ' + webDataTime + 'ms');
    results.push({ test: 'WEB receives data-changed', pass: webData.event === 'data-changed', time: webDataTime });

    const apkData = await waitForEvent(apkWs, 'data-changed', 3000);
    const apkDataTime = Date.now() - t4;
    console.log('  [APK]  Received in ' + apkDataTime + 'ms');
    results.push({ test: 'APK receives data-changed', pass: apkData.event === 'data-changed', time: apkDataTime });
    console.log('');

    // Step 6: Simulate rapid-fire updates
    console.log('--- Step 6: Rapid-fire 5 broadcasts → both receive all ---');
    webWs._messages = [];
    apkWs._messages = [];
    const t5 = Date.now();
    for (let i = 0; i < 5; i++) {
      await sendBroadcast('data-changed', { type: 'posts', i });
      await sleep(50);
    }
    await sleep(500);
    const webRapid = webWs._messages.filter(m => m.event === 'data-changed');
    const apkRapid = apkWs._messages.filter(m => m.event === 'data-changed');
    const rapidTime = Date.now() - t5;
    console.log('  [WEB]  Received: ' + webRapid.length + '/5 in ' + rapidTime + 'ms');
    console.log('  [APK]  Received: ' + apkRapid.length + '/5 in ' + rapidTime + 'ms');
    results.push({ test: 'WEB rapid-fire 5/5', pass: webRapid.length === 5, time: rapidTime });
    results.push({ test: 'APK rapid-fire 5/5', pass: apkRapid.length === 5, time: rapidTime });
    console.log('');

    // Step 7: WS stability
    console.log('--- Step 7: WS connection stability ---');
    console.log('  [WEB] ReadyState:', webWs.readyState === 1 ? 'OPEN' : 'CLOSED');
    console.log('  [APK] ReadyState:', apkWs.readyState === 1 ? 'OPEN' : 'CLOSED');
    results.push({ test: 'WEB WS stable', pass: webWs.readyState === 1 });
    results.push({ test: 'APK WS stable', pass: apkWs.readyState === 1 });

  } catch (e) {
    console.error('\nERROR:', e.message);
    results.push({ test: 'ERROR: ' + e.message, pass: false });
  } finally {
    if (webWs) webWs.close();
    if (apkWs) apkWs.close();
  }

  // Summary
  console.log('\n=== RESULTS ===');
  for (const r of results) {
    const time = r.time ? ` (${r.time}ms)` : '';
    console.log(`  ${r.pass ? '✅' : '❌'} ${r.test}${time}`);
  }
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  console.log(`\n  ${passed}/${total} passed`);
  process.exit(passed === total ? 0 : 1);
})();
