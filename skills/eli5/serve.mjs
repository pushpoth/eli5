#!/usr/bin/env node
/**
 * A tiny static server for local viewing, with no dependencies.
 *
 *   node serve.mjs [port]        serves this folder on http://localhost:4321
 *
 * Open the built page, e.g. http://localhost:4321/eli5-board.html. It prints
 * every .html it finds so you know what to open.
 */
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.argv[2] ?? 4321);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0]));
  if (path.includes("..")) { res.writeHead(403).end("no"); return; }
  const file = join(ROOT, path === "/" ? "/index.html" : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

server.listen(PORT, async () => {
  const pages = (await readdir(ROOT).catch(() => [])).filter((f) => f.endsWith(".html"));
  console.log(`eli5 serving ${ROOT} on http://localhost:${PORT}`);
  for (const p of pages) console.log(`  http://localhost:${PORT}/${p}`);
});
