#!/usr/bin/env node
/**
 * Gate 2, the measured check. `node audit.mjs <figure.js>` runs the static
 * check, builds the figure, and loads it in headless Chrome with `?audit=1`,
 * where the kernel measures painter's order, support and clearance over the
 * shapes it recorded. It prints the report and exits 0 on `audit passed`.
 *
 * Chrome is found from --chrome, CHROME_PATH, or Playwright's cache.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { assemble, nameOf } from "./build.mjs";
import { validate } from "./validate.mjs";

function findChrome() {
  const i = process.argv.indexOf("--chrome");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = join(homedir(), ".cache", "ms-playwright");
  if (existsSync(cache)) {
    for (const d of readdirSync(cache).filter((n) => n.startsWith("chromium-")))
      for (const p of [join(cache, d, "chrome-linux64", "chrome"), join(cache, d, "chrome-linux", "chrome")])
        if (existsSync(p)) return p;
  }
  return null;
}

const src = process.argv[2];
if (!src || src.startsWith("-")) { console.error("usage: node audit.mjs <figure.js> [--chrome <path>]"); process.exit(2); }

const figure = readFileSync(src, "utf8");
const problems = validate(figure);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); console.error(`${src}: the static check failed first.`); process.exit(1); }

const chrome = findChrome();
if (!chrome) { console.error("no Chrome found; pass --chrome <path> or set CHROME_PATH"); process.exit(2); }

const dir = mkdtempSync(join(tmpdir(), "eli5-audit-"));
const page = join(dir, `${nameOf(figure) ?? "figure"}.html`);
writeFileSync(page, assemble(figure));

const dom = execFileSync(chrome, ["--headless=new", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=2000", "--dump-dom", `file://${page}` + "?audit=1"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const m = /data-audit="([^"]*)"/.exec(dom);
if (!m) { console.error("audit: the page produced no report (did it load?)"); process.exit(1); }
const report = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
for (const line of report.lines) console.log(line);
console.log(report.ok ? `audit passed · ${report.items} items` : `audit failed · ${report.failures} problems`);
process.exit(report.ok ? 0 : 1);
