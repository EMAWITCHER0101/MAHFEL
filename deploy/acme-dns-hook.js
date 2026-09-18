const fs = require('fs');

const STATE = 'C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\acme-dns-state.txt';
const DONE = 'C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-tmp\\acme-dns-done.txt';

const mode = process.argv[2] || 'auth';
const domain = process.env.CERTBOT_DOMAIN || '';
const validation = process.env.CERTBOT_VALIDATION || '';

(async () => {
  if (mode === 'auth') {
    if (!domain || !validation) { console.error('DNS HOOK: missing env'); process.exit(1); }
    try { fs.unlinkSync(DONE); } catch (e) {}
    fs.writeFileSync(STATE, `DOMAIN=${domain}\nTXT_VALUE=${validation}`);
    console.log('==========================================');
    console.log('ADD THIS TXT RECORD IN NETAFRAZ PANEL:');
    console.log(`Name: _acme-challenge.${domain}`);
    console.log(`Type: TXT`);
    console.log(`Value: "${validation}"`);
    console.log('==========================================');
    const deadline = Date.now() + 35 * 60 * 1000;
    while (Date.now() < deadline) {
      if (fs.existsSync(DONE)) { console.log('DNS HOOK: confirmed, continuing'); process.exit(0); }
      await new Promise(r => setTimeout(r, 2000));
    }
    console.error('DNS HOOK: timeout waiting for confirmation');
    process.exit(1);
  } else {
    try { fs.unlinkSync(STATE); } catch (e) {}
    console.log('DNS HOOK: cleanup done');
    process.exit(0);
  }
})();