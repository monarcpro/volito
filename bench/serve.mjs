// A static server for the player bench that forbids HTTP caching, so every run loads its fonts cold.
//   node bench/serve.mjs [port=4631]   → http://localhost:4631/bench/
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = join(import.meta.dirname, "..");
const port = Number(process.argv[2] ?? 4631);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".ttf": "font/ttf", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };

// Bytes served since the last /__stats: fonts apart from everything else (the bench reads it per run).
let stats = { fontFiles: 0, fontBytes: 0, otherBytes: 0 };

createServer((req, res) => {
  if (req.url === "/__stats") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }).end(JSON.stringify(stats));
    stats = { fontFiles: 0, fontBytes: 0, otherBytes: 0 };
    return;
  }
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(root, path);
  try {
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    statSync(file);
  } catch {
    res.writeHead(404, { "cache-control": "no-store" }).end("not found");
    return;
  }
  const size = statSync(file).size;
  if (extname(file) === ".ttf") {
    stats.fontFiles++;
    stats.fontBytes += size;
  } else stats.otherBytes += size;
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`bench: http://localhost:${port}/bench/`));
