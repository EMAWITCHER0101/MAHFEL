const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(label, cmd, timeout) {
  timeout = timeout || 120000;
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; process.stdout.write(d.toString().replace(/\r/g, '')); });
        s.stderr.on('data', d => { o += d; process.stderr.write(d.toString().replace(/\r/g, '')); });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const name = path.basename(localPath);
    console.log('>>> Upload ' + name);
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        const r = fs.createReadStream(localPath);
        let total = 0;
        r.on('data', d => { total += d.length; });
        const w = sftp.createWriteStream(remotePath);
        w.on('close', () => { console.log('  ' + Math.round(total/1024) + ' KB OK'); c.end(); resolve(); });
        w.on('error', e => { c.end(); reject(e); });
        r.pipe(w);
      });
    }).on('error', e => reject(e))
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

function uploadDir(localDir, remoteDir) {
  return new Promise((resolve, reject) => {
    console.log('>>> UploadDir ' + localDir);
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); return reject(err); }
        
        function uploadRecursive(loc, rem) {
          return new Promise((res, rej) => {
            sftp.mkdir(rem, () => { // ignore error if exists
              fs.readdir(loc, (err, items) => {
                if (err) return rej(err);
                let pending = items.length;
                if (pending === 0) return res();
                items.forEach(item => {
                  const lp = path.join(loc, item);
                  const rp = rem + '/' + item;
                  fs.stat(lp, (err, stat) => {
                    if (err) { pending--; if (pending === 0) res(); return; }
                    if (stat.isDirectory()) {
                      uploadRecursive(lp, rp).then(() => { pending--; if (pending === 0) res(); });
                    } else {
                      const r = fs.createReadStream(lp);
                      const w = sftp.createWriteStream(rp);
                      w.on('close', () => { pending--; if (pending === 0) res(); });
                      w.on('error', rej);
                      r.pipe(w);
                    }
                  });
                });
              });
            });
          });
        }
        
        uploadRecursive(localDir, remoteDir).then(() => {
          console.log('  Dir upload complete');
          c.end();
          resolve();
        }).catch(e => { c.end(); reject(e); });
      });
    }).on('error', reject)
      .connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
  });
}

(async () => {
  try {
    // Create a tarball of the standalone folder locally for faster upload
    console.log('Creating tarball of standalone build...');
    execSync('tar -czf E:\\soha-deploy-standalone.tar.gz -C E:\\soha\\.next standalone', { stdio: 'inherit' });
    
    // Upload tarball
    await uploadFile('E:\\soha-deploy-standalone.tar.gz', '/opt/soha/soha-deploy-standalone.tar.gz');
    
    // Extract on server (remove old standalone, extract new)
    await run('Extract standalone', 
      'cd /opt/soha && rm -rf .next/standalone.bak && mv .next/standalone .next/standalone.bak && tar -xzf soha-deploy-standalone.tar.gz -C .next/ && cp .next/standalone.bak/server/node_modules .next/standalone/server/ -rf 2>/dev/null; echo "Extract done"', 
      60000);
    
    // Restart frontend
    await run('Restart frontend', 'systemctl restart soha-frontend && sleep 2 && systemctl status soha-frontend | head -5', 20000);
    
    console.log('\n=== DEPLOY COMPLETE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
