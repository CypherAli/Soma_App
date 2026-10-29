import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const appRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const backendRoot = resolve(appRoot, "../soma_be");
export const previewUrl = "http://localhost:8082";
export const mobileApiUrl = "http://127.0.0.1:8083/api";
export const desktopWebRoot = resolve(appRoot, "builds/desktop-web");

export async function readHealth(url, timeoutMs = 3000) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export function openDesktopWindow() {
  const browser = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find(existsSync);
  if (!browser) {
    console.log(`Mở trình duyệt tại ${previewUrl}`);
    return;
  }
  spawn(browser, [`--app=${previewUrl}`, "--window-size=620,980"], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  }).unref();
}
