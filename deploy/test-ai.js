const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
function ssh(cmd, t) {
  t = t || 60000;
  return new Promise((r, j) => {
    const c = new Client();
    const tm = setTimeout(() => { c.end(); j(new Error('TIMEOUT')); }, t);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(tm); c.end(); return j(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(tm); c.end(); r(o); });
      });
    }).on('error', e => { clearTimeout(tm); j(e); })
      .connect({host: '87.248.145.44', port: 9011, username: 'root', password: 'emadch82', readyTimeout: 30000, keepaliveInterval: 15000});
  });
}
(async () => {
  try {
    console.log('=== Backend logs ===');
    console.log(await ssh('journalctl -u soha-backend --no-pager -n 15', 20000));
  } catch(e) { console.error('SSH1:', e.message); }
  
  try {
    console.log('=== OpenRouter reach ===');
    console.log(await ssh('curl -s -o /dev/null -w %s http://openrouter.ai 2>&1', 20000));
  } catch(e) { console.error('SSH2:', e.message); }

  try {
    console.log('=== Test AI endpoint ===');
    console.log(await ssh('curl -s -X POST http://localhost:5000/api/ai/chat -H "Content-Type: application/json" -d \'{"messages":[{"role":"user","content":"hello"}]}\' 2>&1', 90000));
  } catch(e) { console.error('SSH3:', e.message); }
})()
