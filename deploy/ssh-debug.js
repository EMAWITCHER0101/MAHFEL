const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const net = require('net');

// 1) Raw TCP + read SSH banner
console.log('--- raw TCP banner test ---');
const sock = net.connect(9011, '87.248.145.44', () => {
  console.log('TCP connected, waiting for SSH banner...');
  sock.setTimeout(8000);
});
sock.on('data', d => {
  console.log('BANNER:', JSON.stringify(String(d).slice(0, 80)));
  sock.destroy();
});
sock.on('timeout', () => { console.log('BANNER TIMEOUT (no data from server)'); sock.destroy(); });
sock.on('error', e => { console.log('TCP ERR:', e.message); });
sock.on('close', () => {
  // 2) Now try ssh2 with debug
  console.log('\n--- ssh2 debug test ---');
  const c = new Client();
  const logs = [];
  c.on('ready', () => { console.log('SSH READY'); c.end(); process.exit(0); });
  c.on('error', e => { console.log('SSH ERR:', e.message); process.exit(1); });
  c.on('close', () => { console.log('SSH closed'); process.exit(1); });
  c.connect({
    host: '87.248.145.44', port: 9011, username: 'root', password: 'emadch82',
    readyTimeout: 20000, keepaliveInterval: 5000, debug: (m) => logs.push(m),
  });
  setTimeout(() => {
    console.log('--- last 20 debug lines ---');
    logs.slice(-20).forEach(l => console.log('DBG:', l));
    process.exit(2);
  }, 25000);
});
