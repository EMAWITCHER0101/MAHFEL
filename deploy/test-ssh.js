const { Client } = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected!');
  conn.exec('uname -a && echo "====" && cat /etc/os-release | head -5', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Exit code:', code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Error:', err.message);
}).connect({
  host: '87.107.165.104',
  port: 9011,
  username: 'root',
  password: 'BRykm7zfs3',
  readyTimeout: 15000,
});
