const { MongoClient } = require('mongodb');

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/soha';
  const client = new MongoClient(uri);
  await client.connect();
  const users = client.db().collection('users');

  const supers = await users.find({ role: 'superadmin' }).project({ name: 1, phoneNumber: 1, role: 1 }).toArray();
  console.log('Superadmins:', supers.length);
  supers.forEach(x => console.log(' ', x.name, x.phoneNumber, x.role));

  if (supers.length === 0) {
    console.log('NO SUPERADMIN FOUND!');
    const admins = await users.find({ role: { $in: ['admin', 'superadmin'] } }).project({ name: 1, phoneNumber: 1, role: 1 }).toArray();
    console.log('All admins:');
    admins.forEach(x => console.log(' ', x.name, x.phoneNumber, x.role));
  }

  await client.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
