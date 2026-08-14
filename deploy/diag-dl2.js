const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

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

(async () => {
  try {
    console.log('=== HTTP vs HTTPS audio test ===');
    const url = 'https://dl.soha-sima.ir/%D8%A2%D8%B1%D8%B4%DB%8C%D9%88/1403/00%20%D8%AA%DA%A9%20%D8%AC%D9%84%D8%B3%D9%87/%D9%82%D8%AF%D8%B3%D8%9B%20%D8%A7%D9%81%D9%82%20%D8%AD%DB%8C%D8%A7%D8%AA%20%D9%85%D8%B3%D9%84%D9%85%DB%8C%D9%86%20%2815%D9%81%D8%B1%D9%88%D8%B1%D8%AF%DB%8C%D9%861403%29.mp3';
    console.log('1. HTTPS (expected fail - expired cert):');
    console.log(await ssh(`curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "${url}" 2>&1; echo`));

    const httpUrl = url.replace('https://', 'http://');
    console.log('2. HTTP direct:');
    console.log(await ssh(`curl -s -o /dev/null -w "%{http_code} time:%{time_total}" --connect-timeout 10 "${httpUrl}" 2>&1; echo`));

    console.log('3. HTTP follow redirect (-L):');
    console.log(await ssh(`curl -sL -o /dev/null -w "%{http_code} size:%{size_download}" --connect-timeout 10 -r 0-1023 "${httpUrl}" 2>&1; echo`));

    console.log('4. HTTPS with -k (ignore cert):');
    console.log(await ssh(`curl -sk -o /dev/null -w "%{http_code} size:%{size_download}" --connect-timeout 10 -r 0-1023 "${url}" 2>&1; echo`));

    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();