const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const targets = [
  { host: '87.248.145.44', port: 9011, user: 'root', pass: 'emadch82', label: '44:9011' },
  { host: '87.248.145.44', port: 22, user: 'root', pass: 'emadch82', label: '44:22' },
  { host: '87.107.165.104', port: 9011, user: 'root', pass: 'BRykm7zfs3', label: '104:9011' },
];

let pending = targets.length;

function attempt(t) {
  const c = new Client();
  const done = (msg) => {
    console.log(t.label + ' -> ' + msg);
    c.end();
    if (--pending === 0) process.exit(0);
  };
  c.on('ready', () => done('READY ✓'));
  c.on('error', e => done('ERR: ' + (e.message || '(empty)')));
  c.on('close', () => {});
  try {
    c.connect({ host: t.host, port: t.port, username: t.user, password: t.pass, readyTimeout: 15000, keepaliveInterval: 5000 });
  } catch (e) {
    done('CONNECT THROW: ' + e.message);
  }
  setTimeout(() => { if (c._state && !c._ready) { console.log(t.label + ' -> SLOW TIMEOUT'); c.end(); if (--pending === 0) process.exit(0); } }, 25000);
}

targets.forEach(attempt);
setTimeout(() => { console.log('GLOBAL TIMEOUT'); process.exit(3); }, 60000);
