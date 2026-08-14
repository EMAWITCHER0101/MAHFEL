const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const HOST = '87.248.145.44';
const PORT = 9011;
const USER = 'root';
const PASS = 'emadch82';

function ssh(cmd, timeout) {
  timeout = timeout || 90000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

(async () => {
  try {
    console.log('1. Extract first audio URLs via node:');
    const urls = await ssh('cd /opt/soha/server && node -e "fetch(\'http://localhost:5000/api/podcasts\').then(r=>r.json()).then(d=>{console.log(JSON.stringify(d.map(p=>p.episodes[0]&&p.episodes[0].audioUrl).filter(Boolean).slice(0,5)))})"', 30000);
    console.log(urls.trim().slice(0, 500));
    const line = urls.split('\n').map(x => x.trim()).pop();
    const list = JSON.parse(line);
    const url = list[0];
    console.log('selected:', url.slice(0, 100));

    const enc = encodeURIComponent(url);

    console.log('2. Full proxy test (no range):');
    console.log(await ssh('node -e "const u=\'' + enc + '\'; fetch(\'http://localhost:5000/api/proxy/audio?url=\'+u).then(async r=>{console.log(\'status:\',r.status,\'ct:\',r.headers.get(\'content-type\'),\'len:\',r.headers.get(\'content-length\'));const b=await r.arrayBuffer();console.log(\'bytes:\',b.byteLength)}).catch(e=>console.log(\'FAIL:\',e.message))"', 90000));

    console.log('3. Range request test:');
    console.log(await ssh('node -e "const u=\'' + enc + '\'; fetch(\'http://localhost:5000/api/proxy/audio?url=\'+u,{headers:{Range:\'bytes=0-1023\'}}).then(async r=>{console.log(\'status:\',r.status,\'ct:\',r.headers.get(\'content-type\'),\'cr:\',r.headers.get(\'content-range\'));const b=await r.arrayBuffer();console.log(\'bytes:\',b.byteLength)}).catch(e=>console.log(\'FAIL:\',e.message))"', 90000));

    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();