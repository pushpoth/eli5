import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../ref/anatomy/kit/iso-kit.mjs";
import * as G from "../../../ref/anatomy/kit/lathe.mjs";
import * as A from "../../../ref/anatomy/kit/audit.mjs";
import { kitScript } from "../../../ref/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 640;
const HEIGHT = 400;

// world units ~ 1 px of the real thing: a 30 m tower at about 1 px / 0.25 m
const H = 92;                 // tower shaft height
const R0 = 30, R1 = 13;       // shaft radii, foot to top
const GZ = H;                 // gallery deck bottom
const DECK = 3;               // deck thickness
const DTOP = GZ + DECK;       // deck top
const RAIL = DTOP + 3;        // railing ring
const L0 = DTOP, L1 = DTOP + 15;   // lens / lantern span
const LZ = (L0 + L1) / 2;     // the lamp focus
const CAGE = R1 - 2;          // lantern radius
const DOME0 = L1, DOME1 = L1 + 11;

const ROCK = { x: -54, y: -50, w: 120, d: 108, r: 32 };
const ROCK_H = 8;
const REACH = 72;             // how far the beam reaches at rest

const shaftR = (z) => R0 + ((R1 - R0) * z) / H;
const shaftSlope = (R1 - R0) / H;
const lensMeridian = [[L0, 2.6], [L0 + 2, 6.8, 1], [LZ, 8.4, 1], [L1 - 2, 6.8, 1], [L1, 2.6]];
const lensR = (z) => {
  const [s0, r0] = lensMeridian.filter(([s]) => s <= z).slice(-1)[0] ?? lensMeridian[0];
  const c = lensMeridian.find(([s]) => s >= z) ?? lensMeridian[lensMeridian.length - 1];
  if (s0 === c[0]) return r0;
  return r0 + ((c[1] - r0) * (z - s0)) / (c[0] - s0);
};

const P = k.fitProjection(
  [
    ...k.boxCorners(ROCK, -ROCK_H, ROCK_H),
    [0, 0, DOME1 + 4], [-8, 0, DOME1 + 4], [8, 0, DOME1 + 4],
    ...Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      return [Math.cos(a) * REACH, Math.sin(a) * REACH, LZ];
    }),
  ],
  WIDTH, HEIGHT, { pad: 30, azimuth: 45 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const items = [];
const put = (ref, svg, bias = 0) => items.push({ key: k.depthOf(ref, P) + bias, svg });
const toward = k.towardViewer(P);
const F0 = G.frameAlong([0, 0, 0], [0, 0, 1]);

function rock() {
  const out = [`<path class="iso-halo" d="${k.haloOf(ROCK, -ROCK_H, ROCK_H, P)}"/>`];
  out.push(S(k.slabOf(ROCK, -ROCK_H, ROCK_H, P, 9, 1), { tone: "lo" }));
  const stones = [[-46, 4, 7, 6], [44, 14, 6, 5], [16, -44, 8, 6], [-30, -30, 5, 4], [2, 40, 6, 5]];
  for (const [x, y, r, h] of stones) {
    put([x, y, ROCK_H + h], S(k.cylinder(x, y, r, ROCK_H - 1, h, P, 10), { tone: "lo" }), -1);
  }
  return out.join("");
}

function shaft() {
  const paths = G.lathe([[0, R0], [H, R1]], F0, P, { smooth: false, rims: "all" });
  const bands = [0.32, 0.6].map((f) => G.arcOf(F0, H * f, shaftR(H * f), P, { slope: shaftSlope })).join("");
  return S(paths, { tone: "mid", inner: L(bands, { tone: "faint" }) });
}

function door() {
  const aView = G.angleToward(F0, [toward[0], toward[1], 0]);
  const o = G.pointOf(F0, 9, shaftR(9) + 0.1, aView);
  const Fd = G.frameAlong(o, G.radialOf(F0, aView));
  return S(G.disc(0, 1.4, 4.2, Fd, P, { steps: 24 }), { tone: "hi" })
    + L(G.circleOf(Fd, 1.4, 4.2, P, 24), { tone: "lo" })
    + D([at(G.pointOf(F0, 3, shaftR(9) + 0.6, aView))], { size: 0.6, tone: "mid" });
}

function gallery() {
  const out = [];
  out.push(S(k.cylinder(0, 0, R1 + 5, GZ, DECK, P, 72, 0.5), { tone: "mid" }));
  const posts = 8;
  for (let i = 0; i < posts; i++) {
    const a = (i * 2 * Math.PI) / posts + Math.PI / posts;
    const x = Math.cos(a) * (R1 + 4), y = Math.sin(a) * (R1 + 4);
    put([x, y, DTOP + 1], S(k.cylinder(x, y, 0.55, DTOP, RAIL - DTOP, P, 8), { tone: "mid" }), -0.5);
  }
  // the handrail is a thin rod, so it is a line, not a solid: it cannot interlock
  out.push(L(G.circleOf(F0, RAIL, R1 + 4, P, 64), { tone: "lo" }));
  return out.join("");
}

function lantern() {
  const out = [];
  out.push(S(G.ringBand(DTOP, DTOP + 1.2, CAGE - 1, CAGE + 1.4, F0, P, { steps: 56 }), { tone: "mid" }));
  const bars = 14;
  for (let i = 0; i < bars; i++) {
    const a = (i * 2 * Math.PI) / bars;
    const x = Math.cos(a) * CAGE, y = Math.sin(a) * CAGE;
    put([x, y, (L0 + L1) / 2], S(k.cylinder(x, y, 0.5, L0 + 1, L1 - L0 - 1, P, 8), { tone: "mid" }), 0);
  }
  out.push(S(G.ringBand(L1 - 1, L1, CAGE - 1, CAGE + 1.4, F0, P, { steps: 56 }), { tone: "mid" }));
  return out.join("");
}

function lens() {
  const paths = G.lathe(lensMeridian, F0, P, { smooth: true, rims: "none" });
  const seams = [L0 + 3, L0 + 5, L0 + 7, L0 + 9, L0 + 11].map((z) => G.arcOf(F0, z, lensR(z), P, { slope: 0 })).join("");
  return S(paths, { tone: "hi", inner: L(seams, { tone: "lo" }) });
}

function lamp() {
  return S(G.sphereOf([0, 0, LZ], 2.2, P, { steps: 32 }), { tone: "hi", lit: true });
}

function dome() {
  const paths = G.solidOf([[DOME0, 12], [DOME0 + 3, 11.4, 1], [DOME1 - 3, 7.2, 1], [DOME1, 0, 1]], F0, P, { smooth: true });
  return S(paths, { tone: "mid" });
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A lighthouse. A lamp burns at the focus of a Fresnel lens in the lantern room; the lens gathers the light into one beam and turns on its pedestal, so the beam sweeps the sea and is seen from far off. The pointer aims the beam; the read-out gives its true bearing.",
  body: [
    rock(),
    shaft(),
    door(),
    gallery(),
    lantern(),
    lens(),
    lamp(),
    dome(),
    S(G.sphereOf([0, 0, DOME1 + 2], 1.7, P, { steps: 24 }), { tone: "mid" }),
    ...items.sort((a, b) => a.key - b.key).map((it) => it.svg),
    `<g data-part="beam"><path class="iso-line bl-far" data-tone="lo" d="M0 0"/><path class="iso-line bl-hi" data-tone="hi" d="M0 0"/></g>`,
  ].join(""),
});

