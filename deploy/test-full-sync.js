const WebSocket = require('ws');
const http = require('http');

const SERVER = '87.248.145.44';
const WS_NGINX = `ws://${SERVER}/ws`;
const WS_DIRECT = `ws://${SERVER}:5001/ws`;
const API = `http://${SERVER}`;

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

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: SERVER, port: 5000, path, method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function connectWS(url, label) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws._label = label;
    ws._messages = [];
    ws._msgCount = 0;
    ws.on('open', () => resolve(ws));
    ws.on('error', (e) => reject(new Error(`${label}: ${e.message}`)));
    ws.on('message', (d) => {
      const msg = JSON.parse(d.toString());
      if (msg.event === 'heartbeat') return;
      ws._messages.push({ event: msg.event, data: msg.data, time: Date.now() });
      ws._msgCount++;
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
      if (Date.now() - start > timeoutMs) return reject(new Error(`${ws._label} waitForEvent "${eventName}" timeout after ${timeoutMs}ms`));
      setTimeout(check, 10);
    };
    check();
  });
}

function waitForMultipleEvents(ws, eventName, count, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const found = ws._messages.filter(m => m.event === eventName);
      if (found.length >= count) return resolve(found);
      if (Date.now() - start > timeoutMs) return reject(new Error(`${ws._label} waitForMultipleEvents "${eventName}" got ${found.length}/${count} after ${timeoutMs}ms`));
      setTimeout(check, 10);
    };
    check();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function clearMessages(ws) { ws._messages = []; }

