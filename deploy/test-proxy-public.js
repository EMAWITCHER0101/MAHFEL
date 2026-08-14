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
    console.log('=== Public HTTPS proxy test (user path) ===');
    console.log(await ssh('ENC=$(node -e "const a=require(\'/tmp/audio-urls.json\');console.log(encodeURIComponent(a[1]))"); curl -s -o /dev/null -w "https public proxy: %{http_code} size: %{size_download}\n" -H "Range: bytes=0-2047" --connect-timeout 20 "https://soha-sima.ir/api/proxy/audio?url=$ENC"', 60000));
    console.log(await ssh('ENC=$(node -e "const a=require(\'/tmp/audio-urls.json\');console.log(encodeURIComponent(a[1]))"); curl -s -o /dev/null -w "http public proxy: %{http_code} size: %{size_download}\n" -H "Range: bytes=0-2047" --connect-timeout 20 "http://soha-sima.ir/api/proxy/audio?url=$ENC"', 60000));
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();