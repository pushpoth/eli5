#!/usr/bin/env node
/**
 * Gate 3b, the read recorded. The look sheet (look.mjs, look.md) is judged by
 * eye; this makes the judgment a required artifact, so a figure cannot be
 * handed over with the read skipped. It reads the figure's `parts` list and a
 * sibling `<name>.read.json`, one entry per part, and fails unless every part
 * is answered `yes` — a part that shows none of the features it claims is a no.
 *
 *   node read.mjs <figure.js>          check
 *   node read.mjs <figure.js> --new    write a template to fill from the sheet
 *
 * It cannot tell a true answer from a false one. It can only refuse to let the
 * answer be missing.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/** The figure's `parts`: `[{ name, shows: [...] }]`. */
export function parseParts(src) {
  const m = /parts\s*:\s*\[/.exec(src);
  if (!m) return [];
  let depth = 0, i = src.indexOf("[", m.index), start = i;
  for (; i < src.length; i++) { if (src[i] === "[") depth++; else if (src[i] === "]") { depth--; if (!depth) { i++; break; } } }
  const block = src.slice(start, i), parts = [];
  const re = /name\s*:\s*["'`]([^"'`]+)["'`][\s\S]*?shows\s*:\s*\[([^\]]*)\]/g;
  let mm;
  while ((mm = re.exec(block))) parts.push({ name: mm[1], shows: mm[2].split(",").map((s) => s.trim().replace(/^["'`]|["'`]$/g, "")).filter(Boolean) });
  return parts;
}

function main() {
  const src = process.argv[2];
  if (!src || src.startsWith("-")) { console.error("usage: node read.mjs <figure.js> [--new]"); process.exit(2); }
  const figure = readFileSync(src, "utf8");
  const parts = parseParts(figure);
  if (!parts.length) { console.error(`  ✗ read: ${src} declares no parts to read`); process.exit(1); }

  const file = join(dirname(src), basename(src).replace(/\.js$/, "") + ".read.json");

  if (process.argv.includes("--new")) {
    const template = { figure: basename(src), parts: parts.map((p) => ({ name: p.name, shows: p.shows, verdict: "", note: "" })) };
    writeFileSync(file, JSON.stringify(template, null, 2) + "\n");
    console.log(`wrote ${file}: answer each part from the look sheet, verdict yes or no.`);
    process.exit(0);
  }

  let read;
  try { read = JSON.parse(readFileSync(file, "utf8")); }
  catch { console.error(`  ✗ read: no ${basename(file)}. Run: node read.mjs ${src} --new, then answer it from the sheet.`); process.exit(1); }

  const byName = new Map((read.parts ?? []).map((p) => [p.name, p]));
  let failed = false;
  for (const p of parts) {
    const r = byName.get(p.name);
    if (!r) { console.error(`  ✗ read: ${p.name} was not answered`); failed = true; continue; }
    if (r.verdict !== "yes") { console.error(`  ✗ read: ${p.name} — ${r.verdict || "unanswered"}${r.note ? ` (${r.note})` : ""}, needs: ${p.shows.join(", ")}`); failed = true; }
  }
  if (failed) { console.error("read failed: fix the figure, or the parts list, or the reading."); process.exit(1); }
  console.log(`ok ${src}: every part reads. Now hand over, and say what was not verified.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
