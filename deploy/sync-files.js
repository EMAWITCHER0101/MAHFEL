const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const c = new Client();
c.on('ready', () => {
  c.exec(`
    # Sync static files
    rm -rf /opt/soha/.next/static
    cp -r /opt/soha/.next/standalone/.next/static /opt/soha/.next/static
    
    # Sync public
    rm -rf /opt/soha/public
    cp -r /opt/soha/.next/standalone/public /opt/soha/public
    
    # Verify the CSS exists
    ls -la /opt/soha/.next/static/chunks/ | head -5
    
    # Restart
    systemctl restart soha-frontend
    
    # Test
    sleep 2
    curl -sI http://localhost:3000/ | head -3
  `, {}, (e, s) => {
    let o = '';
    s.on('data', d => { o += d; process.stdout.write(d); });
    s.stderr.on('data', d => { o += d; process.stderr.write(d); });
    s.on('close', () => { c.end(); });
  });
}).connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
