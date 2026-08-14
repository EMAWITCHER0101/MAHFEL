const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });
const HOST = process.env.SSH_HOST, PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER, PASS = process.env.SSH_PASS;

const files = [
  ['E:\\soha\\server\\routes\\posts.js', '/opt/soha/server/routes/posts.js'],
  ['E:\\soha\\server\\routes\\comments.js', '/opt/soha/server/routes/comments.js'],
  ['E:\\soha\\server\\routes\\videos.js', '/opt/soha/server/routes/videos.js'],
  ['E:\\soha\\server\\routes\\podcasts.js', '/opt/soha/server/routes/podcasts.js'],
  ['E:\\soha\\server\\routes\\books.js', '/opt/soha/server/routes/books.js'],
  ['E:\\soha\\server\\routes\\authors.js', '/opt/soha/server/routes/authors.js'],
  ['E:\\soha\\server\\routes\\publishedBooks.js', '/opt/soha/server/routes/publishedBooks.js'],
  ['E:\\soha\\server\\routes\\notifications.js', '/opt/soha/server/routes/notifications.js'],
  ['E:\\soha\\server\\routes\\playlists.js', '/opt/soha/server/routes/playlists.js'],
  ['E:\\soha\\server\\routes\\admin.js', '/opt/soha/server/routes/admin.js'],
  ['E:\\soha\\server\\utils\\broadcast.js', '/opt/soha/server/utils/broadcast.js'],
  ['E:\\soha\\server\\utils\\webpush.js', '/opt/soha/server/utils/webpush.js'],
  ['E:\\soha\\server\\utils\\deleteUserContent.js', '/opt/soha/server/utils/deleteUserContent.js'],
  ['E:\\soha\\server\\routes\\auth.js', '/opt/soha/server/routes/auth.js'],
  ['E:\\soha\\server\\models\\Post.js', '/opt/soha/server/models/Post.js'],
  ['E:\\soha\\server\\models\\User.js', '/opt/soha/server/models/User.js'],
  ['E:\\soha\\server\\models\\Comment.js', '/opt/soha/server/models/Comment.js'],
  ['E:\\soha\\server\\models\\PublishedBook.js', '/opt/soha/server/models/PublishedBook.js'],
  ['E:\\soha\\server\\models\\Notification.js', '/opt/soha/server/models/Notification.js'],
];

const c = new Client();
function run(cmd, tag) {
  return new Promise((res, rej) => {
    c.exec(cmd, (err, stream) => {
      if (err) return rej(err);
      let out = '';
      stream.on('close', code => { console.log(`--- ${tag} (exit ${code}) ---`); if (out.trim()) console.log(out.trim().slice(-800)); res(code); })
        .on('data', d => out += d.toString())
        .stderr.on('data', d => out += d.toString());
    });
  });
}

(async () => {
  await new Promise((res, rej) => c.on('ready', res).on('error', rej)
    .connect({ host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 20000 }));
  console.log('connected');
  const sftp = await new Promise((res, rej) => c.sftp((e, s) => e ? rej(e) : res(s)));
  for (const [src, dst] of files) {
    await new Promise((res, rej) => sftp.fastPut(src, dst, e => e ? rej(e) : res()));
    console.log('uploaded', dst);
  }
  await run('systemctl restart soha-backend && sleep 6 && curl -s -o /dev/null -w "backend health -> %{http_code}\n" http://127.0.0.1:5000/api/health', 'restart BE');
  c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });