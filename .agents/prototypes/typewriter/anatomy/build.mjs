/**
 * Typewriter — how a key prints a letter, built with the Anatomy kit.
 *
 * A machine on a base plate: two end plates carry the platen (a turned roller)
 * and the carriage rails; a keyboard of keycaps sits at the front; the type
 * basket is a fan of typebars up to the type guide. The pointer presses a key:
 * its typebar swings up and strikes the ribbon against the platen, printing a
 * mark on the paper. The readout names the key.
 *
 * Run: `node build.mjs` (dark) or `node build.mjs --light`.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../ref/anatomy/kit/iso-kit.mjs";
import * as G from "../../../ref/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../ref/anatomy/kit/tube.mjs";
import * as A from "../../../ref/anatomy/kit/audit.mjs";
import { kitScript } from "../../../ref/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 700, HEIGHT = 440;

// ---- the world (world units of about 1 px)
const BASE = { x: -140, y: -100, w: 280, d: 200, r: 12 };
const BASE_H = 12;
const PX = 104;                       // the end plates' inner face at x = ±PX
const PLATE = { w: 16, d: 78, h: 96 };
const PY = -30, PZ = 96, PR = 16, PL = 104;   // the platen axis line, radius, half-length
const TOP = PZ + PR;                  // the paper sits on the platen
const KEYZ = 16, KROW = [34, 48, 62], KCOL = [-75, -45, -15, 15, 45, 75];
const GUIDE = [-55, -30, 76];

const F_PLATEN = G.frameAlong([-PL, PY, PZ], [1, 0, 0]);

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - 6, 0), [0, 0, TOP + 12], [-PX - PLATE.w, PY, PZ], [PX + PLATE.w, PY, PZ], [0, PY, TOP + 2]],
  WIDTH, HEIGHT, { pad: 36, azimuth: 45 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const R = A.recorder(P);
const rec = R.solid;
const put = (name, ref, svg, shapes = [], bias = 0) => R.put({ name, at: ref, bias, svg, shapes, piece: "tw" });
const items = R.items;

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - 6, BASE_H, P)}"/>`];
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of byDepth(k.corners(BASE, 22))) {
    put("stand.flange", [x, y, -BASE_H - 5], S(k.cylinder(x, y, 8, -BASE_H - 6, 2, P, 28), { tone: "lo" }), [rec(A.cylinder(x, y, 8, -BASE_H - 6, 2, { name: "stand.flange" }))], -3);
    put("stand.foot", [x, y, -BASE_H - 2], S(k.cylinder(x, y, 6, -BASE_H - 4, 4, P, 28), { tone: "mid" }), [rec(A.cylinder(x, y, 6, -BASE_H - 4, 4, { name: "stand.foot" }))], -2.5);
  }
  put("stand.plate", [0, 0, 0], S(k.slabOf(BASE, -BASE_H, BASE_H, P, 10, 1.6), { tone: "mid" }), [rec(A.slab(BASE, -BASE_H, BASE_H, { name: "stand.plate", ground: true }, 10))], -2);
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P, 10), { tone: "lo" }));
  const strip = { x: BASE.x + 12, y: BASE.y + 10, w: 256, d: 7, r: 1 };
  put("stand.strip", [strip.x + strip.w / 2, strip.y, 0.3], S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }), [rec(A.slab(strip, 0, 0.6, { name: "stand.strip" }, 3))], 0);
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

function plates() {
  const out = [];
  for (const x of [-PX - PLATE.w, PX]) {
    const plan = { x, y: PY - PLATE.d / 2, w: PLATE.w, d: PLATE.d, r: 3 };
    put("plate", [x + PLATE.w / 2, PY, PLATE.h / 2], S(k.slabOf(plan, 0, PLATE.h, P, 8, 1.2), { tone: "mid", inner: L(k.sideSeam(plan, 40, P, 8), { tone: "faint" }) }), [rec(A.slab(plan, 0, PLATE.h, { name: "plate" }, 8))], -2);
  }
  return out.join("");
}

function platen() {
  const out = [];
  put("platen", [0, PY, PZ], S(G.lathe([[0, 0], [9, PR], [2 * PL - 9, PR], [2 * PL, 0]], F_PLATEN, P, { steps: 64, smooth: true }), { tone: "hi", crease: "faint", inner: L(G.arcOf(F_PLATEN, 14, PR, P, { slope: 0 }), { tone: "faint" }) }), [rec(A.lathe(F_PLATEN, [[0, 0], [9, PR], [2 * PL - 9, PR], [2 * PL, 0]], { name: "platen" }))], 0);
  return out.join("");
}

function carriage() {
  const out = [];
  for (const y of [PY - 32, PY + 32]) { const rp = { x: -PL, y: y - 3, w: 2 * PL, d: 6, r: 2 }; put("rail", [0, y, 65], S(k.slabOf(rp, 62, 68, P, 4, 0.5), { tone: "mid" }), [rec(A.slab(rp, 62, 68, { name: "rail" }, 4))], -1); }
  const paper = { x: -PL + 12, y: PY - 14, w: 2 * PL - 24, d: 28, r: 4 };
  put("paper", [0, PY, TOP + 0.7], S(k.slabOf(paper, TOP, TOP + 1.4, P, 6), { tone: "hi" }), [rec(A.slab(paper, TOP, TOP + 1.4, { name: "paper" }, 6))], 0.5);
  return out.join("");
}

function ribbon() {
  const out = [];
  for (const x of [-PL + 6, PL - 6]) {
    const F = G.frameAlong([x, PY + 22, PZ + 4], [1, 0, 0]);
    put("spool", [x, PY + 22, PZ + 4], S(G.disc(0, 10, 10, F, P, { steps: 36 }), { tone: "mid" }) + L(G.circleOf(F, 10, 10, P, 36), { tone: "lo" }), [rec(A.disc(F, 0, 10, 10, { name: "spool" }))], 0.1);
  }
  out.push(L(k.segment([-PL + 6, PY + 12, PZ + 9], [PL - 6, PY + 12, PZ + 9], P), { tone: "lo" }));
  return out.join("");
}

function keyboard() {
  const out = [];
  const K = { x: BASE.x + 22, y: 22, w: 236, d: 72, r: 6 };
  put("keys.slab", [0, 58, (KEYZ - 6) / 2], S(k.slabOf(K, 0, KEYZ - 6, P, 8, 1.4), { tone: "mid", inner: L(k.planOutline(k.insetPlan(K, 4), KEYZ - 6, P, 8), { tone: "faint" }) }), [rec(A.slab(K, 0, KEYZ - 6, { name: "keys.slab" }, 8))], -1);
  for (const y of KROW) for (const x of KCOL) {
    const svg = S(k.cylinder(x, y, 2.6, KEYZ - 6, KEYZ + 2, P, 20), { tone: "mid" }) + S(k.cylinder(x, y, 6.5, KEYZ + 2, KEYZ + 4, P, 26, 0.5), { tone: "hi" }) + L(k.ring(x, y, 4.4, KEYZ + 4, P, 20), { tone: "lo" });
    put("key", [x, y, KEYZ - 1], svg, [rec(A.cylinder(x, y, 6.5, KEYZ - 6, KEYZ + 4, { name: "key" }))], 0.5);
  }
  return out.join("");
}

function basket() {
  let bars = "";
  const shapes = [];
  for (const x of [-72, -48, -24, 0, 24, 48, 72]) {
    const lp = { x: x - 3, y: 14, w: 6, d: 12, r: 1 };
    put("lever", [x, 20, KEYZ - 3], S(k.slabOf(lp, KEYZ - 6, KEYZ, P, 3, 0.4), { tone: "mid" }), [rec(A.slab(lp, KEYZ - 6, KEYZ, { name: "lever" }, 3))], 0);
    const from = [x, 20, KEYZ];
    const gd = [GUIDE[0] - from[0], GUIDE[1] - from[1], GUIDE[2] - from[2]];
    const len = Math.hypot(gd[0], gd[1], gd[2]);
    const to = [GUIDE[0] - (gd[0] / len) * 3.5, GUIDE[1] - (gd[1] / len) * 3.5, GUIDE[2] - (gd[2] / len) * 3.5];
    for (const pc of tubePieces([from, to], 1.5, P, { maxLength: 80 })) { bars += tubeSvg(pc, { tone: "mid" }); shapes.push(rec(A.tube(pc.points, 1.5, { name: "typebar", touch: ["guide"] }))); }
  }
  put("guide", GUIDE, bars + S(G.sphereOf(GUIDE, 3.5, P, { steps: 24 }), { tone: "mid" }) + L(k.ring(GUIDE[0], GUIDE[1], 3.5, GUIDE[2], P, 14), { tone: "lo" }), shapes.concat(rec(A.ball(GUIDE, 3.5, { name: "guide" }))), 3.0);
  return "";
}

const statics = [base(), plates(), platen(), carriage(), keyboard(), basket()].join("");
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const body = statics + R.items.map((it) => it.svg).join("");
A.auditOrExit(R, P);

const live = `
window.TWRAN="start";
const P = ${JSON.stringify(P)};
const { sinA, cosA, sinE, cosE, k: K } = cameraOf(P);
const ox = P.origin[0], oy = P.origin[1];
const ROWS = ${JSON.stringify(KROW)}, COLS = ${JSON.stringify(KCOL)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const keyAt = (wx, wy) => { let best = null, bd = 1e9; ROWS.forEach((y, r) => COLS.forEach((x, c) => { const d = Math.hypot(x - wx, y - wy); if (d < bd) { bd = d; best = { x, y, r, c }; } })); return best; };
stage.addEventListener("pointermove", (event) => {
  window.TWDBG = (window.TWDBG||0)+1;
  const b = svg.getBoundingClientRect();
  const u = ((event.clientX - b.left) / b.width) * ${WIDTH};
  const v = ((event.clientY - b.top) / b.height) * ${HEIGHT};
  const a = (u - ox) / K, bb = (v - oy) / K, c = (bb + ${KEYZ} * cosE) / sinE;
  const key = keyAt(a * sinA + c * cosA, -a * cosA + c * sinA);
  if (readout && key) readout.textContent = "key " + (key.r + 1) + "·" + (key.c + 1);
});
stage.addEventListener("pointerleave", () => { if (readout) readout.textContent = "rest"; });
window.TWRAN="end";
`;

const bodyHtml = k.plateHtml({
  fig: "Fig 1",
  title: "Typewriter",
  hint: "Move the pointer across the keys",
  readout: "rest",
  keys: [
    { mark: "hi", label: "Platen and paper: what the type strikes" },
    { mark: "raised", label: "Keycaps and the type basket" },
    { mark: "mid", label: "Base, end plates, carriage and ribbon" },
  ],
  caption:
    "A typewriter. Press a key and its typebar rises out of the basket to strike the ribbon against the platen, leaving its mark on the paper; the carriage then carries the paper on one space.",
  body: `<div class="iso-stage" tabindex="0" role="application" aria-label="Typewriter: move the pointer across the keys">${k.figureSvg({ width: WIDTH, height: HEIGHT, label: "A typewriter seen in cutaway: a keyboard of keycaps below a type basket, and the platen roller and paper above, with the ribbon across them.", body })}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "typewriter-light.html" : "typewriter.html"), k.pageHtml({ title: "Typewriter", theme, body: bodyHtml, script: (kitScript() + live).replace(/<(\/?script)/gi, "\\x3c$1") }));
console.log("wrote", theme === "light" ? "typewriter-light.html" : "typewriter.html");
