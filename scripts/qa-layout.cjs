// Local integration QA: temporary accounts are scoped and removed in finally.
const { launchBrowser } = require("./qa-browser.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const out = "qa/presentation";
(async () => {
  fs.mkdirSync("qa/polish", { recursive: true });
  fs.mkdirSync("qa/presentation", { recursive: true });
  const browser = await launchBrowser(),
    results = [],
    errors = [];
  try {
    for (const language of ["vi", "en"]) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      await context.addInitScript(
        ({ language }) =>
          localStorage.setItem(
            "soma.preferences.v1",
            JSON.stringify({
              apiUrl: "http://127.0.0.1:8083/api",
              appearance: "system",
              language,
            }),
          ),
        { language },
      );
      const page = await context.newPage();
      // Keep only the published model from the reported screenshot in this QA catalogue.
      await page.route(
        "http://127.0.0.1:8083/api/mobile/bootstrap",
        async (route) => {
          const response = await route.fetch(),
            data = await response.json();
          data.models = data.models.filter(
            (model) => model.id === "mat-cat-ngang-bung",
          );
          await route.fulfill({ response, json: data });
        },
      );
      page.setDefaultTimeout(45000);
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await page.goto("http://localhost:8082/", { waitUntil: "networkidle" });
      const hero = page.getByRole("button", { name: /Mở Atlas ·/ });
      await hero.waitFor();
      await hero
        .locator("img")
        .evaluateAll((images) =>
          Promise.all(images.map((image) => image.decode())),
        );
      for (const colorScheme of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme });
        for (const width of [320, 360, 390, 414]) {
          await page.setViewportSize({ width, height: 844 });
          const geometry = await hero.evaluate((el) => {
            const image = el.querySelector("img");
            let clip = image.parentElement;
            while (
              clip &&
              clip !== el &&
              !(
                getComputedStyle(clip).overflow === "hidden" &&
                clip.offsetHeight === 210 &&
                getComputedStyle(clip).transform === "none"
              )
            )
              clip = clip.parentElement;
            const card = el.getBoundingClientRect(),
              art = clip.getBoundingClientRect();
            const texts = [
              ...el.querySelectorAll('div[class*="css-text"]'),
            ].filter((node) => node.textContent.trim());
            const invalid = texts
              .filter((node) => {
                const r = node.getBoundingClientRect();
                return (
                  r.left < card.left - 1 ||
                  r.right > card.right + 1 ||
                  r.top < card.top - 1 ||
                  r.bottom > card.bottom + 1 ||
                  node.scrollWidth > node.clientWidth + 1 ||
                  node.scrollHeight > node.clientHeight + 1
                );
              })
              .map((node) => node.textContent);
            return {
              invalid,
              clippedArtwork: getComputedStyle(clip).overflow === "hidden",
              overlaps: texts
                .filter((node) => {
                  const r = node.getBoundingClientRect();
                  return r.top < art.bottom && r.bottom > art.top;
                })
                .map((node) => node.textContent),
              documentOverflow:
                document.documentElement.scrollWidth > innerWidth,
            };
          });
          assert.deepEqual(
            geometry.invalid,
            [],
            `${language}/${colorScheme}/${width}: all card text fits`,
          );
          assert.deepEqual(
            geometry.overlaps,
            [],
            `Artwork is separate from labels`,
          );
          assert.equal(geometry.documentOverflow, false);
          assert.equal(geometry.clippedArtwork, true);
          results.push({
            screen: "home",
            language,
            colorScheme,
            width,
            ...geometry,
          });
          if (width === 390)
            await page.screenshot({
              path: `${out}/home-polish-${language}-${colorScheme}.png`,
            });
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await hero.click();
      const tools = page.getByRole("button", {
        name: "Tách mô hình",
        exact: true,
      });
      await tools.waitFor();
      await tools.click();
      for (const colorScheme of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme });
        for (const width of [320, 360, 390, 414]) {
          await page.setViewportSize({ width, height: 844 });
          // View controls retain descriptive accessibility names; text is localized separately.
          const viewButtons = page.getByRole("button", {
            name: /^Nhìn (trước|sau|bên|góc chéo|trên|dưới)$/,
          });
          assert.equal(await viewButtons.count(), 6);
          await viewButtons.first().scrollIntoViewIfNeeded();
          const geometry = await viewButtons.evaluateAll((nodes) =>
            nodes.map((node) => {
              const r = node.getBoundingClientRect(),
                text = node.querySelector('[dir="auto"]');
              const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
              return {
                label: text.textContent,
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height,
                oneLine: text.getBoundingClientRect().height <= lineHeight + 2,
                unclipped: text.scrollWidth <= text.clientWidth + 1,
                inside: r.left >= 0 && r.right <= innerWidth,
              };
            }),
          );
          assert.ok(
            geometry.every(
              (r) => r.oneLine && r.unclipped && r.inside && r.height >= 44,
            ),
          );
          assert.equal(
            new Set(geometry.map((r) => Math.round(r.y))).size,
            2,
            "Six views occupy two rows",
          );
          results.push({
            screen: "views",
            language,
            colorScheme,
            width,
            geometry,
          });
          if (width === 390)
            await page.screenshot({
              path: `${out}/views-polish-${language}-${colorScheme}.png`,
            });
        }
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      `${out}/layout-polish-report.json`,
      JSON.stringify({ passed: true, results, errors }, null, 2),
    );
    console.log(
      `PASS: ${results.length} layout checks (VI/EN, light/dark, 320/360/390/414), no console errors`,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
