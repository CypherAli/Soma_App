import http from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export function createPreviewServer(directory) {
  const root = resolve(directory);
  return http.createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cache-Control", "no-store");
    if (!["GET", "HEAD"].includes(request.method)) {
      response.setHeader("Allow", "GET, HEAD");
      response.writeHead(405).end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
    } catch {
      response.writeHead(400).end();
      return;
    }
    const file = resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      if (pathname === "/_soma/health") {
        const metadata = JSON.parse(
          await readFile(resolve(root, "soma-preview.json"), "utf8"),
        );
        response.setHeader("Content-Type", MIME[".json"]);
        response.end(
          request.method === "HEAD"
            ? undefined
            : JSON.stringify({ service: "soma-desktop-preview", ...metadata }),
        );
        return;
      }
      let target = file;
      try {
        if (!(await stat(target)).isFile()) throw Error("not a file");
      } catch {
        if (extname(target)) {
          response.writeHead(404).end();
          return;
        }
        target = resolve(root, "index.html");
      }
      const info = await stat(target);
      response.setHeader(
        "Content-Type",
        MIME[extname(target)] || "application/octet-stream",
      );
      response.setHeader("Content-Length", info.size);
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      const stream = createReadStream(target);
      response.on("close", () => stream.destroy());
      stream.on("error", () => response.destroy()).pipe(response);
    } catch {
      response.writeHead(500).end();
    }
  });
}
