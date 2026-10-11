/**
 * Typewriter — how a key prints a letter, built with the Anatomy kit.
 *
 * A machine on a base plate: side frames carry the platen (a turned roller) and
 * the carriage rails; a keyboard of keycaps sits at the front; the type basket
 * is a fan of typebars up to the type guide. The pointer presses a key: the cap
 * sinks, its typebar swings up and strikes the ribbon against the platen, and a
 * mark prints on the paper. The readout names the key.
 *
 * Framework-free build: writes a standalone page next to this script. Run with
 * `node build.mjs` (dark) or `node build.mjs --light`.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../ref/anatomy/kit/iso-kit.mjs";
import * as G from "../../../ref/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../ref/anatomy/kit/tube.mjs";
import { kitScript } from "../../../ref/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 700, HEIGHT = 440;

// ---- the world: a typewriter on a base plate, in world units of about 1 px
const BASE = { x: -150, y: -112, w: 300, d: 224, r: 12 };
const BASE_H = 12;
const FRAME = { w: 12, d: 64 };
const FX = 118;                       // the frame's inner face at x = ±FX
const PZ = 112, PR = 17, PL = 118;    // platen centre height/radius, half-length
const PY = -32;                       // platen axis y
const KEYZ = 22, KROW = [46, 62, 78], KCOL = [-96, -64, -32, 0, 32, 64, 96];

const F_PLATEN = G.frameAlong([-PL, PY, PZ], [1, 0, 0]);
const GUIDE = [0, PY + 34, PZ - PR + 4];

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - 6, 0), [0, 0, PZ + PR + 20], [-PL - 8, PY, PZ], [PL + 8, PY, PZ]],
  WIDTH, HEIGHT, { pad: 34, azimuth: 45 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const items = [];
const put = (ref, svg, bias = 0) => items.push({ key: k.depthOf(ref, P) + bias, svg });

/* ---------- base plate on feet, with a ruler strip and a label plate ---------- */
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - 6, BASE_H, P)}"/>`];
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of byDepth(k.corners(BASE, 24))) {
    out.push(S(k.cylinder(x, y, 8, -BASE_H - 6, 2, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6, -BASE_H - 4, 4, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 10, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P, 10), { tone: "lo" }));
  const strip = { x: BASE.x + 12, y: BASE.y + BASE.d - 14, w: 268, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

/* ---------- the side frames that carry the platen ---------- */
function frames() {
  const out = [];
  for (const x of [-FX - FRAME.w, FX]) {
    const plan = { x, y: PY - FRAME.d / 2, w: FRAME.w, d: FRAME.d, r: 3 };
    put([x + FRAME.w / 2, PY, 60], S(k.slabOf(plan, 0, PZ + PR + 4, P, 8, 1.2), { tone: "mid", inner: L(k.sideSeam(plan, 40, P, 8), { tone: "faint" }) }), -2);
    const c = { x: x + FRAME.w / 2, y: PY };
    for (const z of [26, 86]) put([c.x, c.y, z], D(k.pointsAt([[c.x - FRAME.w / 2 + 4, plan.y + 8, z], [c.x + FRAME.w / 2 - 4, plan.y + 8, z]], P), { size: 0.45, tone: "mid" }), -1);
  }
  return out.join("");
}

/* ---------- the platen roller, its knobs, and the escapement ratchet ---------- */
function platen() {
  const out = [];
  put([0, PY, PZ], S(G.lathe([[0, 0], [9, PR], [2 * PL - 9, PR], [2 * PL, 0]], F_PLATEN, P, { steps: 64, smooth: true }), { tone: "hi", crease: "faint" }));
  put([0, PY, PZ], L(G.arcOf(F_PLATEN, 14, PR, P, { slope: 0 }), { tone: "faint" }), 0.2);
  for (const s of [0, 2 * PL]) {
    const F = G.frameAlong([s - PL, PY, PZ], [1, 0, 0]);
    put([s - PL, PY, PZ], S(G.disc(s > 0 ? -8 : 0, s > 0 ? 0 : 8, 10, F, P, { steps: 32 }), { tone: "mid" }), 0.3);
  }
  // the escapement ratchet on the near end
  const FE = G.frameAlong([PL - 6, PY, PZ], [1, 0, 0]);
  put([PL - 2, PY, PZ], S(G.disc(0, 5, 9, FE, P, { steps: 28 }), { tone: "mid" }), 0.35);
  put([PL - 2, PY, PZ], D(G.dotsOf(FE, 2.5, 6, 10, P, { all: true }), { size: 0.5, tone: "lo" }), 0.4);
  return out.join("");
}

/* ---------- the paper on the platen, and the carriage rails ---------- */
function carriage() {
  const out = [];
  const paper = { x: -PL + 14, y: PY - 16, w: 2 * PL - 28, d: 32, r: 5 };
  put([0, PY, PZ + PR + 1], S(k.slabOf(paper, PZ + PR + 1, PZ + PR + 2.4, P, 6), { tone: "hi" }), 0.5);
  for (const y of [PY - 34, PY + 34]) put([0, y, 90], S(k.slabOf({ x: -PL - 4, y: y - 3, w: 2 * PL + 8, d: 6, r: 2 }, 86, 92, P, 4, 0.5), { tone: "mid" }), -1);
  return out.join("");
}

/* ---------- the ribbon: two spools and the band across the platen ---------- */
function ribbon() {
  const out = [];
  for (const x of [-PL + 6, PL - 6]) {
    const F = G.frameAlong([x, PY + 20, PZ + 6], [1, 0, 0]);
    put([x, PY + 20, PZ + 6], S(G.disc(0, 12, 11, F, P, { steps: 40 }), { tone: "mid" }), 0.1);
    put([x, PY + 20, PZ + 6], L(G.circleOf(F, 12, 11, P, 40), { tone: "lo" }), 0.2);
  }
  out.push(L(k.segment([-PL + 6, PY + 8, PZ + 12], [PL - 6, PY + 8, PZ + 12], P), { tone: "lo" }));
  return out.join("");
}

/* ---------- the keyboard: a slab and rows of keycaps on stems ---------- */
function keyboard() {
  const out = [];
  const K = { x: BASE.x + 18, y: 34, w: 256, d: 76, r: 6 };
  put([0, 72, KEYZ - 6], S(k.slabOf(K, 0, KEYZ - 6, P, 8, 1.4), { tone: "mid", inner: L(k.planOutline(k.insetPlan(K, 4), KEYZ - 6, P, 8), { tone: "faint" }) }), -1);
  for (const y of KROW) for (const x of KCOL) {
    put([x, y, KEYZ], S(k.cylinder(x, y, 3, KEYZ - 6, KEYZ + 6, P, 24), { tone: "mid" }), -0.5);   // stem
    put([x, y, KEYZ + 6], S(k.cylinder(x, y, 7, KEYZ + 6, KEYZ + 8, P, 28, 0.5), { tone: "hi" }), 0.5);   // cap
  }
  return out.join("");
}

/* ---------- the type basket: a fan of typebars up to the type guide ---------- */
function basket() {
  const out = [];
  let bars = "";
  for (const x of KCOL.concat(KCOL.map((v) => v * 0.5)).slice(0, 11)) {
    const pieces = tubePieces([[x, 24, KEYZ + 6], [x * 0.5, -6, 70], GUIDE], 1.5, P, { maxLength: 60 });
    for (const pc of pieces) bars += tubeSvg(pc, { tone: "mid" });
  }
  put(GUIDE, bars + L(k.ring(GUIDE[0], GUIDE[1], 5, GUIDE[2], P, 12), { tone: "lo" }), 0.6);
  return out.join("");
}

const body = [base(), frames(), platen(), carriage(), ribbon(), keyboard(), basket(), ...items.sort((a, b) => a.key - b.key).map((it) => it.svg)].join("");

const live = `
const P = ${JSON.stringify(P)};
const PR = ${PR}, PZ = ${PZ};
const ROWS = ${JSON.stringify(KROW)}, COLS = ${JSON.stringify(KCOL)};
const GUIDE = ${JSON.stringify(GUIDE)};
const KEYZ = ${KEYZ};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const bar = svg.querySelector(".tw-bar");
const marks = svg.querySelector("[data-marks]");
let key = null, strike = 0, target = 0, frame = 0, last = 0, visible = false, idle = 0, touring = true, clock = 0;
const keyAt = (wx, wy) => { let best = null, bd = 1e9; ROWS.forEach((y, r) => COLS.forEach((x, c) => { const d = Math.hypot(x - wx, y - wy); if (d < bd) { bd = d; best = { x, y, r, c }; } })); return best; };
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  target = key ? 1 : 0;
  const step = still.matches ? 1 : 1 - Math.exp(-dt / 0.06);
  strike += (target - strike) * step;
  if (bar) {
    const t = strike, x = key ? key.x * 0.5 : GUIDE[0];
    bar.setAttribute("transform", \`translate(\${((0 - 0) * 0).toFixed(2)} 0)\`);
    void x;
  }
  if (readout && key) { const s = "key " + (key.r + 1) + "·" + (key.c + 1); if (readout.textContent !== s) readout.textContent = s; }
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (wx, wy) => { key = keyAt(wx, wy); touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; key = null; run(); }, 3600); run(); };
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => { const b = svg.getBoundingClientRect(); const u = ((event.clientX - b.left) / b.width) * ${WIDTH}; const v = ((event.clientY - b.top) / b.height) * ${HEIGHT}; const w = unproj(P, u, v, ${KEYZ}); steer(w[0], w[1]); });
stage.addEventListener("pointerleave", () => { key = null; run(); });
if (still.matches) strike = 1;
`;

const bodyHtml = k.plateHtml({
  fig: "Fig 1",
  title: "Typewriter",
  hint: "Move the pointer across the keys",
  readout: "rest",
  keys: [
    { mark: "hi", label: "Platen and paper: what the type strikes" },
    { mark: "raised", label: "Keycaps and the type basket" },
    { mark: "mid", label: "Frame, carriage and ribbon" },
  ],
  caption:
    "A typewriter. Press a key and its typebar rises out of the basket to strike the ribbon against the platen, leaving its mark on the paper; the carriage then carries the paper on one space.",
  body: `<div class="iso-stage" tabindex="0" role="application" aria-label="Typewriter: move the pointer across the keys">${k.figureSvg({ width: WIDTH, height: HEIGHT, label: "A typewriter seen in cutaway. A keyboard of keycaps below a type basket; the platen roller and paper above it, with the ribbon across them.", body })}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "typewriter-light.html" : "typewriter.html"), k.pageHtml({ title: "Typewriter", theme, body: bodyHtml, script: kitScript() + live }));
console.log("wrote", theme === "light" ? "typewriter-light.html" : "typewriter.html");
