import { createServer } from "node:http";
import { createReadStream, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

// Download only: no API forwarding, directory serving, authentication or user data.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
);
const filename = `soma-${version}-preview.apk`;
const file = resolve(root, "builds", filename);
const info = await stat(file);
const hash = createHash("sha256");
for await (const chunk of createReadStream(file)) hash.update(chunk);
const sha256 = hash.digest("hex");
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tải Soma ${version}</title><style>body{margin:0;background:#f8faf8;color:#193c35;font:16px/1.65 system-ui}main{max-width:520px;margin:5vh auto;padding:28px}h1{font-size:32px;line-height:1.2}a{display:block;background:#276750;color:#fff;padding:16px;border-radius:14px;text-align:center;text-decoration:none;font-weight:600}code{overflow-wrap:anywhere;font-size:11px}li{margin:12px 0}p{color:#52665f}</style><main><strong>soma.</strong><h1>Atlas giải phẫu<br>trên Android.</h1><p>Bản ${version} · ${(info.size / 1048576).toFixed(1)} MB · 149 mô hình đi kèm ứng dụng.</p><a href="/${filename}">Tải Soma ${version}</a><ol><li>Tải và mở file APK trên điện thoại.</li><li>Nếu Android hỏi, cho phép trình duyệt cài ứng dụng này.</li><li>Mở Soma và chọn Atlas để xem mô hình. Không cần Expo Go hoặc cáp USB.</li><li>Nếu mở file từ Zalo, chọn Lưu rồi mở bằng Quản lý tệp → Download/Zalo.</li></ol><p>Đây là APK thử nghiệm ký bằng khóa debug. Bản cài mới đã có máy chủ thử để đăng nhập email và đồng bộ. Có thể đổi máy chủ trong Cá nhân → Cài đặt. Trang này chỉ chia sẻ file cài đặt.</p><p>Link tải thử có thể hết hạn. Máy tính chia sẻ cần tiếp tục chạy.</p><small>SHA-256</small><p><code>${sha256}</code></p></main></html>`;

createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405).end();
    return;
  }
  const path = new URL(req.url, "http://localhost").pathname;
  if (path === "/") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    );
    res.end(req.method === "HEAD" ? undefined : html);
    return;
  }
  if (path === "/soma.apk.sha256") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(req.method === "HEAD" ? undefined : `${sha256}  ${filename}\n`);
    return;
  }
  if (path !== "/soma.apk" && path !== `/${filename}`) {
    res.writeHead(404).end();
    return;
  }
  let start = 0,
    end = info.size - 1;
  if (
    req.headers.range &&
    (!req.headers["if-range"] || req.headers["if-range"] === `"${sha256}"`)
  ) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
    if (!match || Number(match[1]) >= info.size) {
      res.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end();
      return;
    }
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), end) : end;
    if (end < start) {
      res.writeHead(416).end();
      return;
    }
    res.statusCode = 206;
    res.setHeader("Content-Range", `bytes ${start}-${end}/${info.size}`);
  }
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Length", end - start + 1);
  res.setHeader("ETag", `"${sha256}"`);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  try {
    await pipeline(createReadStream(file, { start, end }), res);
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
}).listen(8084, "127.0.0.1", () =>
  console.log(
    `APK-only download: http://127.0.0.1:8084 · ${filename} · ${sha256}`,
  ),
);
