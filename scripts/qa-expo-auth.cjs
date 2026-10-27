const { adb, nodes } = require('./expo-device.cjs');
const { randomBytes } = require('node:crypto');
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const backend = createRequire(path.resolve(__dirname, '../../soma_be/package.json'));
backend('dotenv').config({ path: path.resolve(__dirname, '../../soma_be/.env'), quiet: true });
const { Client } = backend('pg');
const email = `expo-${randomBytes(5).toString('hex')}@example.invalid`, password = `ExpoQa9${randomBytes(6).toString('hex')}`;
const output = path.resolve(__dirname, '../qa/expo'); fs.mkdirSync(output, { recursive: true });
const pause = ms => new Promise(done => setTimeout(done, ms));
const open = route => adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `exp://127.0.0.1:8081/--/${route}`, '-p', 'host.exp.exponent');
async function waitFor(find, label) {
  const end = Date.now() + 30000;
  while (Date.now() < end) {
    const current = nodes(), node = current.find(find);
    if (node) return node;
    const error = current.find(node => /Không kết nối|chưa phản hồi/.test(node.label));
    if (error) throw Error(error.label);
    await pause(500);
  }
  throw Error('Timed out: ' + label);
}
function tap(node) { const [x0,y0,x1,y1] = node.bounds; adb('shell', 'input', 'tap', String((x0+x1)>>1), String((y0+y1)>>1)); }
async function fill(label, value) {
  tap(await waitFor(node => node.label === label && node.class === 'android.widget.EditText', label));
  for (const char of value) { adb('shell', 'input', 'text', char); await pause(110); }
  adb('shell', 'input', 'keyevent', '4');
}
(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  let userId;
  try {
    const response = await fetch('http://127.0.0.1:4000/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Expo QA', email, password }) });
    if (response.status !== 201) throw Error('QA registration failed: ' + response.status);
    userId = (await response.json()).user.id;
    open('auth?next=profile');
    await fill('Email', email); await fill('Mật khẩu', password);
    const submit = nodes().filter(node => node.label === 'Đăng nhập' && node.class === 'android.widget.Button').at(-1);
    if (!submit) throw Error('Missing native login button'); tap(submit);
    await waitFor(node => node.label === email, 'native account after login');
    console.log('PASS: native email login in Expo Go');
    adb('shell', 'am', 'force-stop', 'host.exp.exponent'); open('profile');
    await waitFor(node => node.label === email, 'SecureStore session after process restart');
    console.log('PASS: Expo Go SecureStore session survives process restart');
    fs.writeFileSync(path.join(output, 'auth-report.json'), JSON.stringify({ passed: true, at: new Date().toISOString(), checks: ['native controlled email/password fields', 'real backend login', 'profile destination', 'SecureStore persistence after force-stop'], providerLoginTested: false }, null, 2));
    const logout = nodes().find(node => node.label === 'Đăng xuất');
    if (logout) { tap(logout); await pause(600); const confirm = nodes().find(node => node.class === 'android.widget.Button' && node.label.toLocaleLowerCase('vi') === 'đăng xuất'); if (confirm) tap(confirm); }
  } catch (error) {
    fs.writeFileSync(path.join(output, 'auth-report.json'), JSON.stringify({ passed: false, error: error.message }, null, 2)); throw error;
  } finally {
    if (userId) await db.query('DELETE FROM users WHERE id=$1 AND email=$2', [userId, email]);
    await db.end(); open('');
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
