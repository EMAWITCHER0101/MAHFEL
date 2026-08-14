import { MongoClient } from 'mongodb';
async function main() {
  const c = await MongoClient.connect('mongodb://localhost:27017');
  const db = c.db('soha');
  const r = await db.collection('users').updateOne(
    { phoneNumber: '09911122233' },
    { $set: { role: 'admin' } }
  );
  console.log('promoted:', r.modifiedCount);
  console.log('subs in DB:', await db.collection('pushsubscriptions').countDocuments());
  await c.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });