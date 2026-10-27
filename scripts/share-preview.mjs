import http from "node:http";
import { createReadStream, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { gatewayTimeout } from "./lib/gateway-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
).version;
const apk = resolve(
  process.env.SOMA_SHARE_APK ||
    resolve(root, `builds/soma-${version}-preview.apk`),
);
const upstream = new URL("http://127.0.0.1:4000");
const webOrigins = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:8082",
  "http://127.0.0.1:8082",
  ...(process.env.SOMA_MOBILE_WEB_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
]);
let publicApi = "";
if (process.env.SOMA_SHARE_PUBLIC_URL) {
  const base = new URL(process.env.SOMA_SHARE_PUBLIC_URL);
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/"
  )
    throw Error("SOMA_SHARE_PUBLIC_URL must be a public HTTPS origin.");
  publicApi = base.origin + "/api";
}
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
  if (method === "GET" || method === "HEAD") {
    const match = pathname.match(
      /^\/api\/mobile\/(?:models\/([a-z0-9-]+)\/file|viewer\/([a-z0-9-]+)|assets\/([a-f0-9]{24}\.[a-z0-9]+))$/,
    );
    if (match) {
      try {
        const manifest = JSON.parse(
          readFileSync(
            resolve(root, "../soma_be/resources/mobile/manifest.json"),
            "utf8",
          ),
        );
        return match[3]
          ? Object.hasOwn(manifest.assets ?? {}, match[3])
          : manifest.models.some(
              (model) => model.id === (match[1] || match[2]),
            );
      } catch {
        return false;
      }
    }
  }
  if (method === "GET" || method === "HEAD")
    return [
      /^\/api\/mobile\/(bootstrap|due|sources|sources\/[a-zA-Z0-9-]+|source-images\/[a-f0-9]{20}\.webp)$/,
      /^\/api\/mobile\/runtime\/(viewer\.js|draco_decoder\.(js|wasm)|draco_wasm_wrapper\.js)$/,
      /^\/api\/mobile\/account(?:\/sessions)?$/,
      /^\/api\/auth\/(me|capabilities)$/,
      /^\/api\/auth\/mobile\/capabilities$/,
      /^\/api\/auth\/oauth\/(google|github|facebook)\/callback$/,
      /^\/api\/study\/(history|path)$/,
    ].some((pattern) => pattern.test(pathname));
  if (method === "POST")
    return /^\/api\/(mobile\/(attempts|source-attempts|assistant|account\/password)|auth\/(register|login|logout|forgot-password|mobile\/exchange|mobile\/oauth\/(google|github|facebook)(?:\/link)?))$/.test(
      pathname,
    );
  if (method === "PATCH") return pathname === "/api/auth/profile";
  if (method === "DELETE")
    return /^\/api\/mobile\/account\/(?:sessions\/(?:others|[a-zA-Z0-9-]{1,80})|connections\/(?:google|github|facebook))$/.test(
      pathname,
    );
  if (method === "PUT") return pathname === "/api/study/path";
  return false;
}
const limits = new Map();
function throttled(pathname) {
  if (
    !/^\/api\/auth\/(register|login|forgot-password|mobile\/exchange|mobile\/oauth\/(google|github|facebook)(?:\/link)?)$/.test(
      pathname,
    )
  )
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
  <section><strong>Cài trên điện thoại Android</strong><ol><li>Tải và mở file APK. Nếu Android yêu cầu, cho phép trình duyệt cài ứng dụng này.</li><li>Mở Soma để xem Atlas. Không cần Expo Go hoặc cáp USB.</li><li>Để đăng nhập và đồng bộ, vào <strong>Cá nhân → Cài đặt → Địa chỉ API</strong>, dán địa chỉ bên dưới rồi chọn <strong>Lưu cài đặt</strong>.</li></ol>${publicApi ? `<p><strong>Địa chỉ API cho lần thử này</strong></p><input aria-label="Địa chỉ API" readonly value="${publicApi}" style="width:100%;padding:12px;border:1px solid #dfe5ea;border-radius:8px;font:13px system-ui;background:white;color:#18232e"><p>Chạm giữ địa chỉ để sao chép. Atlas dùng được khi mất máy chủ; tài khoản và đồng bộ cần kết nối này.</p>` : `<p>Địa chỉ API sẽ được gửi cùng link tải. Nhập trong Cài đặt để kết nối tài khoản.</p>`}<p>Đây là bản cài thử ký bằng khóa debug. Link tải và kết nối máy chủ chỉ hoạt động khi máy tính chia sẻ đang chạy.</p></section>
  ${info ? `<section><small>SHA-256</small><p><code>${info.sha256}</code></p></section>` : ""}</main></body></html>`;
}
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  const url = new URL(req.url || "/", "http://localhost");
  try {
    const origin = req.headers.origin;
    if (origin && webOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      const requested = req.headers["access-control-request-method"];
      const headers = String(
        req.headers["access-control-request-headers"] || "",
      )
        .toLowerCase()
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (
        !origin ||
        !webOrigins.has(origin) ||
        typeof requested !== "string" ||
        !allowed(requested, url.pathname) ||
        headers.some(
          (value) => !["content-type", "authorization"].includes(value),
        )
      ) {
        res.writeHead(403).end();
        return;
      }
      res.setHeader("Access-Control-Allow-Methods", requested);
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      res.setHeader("Access-Control-Max-Age", "600");
      res.writeHead(204).end();
      return;
    }
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
      if (
        req.headers.range &&
        (!req.headers["if-range"] ||
          req.headers["if-range"] === `"${info.sha256}"`)
      ) {
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
      { method: req.method, headers, timeout: gatewayTimeout(url.pathname) },
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
    request.on("error", (error) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      res.writeHead(error.message === "timeout" ? 504 : 502, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(
        JSON.stringify({
          message:
            url.pathname === "/api/mobile/assistant"
              ? "Trợ lý chưa kết nối được dịch vụ trả lời. Câu hỏi đã được giữ lại; hãy thử gửi lại sau."
              : "Chưa kết nối được máy chủ. Hãy kiểm tra dịch vụ local rồi thử lại.",
        }),
      );
    });
    res.on("close", () => request.destroy());
    request.end(body.length ? Buffer.concat(body) : undefined);
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});
export { server as mobileShareServer };
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  server.listen(8083, "127.0.0.1", () =>
    console.log("Mobile-only share gateway: http://127.0.0.1:8083"),
  );
