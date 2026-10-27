import { spawn } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const backend=resolve(root,'../soma_be'), url='http://localhost:8082', api='http://127.0.0.1:8083/api';
const require=createRequire(resolve(backend,'package.json'));
const backendEnv=existsSync(resolve(backend,'.env'))?require('dotenv').parse(readFileSync(resolve(backend,'.env'))):{};
const returns=[...new Set([backendEnv.MOBILE_OAUTH_RETURN_URLS,process.env.MOBILE_OAUTH_RETURN_URLS,`${url}/oauth`,'http://127.0.0.1:8082/oauth'].filter(Boolean).flatMap(v=>v.split(',')))].join(',');
const env={...process.env,EXPO_PUBLIC_API_URL:api,DESKTOP_OAUTH_API_URL:'http://localhost:4000/api',MOBILE_OAUTH_RETURN_URLS:returns};
delete env.CI;
const children=[];
function run(args,cwd){const child=spawn(process.execPath,args,{cwd,env,stdio:'inherit',windowsHide:true});children.push(child);return child;}
async function json(target,options){try{const r=await fetch(target,{...options,signal:AbortSignal.timeout(2500)});return r.ok?await r.json():null;}catch{return null;}}
const delay=ms=>new Promise(done=>setTimeout(done,ms));
async function until(check,child,label){for(let n=0;n<90;n++){if(await check())return;if(child&&child.exitCode!==null)throw Error(`${label} đã dừng. Xem lỗi phía trên.`);await delay(1000);}throw Error(`${label} chưa sẵn sàng.`);}
async function manifest(){return json(url,{headers:{'expo-platform':'android',accept:'application/expo+json'}});}
function openApp(){
  const browser=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
  if(!browser){console.log(`Mở trình duyệt tại ${url}`);return;}
  // Interactive app window requested by the user. Helper services remain hidden.
  const child=spawn(browser,[`--app=${url}`,'--window-size=620,980'],{detached:true,stdio:'ignore',windowsHide:false});child.unref();
}
function stop(){for(const child of children)if(child.exitCode===null)child.kill();}
process.on('SIGINT',()=>{stop();process.exit(0);});process.on('SIGTERM',()=>{stop();process.exit(0);});
try{
  const health=()=>json('http://127.0.0.1:4000/api/health').then(value=>value?.status==='ok');
  if(!await health()){
    if(!existsSync(resolve(backend,'dist/src/main.js')))throw Error('Chạy npm run build trong soma_be trước.');
    await until(health,run(['dist/src/main.js'],backend),'API');
  }
  const gateway=()=>json(`${api}/mobile/bootstrap`).then(value=>value?.schemaVersion===2);
  if(!await gateway())await until(gateway,run(['scripts/share-preview.mjs'],root),'Mobile gateway');
  const capability=await json(`${api}/auth/mobile/capabilities?returnUrl=${encodeURIComponent(url+'/oauth')}`);
  if(!capability?.returnAllowed||!capability?.mobileOAuth)throw Error('API đang chạy chưa nhận callback Expo laptop. Khởi động lại soma_be với DESKTOP_OAUTH_API_URL=http://localhost:4000/api và MOBILE_OAUTH_RETURN_URLS=http://localhost:8082/oauth.');
  if(process.argv.includes('--api-only')){
    console.log('Soma local API and mobile gateway are ready.');
  }else{
  let expo=await manifest();
  if(!expo){
    const child=run(['node_modules/expo/bin/cli','start','--localhost','--port','8082','--clear'],root);
    await until(async()=>{expo=await manifest();return !!expo;},child,'Expo');
  }
  if(expo?.extra?.expoClient?.slug!=='soma-mobile'||expo?.extra?.expoClient?.extra?.apiUrl!==api)throw Error('Cổng 8082 đang phục vụ cấu hình khác. Dừng phiên Expo đó rồi chạy lại.');
  mkdirSync(resolve(root,'qa/desktop'),{recursive:true});
  writeFileSync(resolve(root,'qa/desktop/connection.json'),JSON.stringify({url,api,mode:'expo-web',callback:'http://localhost:4000/api/auth/oauth/{provider}/callback',temporaryTunnelRequired:false},null,2));
  console.log(`\nSOMA · EXPO TRÊN LAPTOP\n${url}\nAPI nội bộ: ${api}\nGiữ terminal mở khi dùng. Ctrl+C để dừng các dịch vụ do terminal này khởi động.\n`);
  if(process.argv.includes('--open'))openApp();
  }
  // An existing Expo session is reused, never stopped or reconfigured here.
  if(children.length===0)process.exitCode=0;
}catch(error){stop();console.error(error.message);process.exitCode=1;}
