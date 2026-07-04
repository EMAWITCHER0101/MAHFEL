const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/soha');
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  users.forEach(u => {
    console.log(JSON.stringify({ name: u.name, email: u.email, phoneNumber: u.phoneNumber }));
  });
  mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
