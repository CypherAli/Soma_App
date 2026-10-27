const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const manifest = await (await fetch('http://127.0.0.1:8081', { headers: { 'expo-platform': 'android' } })).json();
  const bundle = new URL(manifest.launchAsset.url); bundle.hostname = '127.0.0.1';
  const response = await fetch(bundle, { headers: { Accept: 'multipart/mixed', 'Accept-Encoding': 'gzip' }, signal: AbortSignal.timeout(45000) });
  const bytes = (await response.arrayBuffer()).byteLength;
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/javascript/);
  assert.equal(response.headers.get('transfer-encoding'), null);
  assert.equal(response.headers.get('content-encoding'), null);
  assert.equal(Number(response.headers.get('content-length')), bytes);
  assert.ok(bytes > 1000);
  const output = path.resolve(__dirname, '../qa/expo'); fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'transport-report.json'), JSON.stringify({ passed: true, bytes, hostUri: manifest.extra?.expoClient?.hostUri, checks: ['Android manifest', 'multipart request returns normal JS', 'exact Content-Length', 'no gzip or chunked response'] }, null, 2));
  console.log('PASS: Expo Go Android bundle transport, exact Content-Length, no multipart/chunked response');
})().catch(error => { console.error(error); process.exitCode = 1; });
