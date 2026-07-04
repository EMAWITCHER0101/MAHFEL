const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

function ssh(cmd, timeout) {
  timeout = timeout || 60000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + cmd.substring(0,50))); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const name = require('path').basename(localPath);
    const size = require('fs').statSync(localPath).size;
    console.log('>>> Upload ' + name + ' (' + Math.round(size/1024) + ' KB)');
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = require('fs').createReadStream(localPath);
        let total = 0;
        r.on('data', d => { total += d.length; });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  OK'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    // 1. Stop frontend
    console.log('=== STOPPING FRONTEND ===');
    await ssh('systemctl stop soha-frontend');

    // 2. Clean old standalone
    console.log('=== CLEANING ===');
    await ssh('rm -rf /opt/soha/.next/standalone /opt/soha/.next/cache');

    // 3. Upload fresh tar
    console.log('=== UPLOADING ===');
    await uploadFile('C:\\Temp\\soha-fe.tar.gz', '/tmp/soha-fe.tar.gz');

    // 4. Extract + copy static + public
    console.log('=== EXTRACTING ===');
    console.log(await ssh(`
      cd /opt/soha
      tar -xzf /tmp/soha-fe.tar.gz -C .next/
      cp -r .next/static .next/standalone/.next/static
      mkdir -p .next/standalone/public
      cp -r public/* .next/standalone/public/
      
      echo "BUILD_ID:"
      cat .next/standalone/.next/BUILD_ID
      echo ""
      echo "CSS files in static:"
      ls .next/static/chunks/*.css 2>/dev/null
      echo "CSS files in standalone:"
      ls .next/standalone/.next/static/chunks/*.css 2>/dev/null
      echo "HTML check:"
      grep -o '[a-z0-9_]*\\.css' .next/standalone/.next/server/app/index.html 2>/dev/null | head -3
    `, 30000));

    // 5. Start frontend
    console.log('=== STARTING ===');
    console.log(await ssh('systemctl start soha-frontend && sleep 3 && systemctl is-active soha-frontend', 20000));

    // 6. Test
    console.log('=== TESTING ===');
    console.log(await ssh('curl -sI http://localhost:3000/ 2>&1 | head -3'));
    
    // Get the CSS hash from the actual HTML
    console.log(await ssh('curl -s http://localhost:3000/ 2>&1 | grep -oP "chunks/[a-z0-9_-]+\\.css" | head -3'));

    console.log('DONE');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