const live = `
const P = ${JSON.stringify(P)};
const LZ = ${LZ}, REACH = ${REACH};
const SPREAD = ${(24 * Math.PI / 180).toFixed(4)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const far = svg.querySelector(".bl-far"), hi = svg.querySelector(".bl-hi");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const TX = ${toward[0].toFixed(4)}, TY = ${toward[1].toFixed(4)};
let bearing = ${(250 * Math.PI / 180).toFixed(4)}, target = bearing, touring = true, visible = false, frame = 0, last = 0, idle = 0;
const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
const compass = (a) => Math.round((((a * 180 / Math.PI) - 90) % 360 + 360) % 360);
const ray = (ang, reach) => "M" + iso([Math.cos(ang) * 13, Math.sin(ang) * 13, LZ], P).map((v) => v.toFixed(1)).join(" ") + "L" + iso([Math.cos(ang) * reach, Math.sin(ang) * reach, LZ], P).map((v) => v.toFixed(1)).join(" ");
const fan = (a) => {
  const seg = [];
  for (let i = 0; i <= 8; i++) {
    const ang = a + (i / 8 - 0.5) * 2 * SPREAD;
    seg.push(ray(ang, REACH));
  }
  return seg.join("");
};
const draw = () => {
  far.setAttribute("d", fan(bearing));
  hi.setAttribute("d", ray(bearing, REACH));
  const text = "bearing " + compass(bearing) + "° · 3 rpm";
  if (readout.textContent !== text) readout.textContent = text;
};
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) target = bearing + dt * 0.6;
  const k = still.matches ? 1 : 1 - Math.exp(-dt / 0.25);
  let diff = ((target - bearing + Math.PI) % (2 * Math.PI)) - Math.PI;
  bearing = norm(bearing + diff * k);
  draw();
  const settled = !touring && Math.abs(diff) < 0.002;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (a) => { touring = false; target = norm(a); clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; run(); }, 3600); run(); };
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const r = svg.getBoundingClientRect();
  const c = iso([0, 0, LZ], P);
  const dx = ((event.clientX - r.left) / r.width) * ${WIDTH} - c[0];
  const dy = ((event.clientY - r.top) / r.height) * ${HEIGHT} - c[1];
  steer(Math.atan2(dy / ${P.scale.toFixed(4)}, dx / ${P.scale.toFixed(4)}) + Math.PI / 4);
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  const step = 15 * Math.PI / 180;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); steer(target + step); }
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); steer(target - step); }
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Lighthouse",
  hint: "Move the pointer to aim the beam",
  readout: "bearing 250° · 3 rpm",
  keys: [
    { mark: "lit", label: "The lamp at the focus of the lens" },
    { mark: "hi", label: "Fresnel lens: turns the lamp into one beam" },
    { mark: "mid", label: "Tower, gallery and lantern" },
  ],
  caption:
    "A lighthouse. The lamp sits at the focus of a Fresnel lens, whose concentric prism rings bend every ray into one narrow beam; the lens turns on its pedestal three times a minute, so the beam sweeps the sea and a ship sees a flash once every twenty seconds.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Lighthouse: arrow keys turn the beam" aria-valuemin="0" aria-valuemax="359" aria-valuenow="250">${svg}</div>`,
});

