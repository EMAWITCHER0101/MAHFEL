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
    const vidId = '6a2460604e951b50feb93063';
    console.log('=== VIDEO STREAM TEST ===');
    console.log(await ssh(`curl -s http://localhost:5000/api/videos/${vidId}/stream | head -c 500`, 15000));
    
    console.log('\n\n=== PODCAST STREAM TEST ===');
    const podcasts = await ssh('curl -s http://localhost:5000/api/podcasts | head -c 500');
    console.log(podcasts.substring(0, 300));
    
    console.log('\n\n=== PROXY TEST ===');
    console.log(await ssh('curl -s http://localhost:5000/api/proxy?url=https://httpbin.org/get | head -c 300', 10000));
    
    console.log('\n\n=== CORS HEADERS ===');
    console.log(await ssh('curl -s -I -H "Origin: http://localhost" http://localhost:5000/api/videos/6a2460604e951b50feb93063/stream 2>&1 | head -20', 10000));
  } catch(e) { console.error(e.message); }
})();
