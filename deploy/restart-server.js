const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function ssh(cmd) {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d); });
        s.on('close', () => { c.end(); resolve(o); });
      });
    }).on('error', e => reject(e))
      .connect({host:'87.248.145.44', port:9011, username:'root', password:'emadch82', readyTimeout:15000});
  });
}

(async () => {
  try {
    console.log('=== Kill old Node server ===');
    console.log(await ssh('kill 683962; sleep 2; echo killed'));
    
    console.log('\n=== Start Node server ===');
    console.log(await ssh('cd /opt/soha/server && nohup node server.js > /var/log/soha-server.log 2>&1 & sleep 3; echo started'));
    
    console.log('\n=== Check process ===');
    console.log(await ssh('ps aux | grep "server.js" | grep -v grep'));
    
    console.log('\n=== Test Podcasts API ===');
    console.log(await ssh('curl -s --max-time 10 http://localhost:5000/api/podcasts 2>&1 | head -c 500'));
    
    console.log('\n=== Test Health ===');
    console.log(await ssh('curl -s --max-time 10 http://localhost:5000/api/health 2>&1'));
    
    console.log('\n=== Check server log ===');
    console.log(await ssh('tail -20 /var/log/soha-server.log'));
  } catch(e) {
    console.error('ERROR:', e.message);
  }
})();