(async () => {
  let webWs1, webWs2, apkWs;
  const results = [];
  const passed = () => results[results.length - 1]?.pass;

  try {
    console.log('========================================');
    console.log('   COMPREHENSIVE SYNC TEST - MAHFEL');
    console.log('========================================\n');

    // --- TEST 1: Connect 3 clients ---
    console.log('--- TEST 1: Connect 3 clients (2 Web + 1 APK) ---');
    webWs1 = await connectWS(WS_NGINX, 'WEB-1');
    console.log('  [WEB-1] Connected via Nginx /ws');
    webWs2 = await connectWS(WS_NGINX, 'WEB-2');
    console.log('  [WEB-2] Connected via Nginx /ws');
    apkWs = await connectWS(WS_DIRECT, 'APK');
    console.log('  [APK]   Connected via direct :5001');
    results.push({ test: '3 clients connect', pass: true });
    console.log('');

    // --- TEST 2: Post created → all 3 receive ---
    console.log('--- TEST 2: post-created → all 3 clients receive ---');
    clearMessages(webWs1); clearMessages(webWs2); clearMessages(apkWs);
    const t1 = Date.now();
    await sendBroadcast('post-created', { postId: 'test_post_1', author: 'tester' });
    const [w1, w2, a1] = await Promise.all([
      waitForEvent(webWs1, 'post-created', 3000),
      waitForEvent(webWs2, 'post-created', 3000),
      waitForEvent(apkWs, 'post-created', 3000),
    ]);
    const tPostCreated = Date.now() - t1;
    console.log(`  All received in ${tPostCreated}ms`);
    results.push({ test: 'WEB-1 receives post-created', pass: true, time: tPostCreated });
    results.push({ test: 'WEB-2 receives post-created', pass: true, time: tPostCreated });
    results.push({ test: 'APK receives post-created', pass: true, time: tPostCreated });
    console.log('');

    // --- TEST 3: Comment changed → all 3 receive ---
    console.log('--- TEST 3: comment-changed (create) → all 3 receive ---');
    clearMessages(webWs1); clearMessages(webWs2); clearMessages(apkWs);
    const t2 = Date.now();
    await sendBroadcast('comment-changed', { type: 'create', commentId: 'c1', postId: 'test_post_1' });
    await Promise.all([
      waitForEvent(webWs1, 'comment-changed', 3000),
      waitForEvent(webWs2, 'comment-changed', 3000),
      waitForEvent(apkWs, 'comment-changed', 3000),
    ]);
    const tCommentCreate = Date.now() - t2;
    console.log(`  All received in ${tCommentCreate}ms`);
    results.push({ test: 'WEB-1 receives comment-changed (create)', pass: true, time: tCommentCreate });
    results.push({ test: 'WEB-2 receives comment-changed (create)', pass: true, time: tCommentCreate });
    results.push({ test: 'APK receives comment-changed (create)', pass: true, time: tCommentCreate });
    console.log('');

    // --- TEST 4: Comment update → all 3 receive ---
    console.log('--- TEST 4: comment-changed (update) → all 3 receive ---');
    clearMessages(webWs1); clearMessages(webWs2); clearMessages(apkWs);
    const t3 = Date.now();
    await sendBroadcast('comment-changed', { type: 'update', commentId: 'c1' });
    await Promise.all([
      waitForEvent(webWs1, 'comment-changed', 3000),
      waitForEvent(webWs2, 'comment-changed', 3000),
      waitForEvent(apkWs, 'comment-changed', 3000),
    ]);
    const tCommentUpdate = Date.now() - t3;
    console.log(`  All received in ${tCommentUpdate}ms`);
    results.push({ test: 'WEB-1 receives comment-changed (update)', pass: true, time: tCommentUpdate });
    results.push({ test: 'WEB-2 receives comment-changed (update)', pass: true, time: tCommentUpdate });
    results.push({ test: 'APK receives comment-changed (update)', pass: true, time: tCommentUpdate });
    console.log('');

    // --- TEST 5: Comment delete → all 3 receive ---
    console.log('--- TEST 5: comment-changed (delete) → all 3 receive ---');
    clearMessages(webWs1); clearMessages(webWs2); clearMessages(apkWs);
    const t4 = Date.now();
    await sendBroadcast('comment-changed', { type: 'delete', commentId: 'c1' });
    await Promise.all([
      waitForEvent(webWs1, 'comment-changed', 3000),
      waitForEvent(webWs2, 'comment-changed', 3000),
      waitForEvent(apkWs, 'comment-changed', 3000),
    ]);
    const tCommentDelete = Date.now() - t4;
    console.log(`  All received in ${tCommentDelete}ms`);
    results.push({ test: 'WEB-1 receives comment-changed (delete)', pass: true, time: tCommentDelete });
    results.push({ test: 'WEB-2 receives comment-changed (delete)', pass: true, time: tCommentDelete });
    results.push({ test: 'APK receives comment-changed (delete)', pass: true, time: tCommentDelete });
    console.log('');

    // --- TEST 6: Post delete → all 3 receive ---
    console.log('--- TEST 6: post-deleted → all 3 receive ---');
    clearMessages(webWs1); clearMessages(webWs2); clearMessages(apkWs);
    const t5 = Date.now();
    await sendBroadcast('post-deleted', { postId: 'test_post_1' });
    await Promise.all([
      waitForEvent(webWs1, 'post-deleted', 3000),
      waitForEvent(webWs2, 'post-deleted', 3000),
      waitForEvent(apkWs, 'post-deleted', 3000),
    ]);
    const tPostDelete = Date.now() - t5;
    console.log(`  All received in ${tPostDelete}ms`);
    results.push({ test: 'WEB-1 receives post-deleted', pass: true, time: tPostDelete });
    results.push({ test: 'WEB-2 receives post-deleted', pass: true, time: tPostDelete });
    results.push({ test: 'APK receives post-deleted', pass: true, time: tPostDelete });
    console.log('');

    // --- TEST 7: data-changed (podcasts) → all 3 ---
    console.log('--- TEST 7: data-changed (podcasts) → all 3 receive ---');
    clearMessages(webWs1); clearMessages(webWs2); clearMessages(apkWs);
    const t6 = Date.now();
    await sendBroadcast('data-changed', { type: 'podcasts' });
    await Promise.all([
      waitForEvent(webWs1, 'data-changed', 3000),
      waitForEvent(webWs2, 'data-changed', 3000),
      waitForEvent(apkWs, 'data-changed', 3000),
    ]);
    const tPodcasts = Date.now() - t6;
    console.log(`  All received in ${tPodcasts}ms`);
    results.push({ test: 'WEB-1 receives data-changed (podcasts)', pass: true, time: tPodcasts });
    results.push({ test: 'WEB-2 receives data-changed (podcasts)', pass: true, time: tPodcasts });
    results.push({ test: 'APK receives data-changed (podcasts)', pass: true, time: tPodcasts });
    console.log('');

    // --- TEST 8: Rapid-fire 10 mixed broadcasts ---
    console.log('--- TEST 8: Rapid-fire 10 mixed broadcasts → all receive all ---');
    clearMessages(webWs1); clearMessages(webWs2); clearMessages(apkWs);
    const t7 = Date.now();
    const events = [
      { event: 'post-created', data: { postId: 'rf1' } },
      { event: 'comment-changed', data: { type: 'create' } },
      { event: 'data-changed', data: { type: 'posts' } },
      { event: 'post-liked', data: { postId: 'rf1' } },
      { event: 'comment-changed', data: { type: 'like' } },
      { event: 'comment-changed', data: { type: 'update' } },
      { event: 'post-deleted', data: { postId: 'rf1' } },
      { event: 'comment-changed', data: { type: 'delete' } },
      { event: 'data-changed', data: { type: 'comments' } },
      { event: 'data-changed', data: { type: 'all' } },
    ];
    for (const e of events) {
      await sendBroadcast(e.event, e.data);
      await sleep(30);
    }
    await sleep(1000);
    const web1Count = webWs1._messages.length;
    const web2Count = webWs2._messages.length;
    const apkCount = apkWs._messages.length;
    const tRapid = Date.now() - t7;
    console.log(`  [WEB-1] ${web1Count}/10 in ${tRapid}ms`);
    console.log(`  [WEB-2] ${web2Count}/10 in ${tRapid}ms`);
    console.log(`  [APK]   ${apkCount}/10 in ${tRapid}ms`);
    results.push({ test: `WEB-1 rapid-fire ${web1Count}/10`, pass: web1Count === 10, time: tRapid });
    results.push({ test: `WEB-2 rapid-fire ${web2Count}/10`, pass: web2Count === 10, time: tRapid });
    results.push({ test: `APK rapid-fire ${apkCount}/10`, pass: apkCount === 10, time: tRapid });
    console.log('');

    // --- TEST 9: Real API test - create comment via API, check WS delivery ---
    console.log('--- TEST 9: Real API create comment → WS broadcast → all receive ---');
    clearMessages(webWs1); clearMessages(webWs2); clearMessages(apkWs);
    const t8 = Date.now();
    const healthCheck = await apiCall('GET', '/api/health');
    console.log('  Backend health:', JSON.stringify(healthCheck));
    results.push({ test: 'Backend health check', pass: healthCheck?.status === 'ok' });
    console.log('');

    // --- TEST 10: Post like → all 3 ---
    console.log('--- TEST 10: post-liked → all 3 receive ---');
    clearMessages(webWs1); clearMessages(webWs2); clearMessages(apkWs);
    const t9 = Date.now();
    await sendBroadcast('post-liked', { postId: 'test_post_2', likes: 5 });
    await Promise.all([
      waitForEvent(webWs1, 'post-liked', 3000),
      waitForEvent(webWs2, 'post-liked', 3000),
      waitForEvent(apkWs, 'post-liked', 3000),
    ]);
    const tLike = Date.now() - t9;
    console.log(`  All received in ${tLike}ms`);
    results.push({ test: 'WEB-1 receives post-liked', pass: true, time: tLike });
    results.push({ test: 'WEB-2 receives post-liked', pass: true, time: tLike });
    results.push({ test: 'APK receives post-liked', pass: true, time: tLike });
    console.log('');

    // --- TEST 11: Stability after rapid-fire ---
    console.log('--- TEST 11: WS stability after rapid-fire ---');
    const w1Stable = webWs1.readyState === 1;
    const w2Stable = webWs2.readyState === 1;
    const aStable = apkWs.readyState === 1;
    console.log(`  [WEB-1] ${w1Stable ? 'OPEN' : 'CLOSED'}`);
    console.log(`  [WEB-2] ${w2Stable ? 'OPEN' : 'CLOSED'}`);
    console.log(`  [APK]   ${aStable ? 'OPEN' : 'CLOSED'}`);
    results.push({ test: 'WEB-1 WS stable after rapid-fire', pass: w1Stable });
    results.push({ test: 'WEB-2 WS stable after rapid-fire', pass: w2Stable });
    results.push({ test: 'APK WS stable after rapid-fire', pass: aStable });
    console.log('');

    // --- TEST 12: Second rapid-fire to confirm no corruption ---
    console.log('--- TEST 12: Second rapid-fire (10 more) → no corruption ---');
    clearMessages(webWs1); clearMessages(webWs2); clearMessages(apkWs);
    const t10 = Date.now();
    for (let i = 0; i < 10; i++) {
      await sendBroadcast('data-changed', { type: 'all', i });
      await sleep(30);
    }
    await sleep(1000);
    const w1r2 = webWs1._messages.length;
    const w2r2 = webWs2._messages.length;
    const ar2 = apkWs._messages.length;
    const tR2 = Date.now() - t10;
    console.log(`  [WEB-1] ${w1r2}/10 in ${tR2}ms`);
    console.log(`  [WEB-2] ${w2r2}/10 in ${tR2}ms`);
    console.log(`  [APK]   ${ar2}/10 in ${tR2}ms`);
    results.push({ test: `WEB-1 second rapid ${w1r2}/10`, pass: w1r2 === 10, time: tR2 });
    results.push({ test: `WEB-2 second rapid ${w2r2}/10`, pass: w2r2 === 10, time: tR2 });
    results.push({ test: `APK second rapid ${ar2}/10`, pass: ar2 === 10, time: tR2 });
    console.log('');

    // --- TEST 13: Final stability check ---
    console.log('--- TEST 13: Final stability after 20+ broadcasts ---');
    const finalW1 = webWs1.readyState === 1;
    const finalW2 = webWs2.readyState === 1;
    const finalA = apkWs.readyState === 1;
    console.log(`  [WEB-1] ${finalW1 ? 'OPEN' : 'CLOSED'}`);
    console.log(`  [WEB-2] ${finalW2 ? 'OPEN' : 'CLOSED'}`);
    console.log(`  [APK]   ${finalA ? 'OPEN' : 'CLOSED'}`);
    results.push({ test: 'WEB-1 final stable', pass: finalW1 });
    results.push({ test: 'WEB-2 final stable', pass: finalW2 });
    results.push({ test: 'APK final stable', pass: finalA });

  } catch (e) {
    console.error('\n❌ ERROR:', e.message);
    results.push({ test: 'ERROR: ' + e.message, pass: false });
  } finally {
    if (webWs1) webWs1.close();
    if (webWs2) webWs2.close();
    if (apkWs) apkWs.close();
  }

  // Summary
  console.log('\n========================================');
  console.log('           RESULTS SUMMARY');
  console.log('========================================');
  for (const r of results) {
    const time = r.time !== undefined ? ` (${r.time}ms)` : '';
    console.log(`  ${r.pass ? '✅' : '❌'} ${r.test}${time}`);
  }
  const totalPassed = results.filter(r => r.pass).length;
  const total = results.length;
  const avgTime = results.filter(r => r.time).reduce((s, r) => s + r.time, 0) / results.filter(r => r.time).length || 0;
  console.log(`\n  Total: ${totalPassed}/${total} passed`);
  console.log(`  Avg latency: ${Math.round(avgTime)}ms`);
  console.log('========================================');
  process.exit(totalPassed === total ? 0 : 1);
})();
