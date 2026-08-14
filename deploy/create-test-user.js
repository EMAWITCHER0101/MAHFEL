const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env.deploy') });

const HOST = process.env.SSH_HOST;
const PORT = parseInt(process.env.SSH_PORT || '9011');
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

function ssh(label, cmd, timeout) {
  timeout = timeout || 30000;
  return new Promise((resolve, reject) => {
    console.log('>>> ' + label);
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT: ' + label)); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
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

const CREATE_USER_SCRIPT = `
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function run() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mahfel';
  await mongoose.connect(MONGO_URI);
  
  const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    name: { type: String, default: '' },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['user', 'author', 'admin'], default: 'user' },
    warnings: { type: Number, default: 0 },
    banned: { type: Boolean, default: false },
    muted: { type: Boolean, default: false },
    interests: [{ type: String }],
    library: { podcasts: [], episodes: [], videos: [], books: [], notes: [] },
  }, { timestamps: true });
  
  const User = mongoose.model('User', userSchema);
  
  const phone = '09121111111';
  const pass = 'test1234';
  const name = 'بازدیدکننده';
  
  let user = await User.findOne({ phoneNumber: phone });
  if (user) {
    user.password = await bcrypt.hash(pass, 10);
    user.name = name;
    await user.save();
    console.log('User updated:', phone);
  } else {
    user = new User({
      phoneNumber: phone,
      name,
      password: await bcrypt.hash(pass, 10),
      avatar: '',
      role: 'user',
      interests: [],
      library: { podcasts: [], episodes: [], videos: [], books: [], notes: [] },
    });
    await user.save();
    console.log('User created:', phone);
  }
  
  await mongoose.disconnect();
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
`.trim();

(async () => {
  try {
    console.log('=== CREATE TEST USER ===');
    const scriptB64 = Buffer.from(CREATE_USER_SCRIPT).toString('base64');
    await ssh('Run create user', `node -e "eval(Buffer.from('${scriptB64}','base64').toString())"`, 15000);
    console.log('\n=== DONE ===');
  } catch (e) {
    console.error('\nFAILED:', e.message);
  }
})();
