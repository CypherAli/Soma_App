const { launchBrowser } = require('./qa-browser.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.resolve(__dirname, '../qa/redesign');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await launchBrowser();
  try {
    for (const colorScheme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://localhost:8082/');
      await page.getByText('Khám phá cơ thể người', { exact: true }).waitFor();
      await page.waitForFunction(() => [...document.images].some(image => image.complete && image.naturalWidth > 0));
      assert.equal(await page.locator('iframe').count(), 0, 'Home does not load a second 3D renderer');
      await page.screenshot({ path: path.join(output, `home-${colorScheme}.png`) });
      await page.goto('http://localhost:8082/atlas');
      await page.getByLabel('Tìm trong Atlas').waitFor();
      await page.screenshot({ path: path.join(output, `atlas-${colorScheme}.png`) });
      await page.getByLabel('Tìm trong Atlas').fill('gan');
      await page.getByRole('button', { name: /Mở Giải phẫu Gan/ }).waitFor();
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Atlas does not overflow');
      }
      await page.goto('http://localhost:8082/auth');
      await page.getByLabel('Email', { exact: true }).waitFor();
      await page.screenshot({ path: path.join(output, `auth-${colorScheme}.png`), fullPage: true });
      assert.deepEqual(errors, []);
      await page.close();
    }
    const failed = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await failed.route('**/auth/mobile/capabilities?**', route => route.abort());
    await failed.goto('http://localhost:8082/auth');
    await failed.getByRole('button', { name: 'Không tải được phương thức đăng nhập · Thử lại', exact: true }).waitFor({ timeout: 8000 });
    await failed.getByRole('button', { name: 'Kiểm tra kết nối máy chủ', exact: true }).waitFor();
    await failed.screenshot({ path: path.join(output, 'auth-connection-error.png'), fullPage: true });
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ passed: true, at: new Date().toISOString(), checks: ['home/atlas/auth light and dark', 'local thumbnails', 'no home WebView', 'search liver', '320/390 no overflow', 'bounded capabilities failure and recovery actions'] }, null, 2));
    console.log('PASS: redesigned home/atlas/auth, thumbnails, search, compact layouts and failed-connection recovery');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
