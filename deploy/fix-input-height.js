const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');

const c = new Client();
c.on('ready', () => {
  console.log('SSH connected');
  
  const localFile = 'E:\\soha\\views\\CommentsCommunityPage.tsx';
  const remoteFile = '/tmp/CommentsCommunityPage.tsx';
  const remoteDest = '/opt/soha/views/CommentsCommunityPage.tsx';
  
  const content = fs.readFileSync(localFile);
  
  c.sftp((err, sftp) => {
    if (err) { console.error('SFTP error:', err); c.end(); return; }
    
    sftp.writeFile(remoteFile, content, (err) => {
      if (err) { console.error('Upload error:', err); c.end(); return; }
      console.log('File uploaded');
      
      c.exec(`cp ${remoteFile} ${remoteDest} && cd /opt/soha && npm run build 2>&1 | tail -5 && cp -r .next/standalone/.next/static .next/static && systemctl restart soha-frontend`, {}, (e, s) => {
        let out = '';
        s.on('data', d => { out += d; process.stdout.write(d); });
        s.stderr.on('data', d => { out += d; process.stderr.write(d); });
        s.on('close', () => { console.log('\nDONE'); c.end(); });
      });
    });
  });
}).connect({host: '87.107.165.104', port: 9011, username: 'root', password: 'BRykm7zfs3', readyTimeout: 15000});
