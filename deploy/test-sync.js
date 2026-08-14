const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const WebSocket = require('ws');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(cmd, timeout) {
  timeout = timeout || 15000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o.trim()); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== SYNC TEST ===');

    // 1. Test WS connection from client
    const ws = new WebSocket(`ws://${HOST}/ws`);
    let received = false;

    await new Promise((resolve, reject) => {
      ws.on('open', () => { console.log('1. WS connected via Nginx'); resolve(); });
      ws.on('error', (e) => { console.log('1. WS FAILED:', e.message); reject(e); });
      setTimeout(() => reject(new Error('WS connect timeout')), 5000);
    });

    ws.on('message', (d) => {
      const msg = JSON.parse(d.toString());
      if (msg.event !== 'heartbeat') {
        console.log('3. RECEIVED broadcast:', msg.event, JSON.stringify(msg.data));
        received = true;
      }
    });

    // 2. Broadcast from server
    const result = await ssh('curl -s -X POST http://127.0.0.1:5001/broadcast -H Content-Type:application/json -d \'{"event":"data-changed","data":{"type":"posts"}}\'');
    console.log('2. Broadcast result:', result);

    // 3. Wait for message
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('4. Sync result:', received ? 'OK - instant!' : 'FAILED');

    ws.close();
    console.log('=== DONE ===');
  } catch (e) {
    console.error('FAILED:', e.message);
    process.exit(1);
  }
})();
