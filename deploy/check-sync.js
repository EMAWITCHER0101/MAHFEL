const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

function ssh(cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + cmd)); }, timeout);
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
    console.log('=== WS SERVER STATUS ===');
    console.log(await ssh('systemctl is-active soha-ws'));
    console.log(await ssh('curl -s http://localhost:5001/health'));
    
    console.log('\n=== WS SERVER LOGS ===');
    console.log(await ssh('journalctl -u soha-ws --no-pager -n 30 --since "5 min ago"', 10000));
    
    console.log('\n=== BROADCAST TEST (direct) ===');
    console.log(await ssh('curl -s -X POST http://localhost:5001/broadcast -H "Content-Type: application/json" -d \'{"event":"test","data":{"type":"test"}}\''));
    
    console.log('\n=== WS CLIENTS CHECK ===');
    console.log(await ssh('curl -s http://localhost:5001/health'));
    
    console.log('\n=== SERVER LOGS (sseBroadcast) ===');
    console.log(await ssh('journalctl -u soha-backend --no-pager -n 20 --since "2 min ago"', 10000));
    
    console.log('\n=== PORT 5001 EXTERNAL ===');
    console.log(await ssh('curl -s http://87.248.145.44:5001/health 2>&1', 10000));
    console.log(await ssh('ss -tlnp | grep 5001'));
  } catch(e) { console.error('ERROR:', e.message); }
})();
