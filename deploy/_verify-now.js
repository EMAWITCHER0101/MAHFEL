const {Client}=require('C:\\Users\\EMAD\\AppData\\Roaming\\npm\\node_modules\\ssh2');
require('dotenv').config({path:require('path').join(__dirname,'.env.deploy')});
const c=new Client();
let cmd='cat /opt/soha/.next/standalone/.next/BUILD_ID; echo; curl -s http://localhost:3000/ -o /dev/null -w "HTTP:%{http_code}"; echo; grep -rl "VideoVaultPage\\|getVideoPlaylists" /opt/soha/.next/standalone/server/chunks/ 2>/dev/null | head -5; echo; curl -s http://localhost:5000/api/video-playlists 2>&1 | head -c 300';
c.on('ready',()=>{
  c.exec(cmd,{},(e,s)=>{if(e){console.error(e.message);return c.end();}
    let o='';s.on('data',d=>o+=d);s.stderr.on('data',d=>o+=d);
    s.on('close',()=>{console.log(o);c.end();});});
}).on('error',e=>console.error('CONN',e.message)).connect({
  host:process.env.SSH_HOST,port:Number(process.env.SSH_PORT||9011),
  username:process.env.SSH_USER,password:process.env.SSH_PASS,readyTimeout:15000});