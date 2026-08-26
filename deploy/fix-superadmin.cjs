const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '.env.deploy') });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/soha');
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');

    // 1. Find all superadmins
    const supers = await users.find({ role: 'superadmin' }).toArray();
    console.log(`\n=== Superadmins found: ${supers.length} ===`);
    supers.forEach(s => console.log(`  ${s.name || 'no name'} | ${s.phoneNumber} | role=${s.role}`));

    // 2. Find users who might have been superadmin
    const withRequests = await users.find({ 'adminRequests': { $exists: true, $ne: [] } }).toArray();
    console.log(`\n=== Users with admin requests: ${withRequests.length} ===`);
    withRequests.forEach(u => {
      const latest = u.adminRequests[u.adminRequests.length - 1];
      console.log(`  ${u.name || 'no name'} | ${u.phoneNumber} | role=${u.role} | lastReq=${latest?.status}`);
    });

    // 3. Check if there's a user with phone that should be superadmin
    console.log('\n=== All users with admin/superadmin history ===');
    const allAdmins = await users.find({
      $or: [
        { role: { $in: ['admin', 'superadmin'] } },
        { 'adminRequests.status': 'approved' }
      ]
    }).toArray();
    allAdmins.forEach(u => console.log(`  ${u.name || 'no name'} | ${u.phoneNumber} | role=${u.role}`));

    if (supers.length === 0) {
      console.log('\n⚠️  NO SUPERADMIN FOUND!');
      console.log('Run this with --fix <phoneNumber> to restore superadmin role');
      const phone = process.argv[2];
      if (phone) {
        const result = await users.updateOne(
          { phoneNumber: phone },
          { $set: { role: 'superadmin' } }
        );
        console.log(`\nFixed: ${result.matchedCount} user matched, ${result.modifiedCount} modified`);
      } else {
        console.log('Usage: node fix-superadmin.cjs --fix 0912xxxxxxx');
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.close();
  }
})();
