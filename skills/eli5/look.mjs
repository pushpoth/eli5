#!/usr/bin/env node
/**
 * Gate 3, the look. `node look.mjs <figure.js> [--answer x,y] [--out sheet.png]`
 * runs the static check, builds the figure, loads eight views of it in headless
 * Chrome and photographs them onto one sheet, and prints each view's read-out.
 * It exits 1 when the figure is rejected, when no --answer is given (the
 * answering views are then at rest, which is not a finished look), or when an
 * answering view still reads `rest`.
 *
 * The checklist that cannot be automated is look.md. Chrome is found from
 * --chrome, CHROME_PATH, or Playwright's cache.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assemble, nameOf } from "./build.mjs";
import { validate } from "./validate.mjs";

// (--chrome is parsed inside findChrome; hoisted call below.)
const args = process.argv.slice(2);
const src = args.find((a) => !a.startsWith("-"));
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

function findChrome() {
  const c = arg("--chrome") ?? process.env.CHROME_PATH;
  if (c) return c;
  const cache = join(homedir(), ".cache", "ms-playwright");
  if (existsSync(cache)) for (const d of readdirSync(cache).filter((n) => n.startsWith("chromium-")))
    for (const p of [join(cache, d, "chrome-linux64", "chrome"), join(cache, d, "chrome-linux", "chrome")])if (existsSync(p)) return p;
  return null;
}
function dumpOut(chrome, url) {
  const dom = execFileSync(chrome, ["--headless=new", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=2500", "--dump-dom", url], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return (/<p id="out">([\s\S]*?)<\/p>/.exec(dom)?.[1] ?? "?").trim();
}

if (!src || src.startsWith("-")) { console.error("usage: node look.mjs <figure.js> [--answer x,y] [--chrome <path>] [--out sheet.png]"); process.exit(2); }
const figure = readFileSync(src, "utf8");
const problems = validate(figure);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); console.error(`${src}: the static check failed first.`); process.exit(1); }

const chrome = findChrome();
if (!chrome) { console.error("no Chrome found; pass --chrome <path> or set CHROME_PATH"); process.exit(2); }

const answer = arg("--answer");
if (!answer) console.error("no --answer: the answering views are taken at rest, which is not a finished look.");

const dir = mkdtempSync(join(tmpdir(), "eli5-look-"));
const name = nameOf(figure) ?? "figure";
const page = join(dir, `${name}.html`);
writeFileSync(page, assemble(figure));
const url = (q) => pathToFileURL(page).href + q;
const at = answer ? `&at=${answer}` : "";

const SHOTS = [
  { id: "rest", q: "?settle=1", w: 470, h: 300 },
  { id: "answer", q: `?settle=1${at}`, w: 470, h: 300 },
  { id: "small", q: "?settle=1&w=240", w: 270, h: 300 },
  { id: "small-answer", q: `?settle=1&w=240${at}`, w: 270, h: 300 },
  { id: "low", q: `?settle=1&intensity=0${at}`, w: 470, h: 300 },
  { id: "high", q: `?settle=1&intensity=1${at}`, w: 470, h: 300 },
  { id: "dark", q: `?settle=1&theme=dark${at}`, w: 470, h: 300 },
  { id: "light", q: `?settle=1&theme=light${at}`, w: 470, h: 300 },
];

const cells = SHOTS.map((s) => `<figure class="cell" style="width:${s.w}px"><iframe src="${url(s.q)}" width="${s.w}" height="${s.h}"></iframe><figcaption>${s.id} <span>${s.q}</span></figcaption></figure>`).join("");
const sheet = `<!doctype html><meta charset="utf-8"><title>${name} · look</title><style>
  body{margin:0;background:#8b8b8b;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;color:#111}
  .wrap{display:flex;flex-wrap:wrap;gap:14px;padding:14px;align-items:flex-start}
  .cell{margin:0;background:#fff;border-radius:8px;padding:8px}
  iframe{border:1px solid #bbb;border-radius:10px;background:#fff}
  figcaption{margin-top:6px}figcaption span{color:#666}
</style><div class="wrap">${cells}</div>`;
writeFileSync(join(dir, "sheet.html"), sheet);

console.log("read-outs:");
let failed = false;
for (const s of SHOTS) {
  const out = dumpOut(chrome, url(s.q));
  console.log(`  ${s.id.padEnd(12)} ${out}`);
  if (s.id === "rest" && out !== "rest") { console.error(`  ✗ rest shot reads "${out}", not "rest"`); failed = true; }
  if (s.id === "answer" && answer && out === "rest") { console.error("  ✗ answer shot still reads rest: the --answer point misses the part"); failed = true; }
}

const outPath = resolve(arg("--out") ?? `eli5-${name}-look.png`);
execFileSync(chrome, ["--headless=new", "--disable-gpu", "--no-sandbox", "--allow-file-access-from-files", "--hide-scrollbars", "--window-size=1520,1300", `--screenshot=${outPath}`, pathToFileURL(join(dir, "sheet.html")).href], { stdio: "ignore" });
console.log(`sheet: ${outPath}`);
console.log(`now read look.md against ${basename(outPath)}, then record it: node read.mjs <figure.js>.`);
process.exit(failed ? 1 : 0);
