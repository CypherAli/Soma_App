const { adb, nodes } = require('./expo-device.cjs');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PNG } = require('pngjs');
const device = process.env.ANDROID_QA_DEVICE || 'emulator-5554';
const output = path.resolve(__dirname, '../qa/expo'); fs.mkdirSync(output, { recursive: true });
const pause = ms => new Promise(done => setTimeout(done, ms));
const open = route => adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `exp://127.0.0.1:8081/--/${route}`, '-p', 'host.exp.exponent');
function tap(node) { const [x0,y0,x1,y1] = node.bounds; adb('shell', 'input', 'tap', String((x0+x1)>>1), String((y0+y1)>>1)); }
async function waitFor(find, label) {
  const end = Date.now() + 35000;
  while (Date.now() < end) { const node = nodes().find(find); if (node) return node; await pause(500); }
  throw Error('Timed out: ' + label);
}
async function setApi(value) {
  open('settings');
  const input = await waitFor(node => node.label === 'Địa chỉ API' && node.class === 'android.widget.EditText', 'API field');
  const previous = input.text;
  tap(input); adb('shell', 'input', 'keyevent', '123', ...Array(150).fill('67'));
  for (const char of value) { adb('shell', 'input', 'text', char); await pause(100); }
  adb('shell', 'input', 'keyevent', '4');
  tap(await waitFor(node => node.label === 'Lưu cài đặt' && node.class === 'android.widget.Button', 'save settings'));
  await waitFor(node => node.label === 'Đã lưu cài đặt.', 'saved settings');
  return previous;
}
(async () => {
  let previous;
  try {
    previous = await setApi('http://127.0.0.1:65534/api');
    assert.match(previous, /^https?:\/\//);
    open('atlas/giai-phau-gan');
    const ready = await waitFor(node => /^Cấu trúc \([1-9]\d*\)$/.test(node.label), 'offline native model');
    const adbPath = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
    const pixels = execFileSync(adbPath, ['-s', device, 'exec-out', 'screencap', '-p'], { windowsHide: true, timeout: 30000, maxBuffer: 12*1024*1024 });
    fs.writeFileSync(path.join(output, 'liver-no-backend.png'), pixels);
    const png = PNG.sync.read(pixels); let anatomyPixels = 0;
    for (let y=300; y<Math.min(1700,png.height); y++) for(let x=0;x<png.width;x++) {
      const offset=(y*png.width+x)*4, [r,g,b]=png.data.subarray(offset,offset+3);
      if(r>90 && r>g*1.04 && g>b*1.05) anatomyPixels++;
    }
    assert.ok(anatomyPixels > 5000, 'Visible anatomy, not an empty canvas');
    fs.writeFileSync(path.join(output, 'offline-report.json'), JSON.stringify({ passed:true, at:new Date().toISOString(), backend:'intentionally unreachable localhost port 65534', model:'giai-phau-gan', structures:ready.label, anatomyPixels, metroAssetCacheAvailable:true }, null, 2));
    console.log('PASS: Expo Go renders local 3D with an unreachable backend: ' + ready.label);
  } finally { if(previous) await setApi(previous); open(''); }
})().catch(error => { console.error(error.message); process.exitCode=1; });
