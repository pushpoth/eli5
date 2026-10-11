/**
 * The eli5 kernel: `src/` concatenated into one plain script that defines a
 * single `EL`. `node scripts/kernel.mjs` writes skills/eli5/kernel.js; with
 * `--check` it writes nothing and exits 1 when the committed file is not what
 * the source gives now.
 *
 * Not minified: an agent reads the index at the top. Its first line carries the
 * hash of everything after it, which is how validate.mjs knows a kernel was not
 * edited. The modules are single-file ESM with single-line imports; the build
 * strips the `import`/`export` lines and wraps the rest in one IIFE, so no
 * bundler and no dependencies are needed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const SRC = (f) => readFileSync(here(`../src/${f}.js`), "utf8");
const HEAD = readFileSync(here("../src/kernel.head.js"), "utf8").trimEnd();
const OUT = here("../skills/eli5/kernel.js");

/* Order matters only in that the IIFE runs top to bottom; functions hoist. */
const FILES = ["iso", "solid", "parts", "motion", "dom", "stage", "theme", "tour", "audit"];
/* Exactly the names a figure may call. test/kernel.test.mjs holds this to EL's keys. */
const PUBLIC = [
  "cam", "proj", "unproj", "fit", "frame", "facing", "viewOf",
  "rrect", "circ", "circAt", "ringAt", "run", "hull",
  "poly", "open", "seg", "clamp", "lerp", "rad", "r2",
  "prism", "slab", "cylinder", "lathe", "latheY", "ringY",
  "knurl", "sideArc", "sideSeam", "boltRing",
  "spring", "stepS", "tween", "tset", "tval", "tdone", "EASE", "reducedMotion", "setReducedMotion",
  "mk", "solid", "put", "draw", "line", "dot", "place", "group", "setRecording",
  "register", "advance", "pointer", "disposer", "audit",
  "css", "inject", "tour", "LAP",
];

const strip = (src) => src.replace(/^import .*$/gm, "").replace(/^export /gm, "");

function build() {
  const body = FILES.map((f) => strip(SRC(f)).trimEnd()).join("\n\n");
  const rest = `${HEAD}\nconst EL = (() => {\n${body}\nreturn { ${PUBLIC.join(", ")} };\n})();\nexport { EL };\n`;
  const hash = createHash("sha256").update(rest).digest("hex");
  return `/* eli5 kernel sha256:${hash} */\n${rest}`;
}

const out = build();
if (process.argv.includes("--check")) {
  let now = "";
  try { now = readFileSync(OUT, "utf8"); } catch { /* missing */ }
  if (now !== out) {
    console.error("kernel.js is stale: run `node scripts/kernel.mjs`");
    process.exit(1);
  }
  console.log("kernel.js is up to date");
} else {
  writeFileSync(OUT, out);
  console.log(`wrote skills/eli5/kernel.js (${out.length} bytes)`);
}
