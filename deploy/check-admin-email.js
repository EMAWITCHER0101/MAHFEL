const {Client} = require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');

const HOST = '87.248.145.44';
const PORT = 9011;
const USER = 'root';
const PASS = 'emadch82';

function ssh(cmd, timeout) {
  timeout = timeout || 60000;
  return new Promise((resolve, reject) => {
    const c = new Client();
    const timer = setTimeout(() => { c.end(); reject(new Error('TIMEOUT')); }, timeout);
    c.on('ready', () => {
      c.exec(cmd, {pty: true}, (e, s) => {
        if (e) { clearTimeout(timer); c.end(); return reject(e); }
        let o = '';
        s.on('data', d => { o += d; });
        s.stderr.on('data', d => { o += d; });
        s.on('close', () => { clearTimeout(timer); c.end(); resolve(o); });
      });
    }).on('error', e => { clearTimeout(timer); reject(e); })
      .connect({host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 15000, keepaliveInterval: 10000});
  });
}

(async () => {
  try {
    console.log('=== Check emails on test admin accounts ===');
    console.log(await ssh('cd /opt/soha/server && node -e "const {MongoClient}=require(\'mongodb\');(async()=>{const c=await MongoClient.connect(\'mongodb://localhost:27017/soha\');const users=await c.db(\'soha\').collection(\'users\').find({phoneNumber:{\\$in:[\'09900000001\',\'09900000002\']}}).project({phoneNumber:1,email:1,name:1,role:1}).toArray();console.log(JSON.stringify(users));await c.close()})()"', 30000));

    console.log('2. Find any admin with known email + check password set:');
    console.log(await ssh('cd /opt/soha/server && node -e "const {MongoClient}=require(\'mongodb\');(async()=>{const c=await MongoClient.connect(\'mongodb://localhost:27017/soha\');const users=await c.db(\'soha\').collection(\'users\').find({role:\'admin\',email:{\\$exists:true,\\$ne:\'\'}}).project({phoneNumber:1,email:1,name:1,hasPwd:{\\$cond:[{\\$ne:[\$password,null]},true,false]}}).toArray();console.log(JSON.stringify(users,null,1));await c.close()})()"', 30000));
    console.log('DONE');
  } catch (e) {
    console.error('FAILED:', e.message);
  }
})();