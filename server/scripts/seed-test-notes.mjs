import { MongoClient, ObjectId } from 'mongodb';
async function main() {
  const c = await MongoClient.connect('mongodb://localhost:27017');
  const db = c.db('soha');
  const authors = [
    { authorName: 'نویسنده آزمون یک', authorId: new ObjectId(), title: 'یادداشت اول', description: 'توضیح اول', type: 'note', isDraft: false, date: '۱ مرداد ۱۴۰۵', contentHtml: '<p>متن اول</p>' },
    { authorName: 'نویسنده آزمون یک', authorId: new ObjectId(), title: 'یادداشت دوم', description: 'توضیح دوم', type: 'note', isDraft: false, date: '۲ مرداد ۱۴۰۵', contentHtml: '<p>متن دوم</p>' },
    { authorName: 'نویسنده آزمون دو', authorId: new ObjectId(), title: 'یادداشت سوم', description: 'توضیح سوم', type: 'note', isDraft: false, date: '۳ مرداد ۱۴۰۵', contentHtml: '<p>متن سوم</p>' },
    { authorName: 'نویسنده آزمون سه', authorId: new ObjectId(), title: 'یادداشت چهارم', description: 'توضیح چهارم', type: 'note', isDraft: false, date: '۴ مرداد ۱۴۰۵', contentHtml: '<p>متن چهارم</p>' },
  ];
  const r = await db.collection('publishedbooks').insertMany(authors);
  console.log('seeded:', r.insertedCount);
  await c.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });