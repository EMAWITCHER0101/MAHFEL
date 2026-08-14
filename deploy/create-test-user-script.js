const mongoose = require('/opt/soha/server/node_modules/mongoose');
const bcrypt = require('/opt/soha/server/node_modules/bcryptjs');

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
