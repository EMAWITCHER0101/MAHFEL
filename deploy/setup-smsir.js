const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

const ENV_ADDITIONS = `
SMSIR_API_KEY=3KtD8KYFBfzGg9OjFXtcNkxgdPlwAlBiZfK7RMnBtBakqrbE
SMSIR_TEMPLATE_ID=100467
`.trim();

function ssh(label, cmd, timeout) {
  timeout = timeout || 30000;
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
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000});
  });
}

(async () => {
  try {
    console.log('=== ADD SMSIR ENV VARS ===');

    const check = await ssh('Check existing', 'grep SMSIR_API_KEY /opt/soha/server/.env || echo NOT_FOUND');
    if (check.includes('NOT_FOUND')) {
      await ssh('Add env vars', `echo "" >> /opt/soha/server/.env && echo "${ENV_ADDITIONS}" >> /opt/soha/server/.env`);
      console.log('>>> Env vars added');
    } else {
      console.log('>>> Env vars already exist, updating...');
      await ssh('Update env', `sed -i 's/^SMSIR_API_KEY=.*/SMSIR_API_KEY=3KtD8KYFBfzGg9OjFXtcNkxgdPlwAlBiZfK7RMnBtBakqrbE/' /opt/soha/server/.env && sed -i 's/^SMSIR_TEMPLATE_ID=.*/SMSIR_TEMPLATE_ID=100467/' /opt/soha/server/.env`);
    }

    await ssh('Verify', 'grep SMSIR /opt/soha/server/.env');
    await ssh('Restart backend', 'systemctl restart soha-backend && sleep 2 && systemctl is-active soha-backend', 20000);
    await ssh('Check health', 'curl -s http://localhost:5000/api/health', 10000);

    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
