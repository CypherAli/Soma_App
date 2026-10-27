import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),files=resolve(root,'builds/desktop-web'),url='http://localhost:8082';
async function json(target){try{const r=await fetch(target,{signal:AbortSignal.timeout(3000)});return r.ok?await r.json():null;}catch{return null;}}
function openApp(){const browser=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);if(browser&&process.argv.includes('--open'))spawn(browser,[`--app=${url}`,'--window-size=620,980'],{detached:true,stdio:'ignore',windowsHide:false}).unref();}
if((await json(url+'/_soma/health'))?.service==='soma-desktop-preview'){openApp();console.log(url);process.exit(0);}
if(!existsSync(resolve(files,'index.html'))){const r=spawnSync(process.execPath,['scripts/build-desktop.mjs'],{cwd:root,stdio:'inherit',windowsHide:true});if(r.status!==0)process.exit(r.status||1);}
if(!(await json('http://127.0.0.1:8083/api/auth/mobile/capabilities'))){
 spawn(process.execPath,['scripts/dev-desktop.mjs','--api-only'],{cwd:root,stdio:'ignore',detached:true,windowsHide:true}).unref();
 for(let i=0;i<60&&!await json('http://127.0.0.1:8083/api/auth/mobile/capabilities');i++)await new Promise(r=>setTimeout(r,1000));
 if(!await json('http://127.0.0.1:8083/api/auth/mobile/capabilities'))throw Error('API local chưa sẵn sàng.');
}
const metadata=JSON.parse(readFileSync(resolve(files,'soma-preview.json'),'utf8'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 try{
  const target=new URL(req.url,'http://localhost').pathname;
  if(target==='/_soma/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({service:'soma-desktop-preview',...metadata}));return;}
  let file=resolve(files,'.'+decodeURIComponent(target));if(file!==files&&!file.startsWith(files+sep)){res.writeHead(403).end();return;}
  try{if(!(await stat(file)).isFile())throw Error();}catch{if(extname(file)){res.writeHead(404).end();return;}file=resolve(files,'index.html');}
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');if(req.method==='HEAD'){res.end();return;}
  createReadStream(file).on('error',()=>res.destroy()).pipe(res);
 }catch{res.writeHead(500).end();}
}).on('error',error=>{console.error(error.code==='EADDRINUSE'?'Cổng 8082 đang dùng. Dừng đúng phiên Expo dev rồi chạy lại.':error.message);process.exitCode=1;}).listen(8082,'127.0.0.1',()=>{console.log(`Soma phone preview: ${url} — packaged web build, no Metro server`);openApp();});
