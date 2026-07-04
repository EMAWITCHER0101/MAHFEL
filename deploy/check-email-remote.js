const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');

const script = fs.readFileSync('E:\\soha\\deploy\\check-email.js', 'utf8');

const c = new Client();
c.on('ready', () => {
  // Write script to server
  c.exec('cat > /tmp/check-email.js << \'EOF\'\n' + script + '\nEOF', (e, s) => {
    if (e) { console.error(e); c.end(); return; }
    s.on('close', () => {
      // Run it with node
      c.exec('cd /opt/soha/server && node /tmp/check-email.js', (e2, s2) => {
        let out = '';
        s2.on('data', d => { out += d; });
        s2.stderr.on('data', d => { out += d; });
        s2.on('close', () => { console.log(out); c.end(); });
      });
    });
  });
}).connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3'});