writeFileSync(join(HERE, theme === "light" ? "lighthouse-light.html" : "lighthouse.html"), k.pageHtml({ title: "Lighthouse", theme, body, script: kitScript() + live }));
console.log("wrote", theme === "light" ? "lighthouse-light.html" : "lighthouse.html");

// A bounded, honest pass through anatomy's real geometry audit over the same
// shapes. Runs only under --audit, independent of the page build.
if (process.argv.includes("--audit")) {
  const R = A.recorder(P);
  const rec = (name, at, shapes) => R.put({ name, at, shapes, piece: "light" });
  rec("rock", [0, 0, 0], [A.slab(ROCK, -ROCK_H, ROCK_H, { name: "rock", ground: true }, 9)]);
  for (const [x, y, r, h] of [[-46, 4, 7, 6], [44, 14, 6, 5], [16, -44, 8, 6], [-30, -30, 5, 4], [2, 40, 6, 5]])
    rec("rock.stone", [x, y, ROCK_H + h / 2], [A.cylinder(x, y, r, ROCK_H, h, { name: "rock.stone" })]);
  rec("tower", [0, 0, H / 2], [A.lathe(F0, [[0, R0], [H, R1]], { name: "tower" })]);
  const aView = G.angleToward(F0, [toward[0], toward[1], 0]);
  const o = G.pointOf(F0, 9, shaftR(9) + 0.1, aView);
  const Fd = G.frameAlong(o, G.radialOf(F0, aView));
  rec("door", [o[0], o[1], o[2]], [A.disc(Fd, 0, 1.4, 4.2, { name: "door" })]);
  rec("gallery.deck", [0, 0, GZ], [A.cylinder(0, 0, R1 + 5, GZ, DECK, { name: "gallery.deck" })]);
  for (let i = 0; i < 8; i++) {
    const a = (i * 2 * Math.PI) / 8 + Math.PI / 8;
    const x = Math.cos(a) * (R1 + 4), y = Math.sin(a) * (R1 + 4);
    rec("gallery.post", [x, y, (DTOP + RAIL) / 2], [A.cylinder(x, y, 0.55, DTOP, RAIL - DTOP, { name: "gallery.post" })]);
  }
  rec("lantern.ring", [0, 0, DTOP], [A.ring(F0, DTOP, DTOP + 1.2, CAGE - 1, CAGE + 1.4, { name: "lantern.ring" })]);
  rec("lantern.ring", [0, 0, L1], [A.ring(F0, L1 - 1, L1, CAGE - 1, CAGE + 1.4, { name: "lantern.ring" })]);
  for (let i = 0; i < 14; i++) {
    const a = (i * 2 * Math.PI) / 14;
    const x = Math.cos(a) * CAGE, y = Math.sin(a) * CAGE;
    rec("lantern.bar", [x, y, (L0 + L1) / 2], [A.cylinder(x, y, 0.5, L0 + 1, L1 - L0 - 1, { name: "lantern.bar" })]);
  }
  rec("lens", [0, 0, LZ], [A.lathe(F0, lensMeridian, { name: "lens" })]);
  rec("lamp.stem", [0, 0, (L0 + LZ) / 2], [A.cylinder(0, 0, 0.6, L0, LZ - L0, { name: "lamp.stem" })]);
  rec("lamp", [0, 0, LZ], [A.ball([0, 0, LZ], 2.2, { name: "lamp" })]);
  rec("dome", [0, 0, (DOME0 + DOME1) / 2], [A.solid(F0, [[DOME0, 12], [DOME0 + 3, 11.4, 1], [DOME1 - 3, 7.2, 1], [DOME1, 0, 1]], { name: "dome" })]);
  rec("ventilator", [0, 0, DOME1 + 2], [A.ball([0, 0, DOME1 + 2], 1.7, { name: "ventilator" })]);
  A.settle(R, P);
  R.items.sort((a, b) => a.key - b.key);
  A.auditOrExit(R, P);
}
