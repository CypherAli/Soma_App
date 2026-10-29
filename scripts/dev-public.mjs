import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  appendFileSync,
  readFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createServer } from "node:net";
const require = createRequire(import.meta.url);
const { writeExpoQR, printExpoQR } = require("./expo-qr.cjs");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const binary = join(root, "builds/tools/cloudflared.exe");
mkdirSync(join(root, "qa/expo"), { recursive: true });
const tunnelLog = join(root, "qa/expo/cloudflared.log");
writeFileSync(tunnelLog, "");
if (!existsSync(binary))
  throw Error("Thiếu cloudflared.exe trong builds/tools.");
try {
  const health = await fetch("http://127.0.0.1:4000/api/health", {
    signal: AbortSignal.timeout(3000),
  });
  if (!health.ok) throw Error("Backend chưa sẵn sàng");
} catch {
  throw Error(
    "Mở backend bằng npm start ở terminal thứ nhất trước khi chạy dev:public.",
  );
}
const port = 8090;
await new Promise((resolvePort, reject) => {
  const probe = createServer();
  probe.once("error", () =>
    reject(
      Error(`Cổng ${port} đang được dùng. Đóng phiên dev:public cũ trước.`),
    ),
  );
  probe.listen(port, "127.0.0.1", () => probe.close(resolvePort));
});
const tunnel = spawn(
  binary,
  [
    "tunnel",
    "--url",
    `http://127.0.0.1:${port}`,
    "--no-autoupdate",
    "--protocol",
    "http2",
    "--edge-ip-version",
    "4",
  ],
  { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
);
tunnel.stdout.on("data", (chunk) => appendFileSync(tunnelLog, chunk));
tunnel.stderr.on("data", (chunk) => appendFileSync(tunnelLog, chunk));
let expo;
function stop() {
  tunnel.kill();
  if (expo && expo.exitCode === null) expo.kill();
}
process.on("SIGINT", () => {
  stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});
try {
  const base = await new Promise((resolveUrl, reject) => {
    const timeout = setTimeout(
      () => reject(Error("Không mở được tunnel sau 45 giây.")),
      45000,
    );
    const receive = (chunk) => {
      const text = chunk.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        clearTimeout(timeout);
        resolveUrl(match[0]);
      }
    };
    tunnel.stdout.on("data", receive);
    tunnel.stderr.on("data", receive);
    tunnel.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    tunnel.on("exit", (code) => {
      clearTimeout(timeout);
      reject(Error(`Tunnel dừng: ${code}`));
    });
  });
  const url = base.replace("https://", "exps://");
  const output = join(root, "qa/expo");
  mkdirSync(output, { recursive: true });
  expo = spawn(
    process.execPath,
    ["node_modules/expo/bin/cli", "start", "--lan", "--port", String(port)],
    {
      cwd: root,
      windowsHide: true,
      stdio: ["inherit", "pipe", "pipe"],
      env: {
        ...process.env,
        SOMA_EXPO_PORT: String(port),
        SOMA_DEV_API_PROXY: "1",
        EXPO_PACKAGER_PROXY_URL: base,
        EXPO_PUBLIC_API_URL: base + "/api",
      },
    },
  );
  expo.stdout.on("data", (chunk) => process.stdout.write(chunk));
  expo.stderr.on("data", (chunk) => process.stderr.write(chunk));
  expo.on("exit", (code) => {
    tunnel.kill();
    process.exitCode = code || 0;
  });
  let ready = false,
    lastProblem = "";
  for (let attempt = 0; attempt < 45 && !ready; attempt++) {
    if (expo.exitCode !== null) throw Error("Expo chưa khởi động được.");
    try {
      const response = await fetch(`http://127.0.0.1:${port}`, {
        headers: {
          "expo-platform": "android",
          accept: "application/expo+json",
        },
        signal: AbortSignal.timeout(3000),
      });
      lastProblem = `HTTP ${response.status}`;
      const manifest = await response.json();
      ready =
        response.ok &&
        new URL(manifest.launchAsset.url).origin === base &&
        manifest.extra?.expoClient?.extra?.apiUrl === base + "/api" &&
        readFileSync(tunnelLog, "utf8").includes(
          "Registered tunnel connection",
        );
      if (!ready)
        lastProblem += `: asset=${manifest.launchAsset?.url}, API=${manifest.extra?.expoClient?.extra?.apiUrl}`;
    } catch (error) {
      lastProblem = `${error.message} ${error.cause?.code || ""}`;
    }
    if (!ready) await new Promise((done) => setTimeout(done, 1000));
  }
  if (!ready)
    throw Error(
      `Tunnel chưa phục vụ được manifest Expo hợp lệ (${lastProblem}). Xem qa/expo/cloudflared.log.`,
    );
  writeExpoQR(url, join(output, "connect-qr.png"));
  writeFileSync(
    join(output, "public-connection.json"),
    JSON.stringify(
      { url, base, api: base + "/api", port, temporary: true, ready: true },
      null,
      2,
    ),
  );
  console.log(
    `\nEXPO GO ĐÃ SẴN SÀNG QUA INTERNET\n${url}\nQR: ${join(output, "connect-qr.png")}\nGiữ terminal này mở.\n`,
  );
  if (process.stdout.isTTY) printExpoQR(url);
} catch (error) {
  stop();
  console.error(error.message);
  process.exitCode = 1;
}
