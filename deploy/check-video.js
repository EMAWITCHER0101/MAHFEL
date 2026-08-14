const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

function ssh(cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== APARAT API TEST ===');
    console.log(await ssh('curl -s -o /dev/null -w "%{http_code}" "https://www.aparat.com/etc/api/video/videohash/cvh4675"', 15000));
    console.log(await ssh('curl -s "https://www.aparat.com/etc/api/video/videohash/cvh4675" | head -c 500', 15000));
    
    console.log('\n=== AUDIO DOMAIN TEST ===');
    console.log(await ssh('curl -s -o /dev/null -w "%{http_code}" "https://dl.soha-sima.ir/" 2>&1', 10000));
    console.log(await ssh('curl -sI "https://dl.soha-sima.ir/" 2>&1 | head -10', 10000));
    
    console.log('\n=== NGINX ERROR LOG ===');
    console.log(await ssh('tail -30 /var/log/nginx/error.log 2>/dev/null', 5000));
    
    console.log('\n=== NODE FETCH TEST ===');
    console.log(await ssh('node -e "fetch(\\\"https://www.aparat.com/etc/api/video/videohash/cvh4675\\\").then(r=>r.json()).then(d=>console.log(JSON.stringify(d).substring(0,500))).catch(e=>console.error(e.message))"', 15000));
  } catch(e) { console.error(e.message); }
})();
