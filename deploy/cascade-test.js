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
    const reg = await req('POST', API + '/api/auth/register', { username: 'cascade' + Date.now(), password: 'test12345', phoneNumber: phone, name: 'آبشار تست' });
    const token = reg.data.token;
    console.log('1. register:', reg.status);

    const post = await req('POST', API + '/api/posts', { content: 'پیام تست آبشار حذف', channelId: 'general', type: 'text' }, token);
    const postId = post.data._id;
    console.log('2. created post:', post.status, postId.slice(-6));

    const targets = await req('GET', API + '/api/posts?limit=1');
    const targetPostId = targets.data[0]._id;
    const cmt = await req('POST', API + '/api/posts/' + targetPostId + '/comments', { text: 'کامنت تست آبشار' }, token);
    console.log('3. comment on existing post:', cmt.status);

    const del = await req('DELETE', API + '/api/auth/me', null, token);
    console.log('4. delete self:', del.status, JSON.stringify(del.data));

    const check = await req('GET', API + '/api/posts?limit=40');
    const stillThere = check.data.some(p => p._id === postId);
    const cmtStill = JSON.stringify(check.data).includes('کامنت تست آبشار');
    console.log('5. my post still exists?', stillThere ? 'YES (BAD)' : 'NO (GOOD)');
    console.log('6. my comment still exists?', cmtStill ? 'YES (BAD)' : 'NO (GOOD)');
    console.log(stillThere || cmtStill ? 'RESULT: FAIL' : 'RESULT: ALL PASS');
})();