#!/usr/bin/env node
/**
 * Gate 1, the static check. `node validate.mjs <figure.js>` reads the figure's
 * text and prints `ok` or the lines to fix, exiting 1. It catches what is
 * mechanical; the audit (measured) and the look (by eye) catch the rest.
 *
 * Checks: figure() declared; no colour, fill, width, filter or shadow of its
 * own; no timers, frames or media queries of its own; no DOM of its own (every
 * node from EL.mk); input only through EL.pointer; joins the one loop; declares
 * a legal tour, a range of three, and a parts list; within the line budget.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const LIMIT = 200;

/** The source with comments removed and string/template contents blanked, so a check never reads prose or a string as code. */
function bare(src) {
  let out = "", i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") i++; }
    else if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; out += " "; }
    else if (c === '"' || c === "'" || c === "`") {
      const q = c; out += q; i++;
      while (i < n && src[i] !== q) {
        if (src[i] === "\\") i += 2;
        else if (q === "`" && src[i] === "$" && src[i + 1] === "{") { out += "${"; i += 2; let depth = 1; while (i < n && depth > 0) { if (src[i] === "{") depth++; else if (src[i] === "}") depth--; out += depth > 0 ? src[i] : ""; i++; } out += "}"; }
        else i++;
      }
      out += q; i++;
    } else { out += c; i++; }
  }
  return out;
}

function run(src) {
  const code = bare(src);
  const problems = [];
  const has = (re) => re.test(code);

  if (has(/(?<![\w.])(fill|stroke|stroke-width|strokeWidth|opacity|filter|box-shadow|mix-blend)\s*[:=]\s*["'`]/)) problems.push("accent: the figure sets a colour, width, filter or shadow; use the EL classes");
  if (has(/setAttribute\s*\(\s*["'`]style["'`]/)) problems.push("accent: the figure writes an inline style; use the EL classes");
  if (has(/\b(setTimeout|setInterval|requestAnimationFrame|matchMedia)\s*\(/)) problems.push("clock: the figure runs its own timer, frame or media query; join EL.register");
  if (has(/\bdocument\./) || has(/\bcreateElementNS?\s*\(/)) problems.push("dom: the figure touches the DOM itself; every node comes from EL.mk");
  if (has(/addEventListener\s*\(\s*["'`]pointer/)) problems.push("hit: the figure adds its own pointer listener; use EL.pointer");
  if (!has(/\bEL\.register\s*\(/)) problems.push("clock: the figure never calls EL.register");
  if (!has(/\bEL\.pointer\s*\(/)) problems.push("hit: the figure never calls EL.pointer");

  const raw = src.replace(/\r\n/g, "\n");
  const at = raw.lastIndexOf("figure(");
  if (![...code.matchAll(/\bfigure\s*\(\s*\{/g)].length) { problems.push("declare: the figure does not end with figure({ … })"); return problems; }
  const decl = at < 0 ? "" : raw.slice(at);

  if (!/\bname:\s*["'`][a-z][a-z0-9-]*["'`]/.test(decl)) problems.push("declare: name must be lowercase, one word or hyphenated");
  if (!/\bmeans:\s*["'`]/.test(decl)) problems.push("declare: means (one sentence) is missing");
  if (!/\bparts:\s*\[/.test(decl)) problems.push("declare: parts (the read gate's list) is missing");

  const range = /\brange:\s*\[([^\]]*)\]/.exec(decl);
  if (!range || range[1].split(",").filter((s) => s.trim()).length !== 3) problems.push("declare: range must be three numbers");

  const tourAt = decl.search(/\btour:\s*/);
  if (tourAt < 0) problems.push("declare: tour must be an array of three to six stops or null");
  else {
    const rest = decl.slice(tourAt + "tour:".length).trimStart();
    if (!rest.startsWith("null")) {
      let depth = 0, i = 0;
      for (; i < rest.length; i++) { if (rest[i] === "[") depth++; else if (rest[i] === "]") { depth--; if (!depth) { i++; break; } } }
      const body = rest.slice(1, i - 1);
      let d = 0, stops = body.trim() === "" ? 0 : 1;
      for (const ch of body) { if (ch === "[" || ch === "{") d++; else if (ch === "]" || ch === "}") d--; else if (ch === "," && d === 0) stops++; }
      if (stops < 3 || stops > 6) problems.push(`tour: ${stops} stops; three to six`);
      if (!/\[/.test(body)) problems.push("tour: at least one stop must be a point");
    }
  }

  const lines = src.replace(/\r\n/g, "\n").split("\n").length;
  if (lines > LIMIT) problems.push(`length: ${lines} lines, over the ${LIMIT}-line budget`);

  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  if (!file) { console.error("usage: node validate.mjs <figure.js>"); process.exit(2); }
  const problems = run(readFileSync(file, "utf8"));
  if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
  console.log(`ok ${file}: passes the static checks. Now the audit and the look.`);
}

export { run as validate };
