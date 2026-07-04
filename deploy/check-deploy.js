const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec('grep -rn "activeTab.*mahfel" /opt/soha/.next/standalone/server/chunks/ 2>/dev/null | grep -i "hidden\\|lg:block" | head -5', {}, (e, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log('RESULT:', o || 'NOT FOUND'); c.end(); });
  });
}).connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
