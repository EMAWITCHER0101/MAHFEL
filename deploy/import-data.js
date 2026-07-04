const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const fs = require('fs');
const path = require('path');

const DUMP_DIR = 'C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-dump';

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
    const name = require('path').basename(localPath);
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

(async () => {
  try {
    const files = fs.readdirSync(DUMP_DIR).filter(f => f.endsWith('.json'));
    
    // Upload all JSON files
    await run('Mkdir', 'mkdir -p /opt/soha/server/seed-data', 5000);
    for (const file of files) {
      await uploadFile(path.join(DUMP_DIR, file), '/opt/soha/server/seed-data/' + file);
    }

    // Create import script
    const importScript = `
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soha';

const schemas = {
  authors: new mongoose.Schema({}, { strict: false }),
  podcasts: new mongoose.Schema({}, { strict: false }),
  videos: new mongoose.Schema({}, { strict: false }),
  books: new mongoose.Schema({}, { strict: false }),
  publishedbooks: new mongoose.Schema({}, { strict: false }),
  posts: new mongoose.Schema({}, { strict: false }),
  comments: new mongoose.Schema({}, { strict: false }),
  users: new mongoose.Schema({}, { strict: false }),
};

async function importData() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const dataDir = path.join(__dirname, 'seed-data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const collName = file.replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    
    const Model = mongoose.model(collName, schemas[collName] || new mongoose.Schema({}, { strict: false }));
    
    await Model.deleteMany({});
    if (data.length > 0) {
      await Model.insertMany(data);
    }
    console.log(collName + ': ' + data.length + ' docs imported');
  }

  await mongoose.disconnect();
  console.log('Import complete!');
  process.exit(0);
}

importData().catch(e => { console.error(e); process.exit(1); });
`;

    fs.writeFileSync('C:\\Users\\EMAD\\AppData\\Local\\Temp\\import-data.mjs', importScript);
    await uploadFile('C:\\Users\\EMAD\\AppData\\Local\\Temp\\import-data.mjs', '/opt/soha/server/import-data.mjs');

    // Run import
    await run('Import data', 'cd /opt/soha/server && node import-data.mjs 2>&1', 60000);

    // Restart backend
    await run('Restart backend', 'systemctl restart soha-backend && sleep 3 && systemctl status soha-backend | head -5', 20000);

    // Verify
    await run('Verify podcasts', 'curl -s http://localhost:5000/api/podcasts | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d))" 2>/dev/null', 15000);
    await run('Verify videos', 'curl -s http://localhost:5000/api/videos | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d))" 2>/dev/null', 15000);

    console.log('\n=== ALL DATA IMPORTED ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
