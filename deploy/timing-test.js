const WebSocket = require('ws');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const API = process.env.FE_API_BASE_URL || process.env.API_BASE_URL || 'https://app.soha-sima.ir';
const WS_URL = API.replace(/^http/, 'ws') + '/ws';
const phone = '09' + Math.floor(100000000 + Math.random() * 899999999);

async function req(method, url, body, token) {
    const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, data: await r.json() };
}

(async () => {
    const reg = await req('POST', API + '/api/auth/register', { username: 'timing' + Date.now(), password: 'test12345', phoneNumber: phone, name: 'تست زمان' });
    const token = reg.data.token;
    if (!token) { console.log('REG FAIL', JSON.stringify(reg.data).slice(0, 200)); return; }
    console.log('registered, token ok');

    for (let i = 0; i < 4; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const ws = new WebSocket(WS_URL, { headers: { Authorization: 'Bearer ' + token } });
        const got = await new Promise(resolve => {
            const timer = setTimeout(() => resolve(null), 15000);
            ws.on('message', d => {
                try { const m = JSON.parse(d); if (m.event === 'data-changed') { clearTimeout(timer); resolve(m); } } catch (e) {}
            });
            ws.on('open', async () => {
                const t0 = Date.now();
                const p = await req('POST', API + '/api/posts', { content: 'TIMING TEST ' + i, channelId: 'general', type: 'text' }, token);
                console.log(`[${i}] POST /api/posts -> ${p.status} in ${Date.now() - t0}ms`);
            });
        });
        if (got) {
            console.log('[' + i + '] FULL WS MSG:', JSON.stringify(got).slice(0, 900));
        } else {
            console.log(`[${i}] TIMEOUT: no WS message within 15s`);
        }
        ws.close();
    }
    await req('DELETE', API + '/api/users/me', null, token).catch(() => {});
    console.log('done');
})();

