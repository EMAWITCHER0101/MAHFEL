import { MongoClient } from 'mongodb';
async function main() {
  const c = await MongoClient.connect('mongodb://localhost:27017');
  const db = c.db('soha');
  await db.collection('publishedbooks').deleteMany({ authorName: /نویسنده آزمون/ });
  await db.collection('pushsubscriptions').deleteMany({});
  await db.collection('notifications').deleteMany({ title: { $in: ['Test Push', 'LogTest', 'وب‌پوش E2E', 'WebPush E2E Test'] } });
  await db.collection('users').deleteMany({ phoneNumber: '09911122233' });
  console.log('test data cleaned');
  await c.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });