const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const HOST = '87.248.145.44';
const PORT = 9011;
const USER = 'root';
const PASS = 'emadch82';

function ssh(cmd, timeout) {
  timeout = timeout || 120000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

(async () => {
  try {
    const script = `
const enc = process.argv[2];
console.log('URL param len:', enc.length);
fetch('http://localhost:5000/api/proxy/audio?url=' + enc)
  .then(async r => {
    console.log('status:', r.status, 'ct:', r.headers.get('content-type'), 'len:', r.headers.get('content-length'), 'cr:', r.headers.get('content-range'));
    const b = await r.arrayBuffer();
    console.log('bytes:', b.byteLength);
  })
  .catch(e => console.log('FAIL:', e.message));
`;
    console.log('1. write test script on server:');
    console.log(await ssh('cat > /tmp/pxtest.mjs << \'EOS\'\n' + script + 'EOS\necho written'));

    console.log('2. extract URLs:');
    console.log(await ssh('cd /opt/soha/server && node -e "fetch(\'http://localhost:5000/api/podcasts\').then(r=>r.json()).then(d=>{const a=d.map(p=>p.episodes[0]&&p.episodes[0].audioUrl).filter(Boolean);require(\'fs\').writeFileSync(\'/tmp/audio-urls.json\',JSON.stringify(a));console.log(\'count:\',a.length)})"', 30000));

    console.log('3. Full proxy test (no range):');
    console.log(await ssh('ENC=$(node -e "const a=require(\'/tmp/audio-urls.json\');console.log(encodeURIComponent(a[0]))"); echo "enc len: ${#ENC}"; node /tmp/pxtest.mjs "$ENC"', 120000));

    console.log('4. Range test (browser-style):');
    console.log(await ssh('ENC=$(node -e "const a=require(\'/tmp/audio-urls.json\');console.log(encodeURIComponent(a[0]))"); HEAD=$(node -e "console.log(encodeURIComponent(\'Range: bytes=0-1023\'))"); node -e "const enc=process.argv[1];fetch(\'http://localhost:5000/api/proxy/audio?url=\'+enc,{headers:{Range:\'bytes=0-1023\'}}).then(async r=>{console.log(\'r.status:\',r.status,\'ct:\',r.headers.get(\'content-type\'),\'cr:\',r.headers.get(\'content-range\'));const b=await r.arrayBuffer();console.log(\'bytes:\',b.byteLength)}).catch(e=>console.log(\'FAIL:\',e.message))" "$ENC"', 120000));

    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();