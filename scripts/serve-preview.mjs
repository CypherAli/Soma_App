import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost"),
        file = resolve(root, "." + decodeURIComponent(url.pathname));
      if (file !== root && !file.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      let content;
      try {
        content = await readFile(file);
        res.setHeader(
          "Content-Type",
          mime[extname(file)] ?? "application/octet-stream",
        );
      } catch {
        if (extname(file)) {
          res.writeHead(404).end();
          return;
        }
        content = await readFile(resolve(root, "index.html"));
        res.setHeader("Content-Type", mime[".html"]);
      }
      res.setHeader("Cache-Control", "no-store");
      res.end(content);
    } catch {
      res.writeHead(500).end("Preview error");
    }
  })
  .listen(8082, "0.0.0.0", () =>
    console.log("Soma preview: http://localhost:8082"),
  );
