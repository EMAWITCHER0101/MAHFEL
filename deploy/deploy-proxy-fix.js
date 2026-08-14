const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');

const HOST = '87.248.145.44';
const PORT = 9011;
const USER = 'root';
const PASS = 'emadch82';

function ssh(cmd, timeout) {
  timeout = timeout || 90000;
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

function uploadFile(lp, rp) {
  return new Promise((resolve, reject) => {
    console.log('>>> Upload ' + lp.split('\\').pop());
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(lp);
        const w = sftp.createWriteStream(rp);
        w.on('close', () => { c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== DEPLOY PROXY FIX ===');

    console.log('1. Upload proxy.js...');
    await uploadFile('E:\\soha\\server\\routes\\proxy.js', '/opt/soha/server/routes/proxy.js');

    console.log('2. Restart backend...');
    console.log(await ssh('systemctl restart soha-backend'));
    await new Promise(r => setTimeout(r, 4000));

    console.log('3. Status:');
    console.log(await ssh('systemctl is-active soha-backend'));

    console.log('4. Proxy test (real audio URL, first episode):');
    console.log(await ssh('URL=$(curl -s http://localhost:5000/api/podcasts | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0][\"episodes\"][0][\"audioUrl\"] if d and d[0][\"episodes\"] else \"\")" 2>/dev/null); ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=\'\'))" "$URL" 2>/dev/null); echo "URL=$URL"; curl -s -o /tmp/proxy-test.bin -w "proxy status: %{http_code} time: %{time_total}s size: %{size_download}\n" --connect-timeout 20 "http://localhost:5000/api/proxy/audio?url=$ENC"; file /tmp/proxy-test.bin', 90000));

    console.log('5. Range request test (like the browser):');
    console.log(await ssh('URL=$(curl -s http://localhost:5000/api/podcasts | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0][\"episodes\"][0][\"audioUrl\"] if d and d[0][\"episodes\"] else \"\")" 2>/dev/null); ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=\'\'))" "$URL" 2>/dev/null); curl -s -o /dev/null -w "range status: %{http_code} size: %{size_download}\n" -H "Range: bytes=0-1023" --connect-timeout 20 "http://localhost:5000/api/proxy/audio?url=$ENC"', 90000));

    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();