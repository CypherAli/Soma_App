// Local integration QA. Uses a dedicated temporary account and removes it in finally.
const { launchBrowser } = require("./qa-browser.cjs");
const { createRequire } = require("node:module");
const { randomUUID, randomBytes } = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const backend = createRequire(
  path.resolve(__dirname, "../../soma_be/package.json"),
);
backend("dotenv").config({
  path: path.resolve(__dirname, "../../soma_be/.env"),
  quiet: true,
});
const { Client } = backend("pg");
const api = "http://127.0.0.1:8083/api",
  site = "http://localhost:8082";
const output = path.resolve(__dirname, "../qa/learning");
fs.mkdirSync(output, { recursive: true });

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const browser = await launchBrowser();
  let account;
  const email = `qa-learning-${randomUUID()}@example.invalid`,
    password = `Qa9${randomBytes(12).toString("hex")}`;
  const checks = [],
    errors = [];
  const page = await browser.newPage({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  page.setDefaultTimeout(45000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  const button = (name) => page.getByRole("button", { name, exact: true });
  const text = (value) => page.getByText(value, { exact: true });
  try {
    const registration = await fetch(api + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "QA Learning", email, password }),
    });
    assert.equal(registration.status, 201);
    account = await registration.json();
    const catalogue = await fetch(api + "/mobile/bootstrap").then((response) =>
      response.json(),
    );
    await page.goto(site + "/auth?next=review");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await button("Đăng nhập").last().click();
    await button("Bắt đầu luyện tập").waitFor();
    const submissions = [];
    await page.route(api + "/mobile/attempts", async (route) => {
      submissions.push(route.request().postDataJSON());
      if (submissions.length === 1)
        await route.fulfill({
          status: 503,
          json: { message: "QA: hãy gửi lại kết quả." },
        });
      else await route.continue();
    });
    await button("Bắt đầu luyện tập").click();
    for (let index = 0; index < 10; index++) {
      await text(`${index + 1} / 10`).waitFor();
      const active = await page.evaluate(() => {
        const key = Object.keys(localStorage).find(
          (key) =>
            key.startsWith("soma.private.v1:") &&
            !key.endsWith(":source-draft") &&
            JSON.parse(localStorage.getItem(key))?.draft?.questions,
        );
        const draft = JSON.parse(localStorage.getItem(key)).draft;
        return draft.questions[draft.index];
      });
      const question = catalogue.questions.find(
        (question) =>
          question.itemKey === active.itemKey &&
          question.version === active.version,
      );
      assert.ok(question, "Question key/version is published in the catalogue");
      const option = question.options.find((option) =>
        index === 0
          ? option.id !== question.correctOptionId
          : option.id === question.correctOptionId,
      );
      await text(option.text).click();
      await button("Xác nhận đáp án").click();
      await text(question.explanation).waitFor();
      await button(
        index === 9 ? "Hoàn thành bài làm" : "Câu tiếp theo",
      ).click();
      if (index === 1) {
        await button("Lưu bài và quay lại").click();
        await button("Tiếp tục bài đang làm · 2/10").click();
      }
    }
    await text("QA: hãy gửi lại kết quả.").waitFor();
    await button("Lưu kết quả lên tài khoản").click();
    await page
      .getByRole("heading", { name: "Đã đồng bộ", exact: true })
      .waitFor();
    assert.equal(submissions.length, 2);
    assert.deepEqual(submissions[0], submissions[1]);
    const history = await fetch(api + "/study/history", {
      headers: { Authorization: `Bearer ${account.token}` },
    }).then((response) => response.json());
    assert.equal(history.attempts.length, 1);
    assert.equal(history.attempts[0].score, 9);
    checks.push(
      "10-question practice, resume draft, real grading 9/10, identical retry and one history record",
    );
    await page.screenshot({ path: path.join(output, "model-result.png") });

    await page.goto(site + "/sources");
    await button("10").click();
    await button("Quiz").click();
    await page
      .getByRole("button", { name: /câu hỏi$/ })
      .first()
      .click();
    await page.waitForFunction(() =>
      Object.keys(localStorage).some(
        (key) =>
          key.endsWith(":source-draft") &&
          JSON.parse(localStorage.getItem(key))?.bank,
      ),
    );
    const draft = await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem(
          Object.keys(localStorage).find((key) =>
            key.endsWith(":source-draft"),
          ),
        ),
      ),
    );
    assert.ok(
      draft.bank.questions.length > 0 && draft.bank.questions.length <= 10,
    );
    for (let index = 0; index < draft.bank.questions.length; index++) {
      const question = draft.bank.questions[index];
      await text(question.stem).waitFor();
      for (const optionId of question.answers) {
        const option = question.options.find(
          (option) => option.id === optionId,
        );
        if (option) await text(`${option.id}. ${option.text}`).click();
      }
      if (index < draft.bank.questions.length - 1)
        await button("Câu tiếp").click();
    }
    await button("Nộp bài").click();
    await text("Đã đồng bộ").waitFor();
    assert.equal(
      /dr[.\s]*l[âa]m/i.test(await page.locator("body").innerText()),
      false,
    );
    checks.push(
      "Published source quiz, multiple-answer selection, real submission and neutral source labels",
    );
    await page.screenshot({ path: path.join(output, "source-result.png") });

    await page.goto(site + "/assistant");
    await page
      .getByLabel("Hỏi Soma", { exact: true })
      .fill("Xương đùi gồm những phần nào?");
    const reply = page.waitForResponse(
      (response) =>
        response.url() === api + "/mobile/assistant" &&
        response.request().method() === "POST",
      { timeout: 80000 },
    );
    await button("Gửi").click();
    const response = await reply;
    assert.ok(response.status() >= 200 && response.status() < 300);
    const answer = await response.json();
    assert.ok(typeof answer.answer === "string" && answer.answer.length > 20);
    await text(answer.answer).waitFor();
    const raw = await page
      .locator('div[class*="css-view"]')
      .evaluateAll((nodes) =>
        nodes.flatMap((node) =>
          [...node.childNodes]
            .filter((child) => child.nodeType === Node.TEXT_NODE)
            .map((child) => child.textContent),
        ),
      );
    assert.deepEqual(raw, [], "Assistant footer contains no raw text nodes");
    await button("Xóa hội thoại").click();
    assert.equal(await text(answer.answer).count(), 0);
    checks.push(
      "Real assistant API/UI response, clear conversation, no raw text in native containers",
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, "report.json"),
      JSON.stringify({ passed: true, checks, errors }, null, 2),
    );
    console.log(checks);
  } catch (error) {
    await page
      .screenshot({ path: path.join(output, "failure.png") })
      .catch(() => {});
    console.error((await page.locator("body").innerText()).slice(-1800));
    throw error;
  } finally {
    await browser.close();
    if (account)
      await db.query("DELETE FROM users WHERE id=$1 AND email=$2", [
        account.user.id,
        email,
      ]);
    await db.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
