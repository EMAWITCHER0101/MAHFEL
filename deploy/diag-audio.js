const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const HOST = '87.248.145.44';
const PORT = 9011;
const USER = 'root';
const PASS = 'emadch82';

function ssh(cmd, timeout) {
  timeout = timeout || 60000;
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
    console.log('=== AUDIO PROXY DIAGNOSTICS ===');

    console.log('1. Backend status:');
    console.log(await ssh('systemctl is-active soha-backend'));

    console.log('2. dl.soha-sima.ir DNS + reachability:');
    console.log(await ssh('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 https://dl.soha-sima.ir/ 2>&1'));

    console.log('3. Sample podcast audio URL:');
    console.log(await ssh('curl -s http://localhost:5000/api/podcasts 2>&1 | head -c 2000', 30000));

    console.log('4. Proxy endpoint test (first audio url):');
    console.log(await ssh('URL=$(curl -s http://localhost:5000/api/podcasts | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0][\"episodes\"][0][\"audioUrl\"] if d and d[0][\"episodes\"] else \"\")" 2>/dev/null); echo "URL=$URL"; curl -s -o /dev/null -w "proxy status: %{http_code} time: %{time_total}s size: %{size_download}\n" --connect-timeout 15 "http://localhost:5000/api/proxy/audio?url=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=\"\"))" "$URL" 2>/dev/null)"', 60000));

    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();