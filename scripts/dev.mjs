import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = resolve(root, "../soma_be");
const entries = Object.entries(networkInterfaces()).flatMap(
  ([name, addresses]) =>
    (addresses || [])
      .filter(
        (item) =>
          item.family === "IPv4" &&
          !item.internal &&
          !/warp|vEthernet|virtual|vpn|loopback/i.test(name),
      )
      .map((item) => ({ name, address: item.address })),
);
entries.sort(
  (a, b) =>
    Number(/wi-fi|wireless|wlan/i.test(b.name)) -
    Number(/wi-fi|wireless|wlan/i.test(a.name)),
);
const host = process.env.SOMA_LAN_HOST || entries[0]?.address;
if (!host)
  throw Error(
    "Không tìm được mạng LAN. Đặt SOMA_LAN_HOST hoặc dùng máy chủ HTTPS đã triển khai.",
  );
const api = process.env.EXPO_PUBLIC_API_URL || `http://${host}:4000/api`;
const port = Number(process.env.SOMA_EXPO_PORT || 8081);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw Error("SOMA_EXPO_PORT không hợp lệ.");
const returns = [
  `exp://${host}:${port}/--/oauth`,
  `exp://127.0.0.1:${port}/--/oauth`,
  `exp://10.0.2.2:${port}/--/oauth`,
];
const env = {
  ...process.env,
  EXPO_PUBLIC_API_URL: api,
  REACT_NATIVE_PACKAGER_HOSTNAME: host,
  MOBILE_OAUTH_RETURN_URLS: [process.env.MOBILE_OAUTH_RETURN_URLS, ...returns]
    .filter(Boolean)
    .join(","),
};
const backendRequire = createRequire(resolve(backend, "package.json"));
const backendEnvFile = resolve(backend, ".env");
const backendEnv = existsSync(backendEnvFile)
  ? backendRequire("dotenv").parse(readFileSync(backendEnvFile))
  : {};
const callbackApi =
  process.env.MOBILE_OAUTH_API_URL ?? backendEnv.MOBILE_OAUTH_API_URL;
if (callbackApi && /\.trycloudflare\.com(?:\/|$)/.test(callbackApi)) {
  let reachable = false;
  try {
    const response = await fetch(
      callbackApi.replace(/\/$/, "") + "/mobile/bootstrap",
      { signal: AbortSignal.timeout(5000) },
    );
    reachable = response.ok && (await response.json()).schemaVersion === 2;
  } catch {}
  if (!reachable) {
    env.MOBILE_OAUTH_API_URL = "";
    console.log(
      "Callback OAuth dùng tunnel cũ đã ngừng hoạt động. Email vẫn dùng được; Google cần máy chủ HTTPS cố định.",
    );
  }
}
const children = [];
function run(args, cwd) {
  const child = spawn(process.execPath, args, {
    cwd,
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  children.push(child);
  child.on("error", (error) => console.error(error.message));
  return child;
}
async function health() {
  try {
    const response = await fetch("http://127.0.0.1:4000/api/health", {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok && (await response.json()).status === "ok";
  } catch {
    return false;
  }
}
if (!(await health())) {
  if (!existsSync(resolve(backend, "dist/src/main.js")))
    throw Error("Chạy npm run build trong soma_be trước khi khởi động.");
  const child = run(["dist/src/main.js"], backend);
  for (let attempt = 0; attempt < 20 && !(await health()); attempt++) {
    if (child.exitCode !== null)
      throw Error("Backend không khởi động được. Xem lỗi phía trên.");
    await new Promise((done) => setTimeout(done, 1000));
  }
  if (!(await health()))
    throw Error("Backend chưa sẵn sàng sau 20 giây. Kiểm tra PostgreSQL.");
} else
  console.log(
    "Dùng backend đang chạy. Nếu đổi callback Expo Go, cần khởi động lại backend với MOBILE_OAUTH_RETURN_URLS mới.",
  );
if (!existsSync(resolve(root, "assets/offline/catalogue.json")))
  throw Error("Chạy npm run prepare:offline để chuẩn bị Atlas trên thiết bị.");
console.log(
  `\nSoma Expo Go · Wi-Fi: ${host}\nAPI: ${api}\nCallback Expo Go: ${returns[0]}\n`,
);
const expo = run(
  [
    "node_modules/expo/bin/cli",
    "start",
    "--lan",
    "--port",
    String(port),
    ...process.argv.slice(2),
  ],
  root,
);
function stop() {
  for (const child of children) if (child.exitCode === null) child.kill();
}
process.on("SIGINT", () => {
  stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});
expo.on("exit", (code) => {
  stop();
  process.exitCode = code || 0;
});
