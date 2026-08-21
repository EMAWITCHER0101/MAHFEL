const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/server/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soha';

const userSchema = new mongoose.Schema({
  phoneNumber: String,
  role: { type: String, default: 'user' },
  name: String,
  adminPermissions: [String],
}, { strict: false });

const User = mongoose.model('User', userSchema);

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await User.updateOne(
      { phoneNumber: '09130245369' },
      { $set: { role: 'superadmin', name: 'مدیر سیستم' } }
    );

    if (result.matchedCount === 0) {
      console.log('User not found! Creating...');
      await User.create({
        phoneNumber: '09130245369',
        role: 'superadmin',
        name: 'مدیر سیستم',
        adminPermissions: [],
      });
      console.log('Superadmin created');
    } else {
      console.log('Superadmin set for 09130245369');
    }

    const user = await User.findOne({ phoneNumber: '09130245369' }).select('name phoneNumber role');
    console.log('User:', JSON.stringify(user));

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();