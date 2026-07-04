const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec('find /opt/soha/.next/standalone -name "*.js" | xargs grep -l "mahfel" 2>/dev/null | head -5', {}, (e, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => {
      console.log('Files with mahfel:', o);
      const files = o.trim().split('\n').filter(Boolean);
      if (files.length > 0) {
        c.exec('grep -n "lg:block\\|hidden.*lg" ' + files[0] + ' | head -5', {}, (e2, s2) => {
          let o2 = '';
          s2.on('data', d => o2 += d);
          s2.stderr.on('data', d => o2 += d);
          s2.on('close', () => { console.log('lg:block check:', o2 || 'NOT FOUND'); c.end(); });
        });
      } else { c.end(); }
    });
  });
}).connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
