import http from "node:http";
import { createReadStream, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
const apk = resolve(
  process.env.SOMA_SHARE_APK || resolve(root, `builds/soma-${version}-preview.apk`),
);
const upstream = new URL("http://127.0.0.1:4000");
let metadata;
async function apkInfo() {
  try {
    const info = await stat(apk);
    if (!metadata || metadata.mtime !== info.mtimeMs) {
      const hash = createHash("sha256");
      for await (const chunk of createReadStream(apk)) hash.update(chunk);
      metadata = {
        bytes: info.size,
        sha256: hash.digest("hex"),
        mtime: info.mtimeMs,
      };
    }
    return metadata;
  } catch {
    return null;
  }
}
// Explicitly expose only the mobile app's routes. Admin, documents, Swagger,
// arbitrary files and unrelated web API routes never reach the backend.
export function allowed(method, pathname) {
  if (method === "GET" || method === "HEAD")
    return [
      /^\/api\/mobile\/(bootstrap|due)$/,
      /^\/api\/mobile\/models\/(ban-tay|giai-phau-tim|giai-phau-phoi|giai-phau-gan|than-nao-day-so)\/file$/,
      /^\/api\/mobile\/viewer\/(ban-tay|giai-phau-tim|giai-phau-phoi|giai-phau-gan|than-nao-day-so)$/,
      /^\/api\/mobile\/runtime\/(viewer\.js|draco_decoder\.(js|wasm)|draco_wasm_wrapper\.js)$/,
      /^\/api\/auth\/(me|capabilities)$/,
      /^\/api\/auth\/mobile\/capabilities$/,
      /^\/api\/auth\/oauth\/(google|github|facebook)\/callback$/,
      /^\/api\/study\/(history|path)$/,
    ].some((pattern) => pattern.test(pathname));
  if (method === "POST")
    return /^\/api\/(mobile\/attempts|auth\/(register|login|logout|forgot-password|mobile\/exchange|mobile\/oauth\/(google|github|facebook)))$/.test(
      pathname,
    );
  if (method === "PATCH") return pathname === "/api/auth/profile";
  if (method === "PUT") return pathname === "/api/study/path";
  return false;
}
const limits = new Map();
function throttled(pathname) {
  if (!/^\/api\/auth\/(register|login|forgot-password|mobile\/exchange|mobile\/oauth\/(google|github|facebook))$/.test(pathname))
    return false;
  const duration = pathname.endsWith("forgot-password") ? 3600000 : 60000;
  const maximum = pathname.endsWith("forgot-password") ? 3 : 12;
  const now = Date.now(),
    previous = limits.get(pathname);
  const bucket =
    previous && previous.until > now
      ? previous
      : { count: 0, until: now + duration };
  limits.set(pathname, bucket);
  return ++bucket.count > maximum;
}
function page(info) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Tải Soma cho Android</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#18232e;font:16px/1.6 system-ui,sans-serif}main{max-width:540px;margin:7vh auto;padding:28px}header{font-size:38px;letter-spacing:-2px;font-weight:750}header span{color:#235bc0}small{color:#667180;letter-spacing:1px}h1{font-size:30px;line-height:1.2;margin-top:40px}p{color:#596575}.button{display:block;background:#235bc0;color:white;padding:16px;border-radius:12px;text-align:center;text-decoration:none;font-weight:600;margin:28px 0}section{border-top:1px solid #dfe5ea;margin-top:28px;padding-top:20px}code{overflow-wrap:anywhere;font-size:11px;color:#667180}li{margin:10px 0}
  </style></head><body><main><header>soma<span>.</span></header><small>ANDROID · BẢN THỬ NGHIỆM ${version}</small><h1>Học giải phẫu<br>trên điện thoại.</h1><p>Atlas 3D, luyện tập và tiến độ học trong cùng một ứng dụng.</p>
  ${info ? `<a class="button" href="/soma.apk">Tải APK · ${(info.bytes / 1048576).toFixed(1)} MB</a>` : `<p>Đang chuẩn bị bản APK mới. Vui lòng tải lại trang sau.</p>`}
  <section><strong>Cài trên điện thoại Android</strong><ol><li>Mở trang này bằng trình duyệt trên điện thoại.</li><li>Tải và mở file APK. Nếu Android yêu cầu, cho phép trình duyệt cài ứng dụng này.</li><li>Mở Soma. Địa chỉ máy chủ đã được cấu hình trong bản tải tại đây.</li></ol><p>Đây là bản cài thử ký bằng khóa debug. Link và kết nối máy chủ phụ thuộc vào máy tính chia sẻ đang chạy; chưa phải dịch vụ hoạt động liên tục.</p></section>
  ${info ? `<section><small>SHA-256</small><p><code>${info.sha256}</code></p></section>` : ""}</main></body></html>`;
}
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  const url = new URL(req.url || "/", "http://localhost");
  try {
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      url.pathname === "/"
    ) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; frame-ancestors 'none'",
      );
      res.end(req.method === "HEAD" ? undefined : page(await apkInfo()));
      return;
    }
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      url.pathname === "/health"
    ) {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ready: Boolean(await apkInfo()),
          service: "soma-mobile-preview",
        }),
      );
      return;
    }
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      url.pathname === "/soma.apk"
    ) {
      const info = await apkInfo();
      if (!info) {
        res.writeHead(503).end("APK is being prepared");
        return;
      }
      let start = 0,
        end = info.bytes - 1;
      if (req.headers.range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
        if (!match || Number(match[1]) >= info.bytes) {
          res
            .writeHead(416, { "Content-Range": `bytes */${info.bytes}` })
            .end();
          return;
        }
        start = Number(match[1]);
        end = match[2] ? Math.min(Number(match[2]), end) : end;
        if (end < start) {
          res.writeHead(416).end();
          return;
        }
        res.statusCode = 206;
        res.setHeader("Content-Range", `bytes ${start}-${end}/${info.bytes}`);
      }
      res.setHeader("Content-Type", "application/vnd.android.package-archive");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="soma-${version}-preview.apk"`,
      );
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", end - start + 1);
      res.setHeader("ETag", `"${info.sha256}"`);
      if (req.method === "HEAD") res.end();
      else await pipeline(createReadStream(apk, { start, end }), res);
      return;
    }
    if (!allowed(req.method, url.pathname)) {
      res.writeHead(404).end("Not found");
      return;
    }
    if (throttled(url.pathname)) {
      res.writeHead(429, { "Retry-After": "60" }).end("Try again later");
      return;
    }
    if (Number(req.headers["content-length"] || 0) > 65536) {
      res.writeHead(413).end();
      return;
    }
    const body = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 65536) {
        res.writeHead(413).end();
        return;
      }
      body.push(chunk);
    }
    const headers = {};
    for (const key of ["authorization", "content-type", "accept", "user-agent"])
      if (req.headers[key]) headers[key] = req.headers[key];
    const request = http.request(
      new URL(url.pathname + url.search, upstream),
      { method: req.method, headers, timeout: 45000 },
      (response) => {
        for (const key of [
          "content-type",
          "content-length",
          "content-security-policy",
          "cache-control",
          "etag",
          "location",
        ])
          if (response.headers[key]) res.setHeader(key, response.headers[key]);
        res.writeHead(response.statusCode || 502);
        response.pipe(res);
        res.on("close", () => response.destroy());
      },
    );
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.on("error", () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    res.on("close", () => request.destroy());
    request.end(body.length ? Buffer.concat(body) : undefined);
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  server.listen(8083, "127.0.0.1", () =>
    console.log("Mobile-only share gateway: http://127.0.0.1:8083"),
  );
