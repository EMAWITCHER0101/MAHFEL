const mongoose = require('E:\\soha\\server\\node_modules\\mongoose');
const fs = require('fs');
const path = require('path');

const DUMP_DIR = 'C:\\Users\\EMAD\\AppData\\Local\\Temp\\soha-dump';

async function dump() {
  await mongoose.connect('mongodb://localhost:27017/soha');
  console.log('Connected to local MongoDB');
  
  fs.mkdirSync(DUMP_DIR, { recursive: true });
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  
  for (const col of collections) {
    const name = col.name;
    const docs = await mongoose.connection.db.collection(name).find({}).toArray();
    const filePath = path.join(DUMP_DIR, name + '.json');
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
    console.log(`${name}: ${docs.length} docs -> ${filePath}`);
  }
  
  await mongoose.disconnect();
  console.log('Dump complete!');
}

dump().catch(e => { console.error(e); process.exit(1); });
