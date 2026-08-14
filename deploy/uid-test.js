const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });
const API = process.env.FE_API_BASE_URL || 'https://app.soha-sima.ir';
const phone = '09' + Math.floor(100000000 + Math.random() * 899999999);

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
    const reg = await req('POST', API + '/api/auth/register', { username: 'uidtest' + Date.now(), password: 'test12345', phoneNumber: phone, name: 'آیدی تست' });
    const token = reg.data.token;
    console.log('register:', reg.status, '| token:', !!token);
    const me = await req('GET', API + '/api/auth/me', null, token);
    console.log('me:', me.status, '| user id:', me.data?.user?.id);

    const post = await req('POST', API + '/api/posts', { text: 'تست آیدی یوزر', channelId: 'general', type: 'text' }, token);
    console.log('create post:', post.status, '| _id:', String(post.data?._id || '').slice(-6), '| userId in RESPONSE:', post.data?.userId ? String(post.data.userId).slice(-6) : 'NULL', '| author:', post.data?.author);
})();