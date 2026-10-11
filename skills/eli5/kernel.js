/* eli5 kernel sha256:5836f94838b9093684cba6d17b2e6b585474f21f72dd832e7b0d8e972a9073f0 */
/*
 * EL: everything a figure may call. Read this index; the code under it is the
 * engine, and a figure never edits it. A change to the engine is a change to
 * the engine, not to the figure.
 *
 * Every figure is drawn in a 400 × 320 viewBox. World space is x/y on the ground
 * and z up. Faces are filled with the ground colour and painted back to front,
 * so a nearer solid covers a farther one: append in that order. At the default
 * camera, cam(45, 0.5, S), +x runs down to the right and +y down to the left, so
 * the corner with the largest x and y is nearest the viewer: append by ascending
 * x + y, from the far corner.
 *
 * Camera
 *   cam(azDeg, k, S)          a camera: azimuth in degrees, k = sin(elevation) (0.5 is the 2:1 view), S = scale
 *   fit(C, points, cx, cy)    centres the box of [x, y, z] points on (cx, cy); call once, before proj
 *                             it only centres, it never scales: choose S by trying values, with the most extreme pose in points
 *   proj(C)                   returns P(x, y, z) -> [sx, sy]
 *   unproj(C, sx, sy, z)      the world [x, y] under a screen point, on the plane at height z
 *   facing(C)                 returns front(sample): whether a ring sample faces the camera
 *   viewOf(C)                 the unit world direction toward the viewer
 * Solids (return { paths: { sil, crease }, shape })
 *   slab(x0, y0, x1, y1, r, z0, z1, P, front, opts?)    a rounded box; opts { inset, steps }
 *   cylinder(cx, cy, r, z0, z1, P, front, steps?)       a round post, puck, foot or boss
 *   lathe(prof, P, front, opts?)                        a surface of revolution about z from a meridian [[z, r], …]; convex only
 *   prism(P, front, ring, inner, z0, z1)                the two path strings of any ring pair
 *   rrect(u0, v0, u1, v1, r, n?)  circ(R, n?)  circAt(cx, cy, R, n?)   ringAt(P, ring, z)   run(ring, keep)   hull(points)
 * Paths and numbers
 *   poly(points)  open(points)  seg(a, b)  clamp(v, a, b)  lerp(a, b, t)  rad(deg)  r2(n)
 * The continuous clock: one spring per moving number
 *   spring(x, opts?)          at rest on x; write .t to retarget; opts { k, c, m, eps }
 *   stepS(sp, dt)             advances by dt seconds; returns whether it is still moving
 * The discrete clock: a 700 ms tween on EASE
 *   tween(v, dur?)  tset(tw, to, now, delay)  tval(tw, now)  tdone(tw, now)  EASE
 *   reducedMotion()           true when the reader asked for less motion; springs and tweens already land at once
 * Drawing
 *   mk(tag, attrs, parent)    one svg element: the only way a figure makes a node
 *   solid(parent)             { g, sil, cr }: a group holding a silhouette and a crease path
 *   draw(el, part, meta)      paints a slab/cylinder/lathe and records its shape; meta { name, at }
 *   line(parent, d, cls?)     a line; cls is el-lo, el-hi or el-dash
 *   dot(parent, C, r, cls?)   a flat dot; position it with place(el, [sx, sy])
 *   group(parent, attrs?)  place(el, point)
 * Life
 *   register(stage, tick)     joins the one frame loop; tick(dt in seconds, now in ms) returns true to ask for another frame; gives { wake, unregister }
 *   pointer(stage, handlers)  { move, down?, leave }, points in viewBox units; returns its disposer
 *   disposer()                { add, on, dispose }: collects tear-down, so destroy is bag.dispose
 * Classes, on path, polygon, ellipse and line. They are the whole palette; a figure sets no colour of its own.
 *   (none) filled with the plate colour, medium stroke
 *   el-sil  the silhouette's stroke     el-cr  the crease (dim)     el-hi  the bright stroke, the only highlight
 *   el-lo   a dim line                  el-dash a dashed guide
 *   el-dot  a bright dot                el-dot.m a medium dot
 *
 * The bench's business, not a figure's: setRecording(on) and audit() run the
 * measured gate; a figure only draws through EL.draw, which records its shape.
 */
const EL = (() => {
/**
 * eli5 · iso — the drawing maths, with no DOM.
 *
 * Everything is in viewBox units: a figure is drawn in a 400 × 320 box and
 * scaled to its column by the svg, so no number depends on the viewport. World
 * space is x/y on the ground and z up; the camera turns the ground by an
 * azimuth, squashes y by sin(elevation) and lifts z by cos(elevation). There is
 * no perspective and no hidden-line removal: faces are filled with the ground
 * colour and painted back to front, so a nearer solid covers a farther one.
 *
 * Written from the study shared by the two reference engines, from scratch.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rad = (d) => (d * Math.PI) / 180;
/** Two decimals: enough for a hairline at any zoom, and path strings stay short. */
const r2 = (n) => Math.round(n * 100) / 100;

/** A closed path through the points. */
const poly = (pts) => "M" + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L") + "Z";
/** One straight segment, as its own subpath. */
const seg = (a, b) => `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`;
/** An open polyline; empty for fewer than two points. */
const open = (pts) => (pts.length < 2 ? "" : "M" + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L"));

/* ---------- projection ---------- */

/** An orthographic camera. `az` is in radians, `k` is sin(elevation) (.5 is the 2:1 view), `S` the scale. */
const cam = (azDeg, k, S) => { const C = { az: rad(azDeg), k, S, ox: 0, oy: 0 }; lastCamera = C; return C; };

/** The most recent camera, so the audit can measure the drawing without the figure handing it over. */
let lastCamera = null;

/** The unit world direction toward the viewer for a camera: the axis the projection drops. */
function viewOf(C) {
  const s = Math.sin(C.az), c = Math.cos(C.az), zf = Math.sqrt(1 - C.k * C.k);
  const v = [s, c, C.k / zf], m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
}

/** The projector for the camera as it is now. */
function proj(C) {
  const c = Math.cos(C.az), s = Math.sin(C.az), zf = Math.sqrt(1 - C.k * C.k);
  return (x, y, z) => [C.ox + C.S * (x * c - y * s), C.oy + C.S * ((x * s + y * c) * C.k - z * zf)];
}

/** The ground-plane inverse: the world x/y under a screen point, on the plane at height z. */
function unproj(C, sx, sy, z) {
  const c = Math.cos(C.az), s = Math.sin(C.az), zf = Math.sqrt(1 - C.k * C.k);
  const X = (sx - C.ox) / C.S, Y = ((sy - C.oy) / C.S + z * zf) / C.k;
  return [X * c + Y * s, -X * s + Y * c];
}

/** Sets the camera's offset so the bounding box of `pts` is centred on (cx, cy). It centres; it never scales. */
function fit(C, pts, cx, cy) {
  C.ox = 0; C.oy = 0;
  const P = proj(C);
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (const p of pts) {
    const q = P(p[0], p[1], p[2]);
    a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]);
  }
  C.ox = cx - (a + b) / 2; C.oy = cy - (c + d) / 2;
}

/** The samples whose normal faces the camera: the world direction of screen-down is (sin az, cos az). */
const facing = (C) => {
  const s = Math.sin(C.az), c = Math.cos(C.az);
  return (q) => q.nu * s + q.nv * c >= -1e-6;
};

/* ---------- rounded rings ---------- */

/** A rounded rectangle outline, sampled. Each sample carries its outward normal. `n` samples per corner. */
function rrect(u0, v0, u1, v1, r, n = 4) {
  r = Math.max(0, Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2));
  const out = [];
  for (const [cu, cv, a0] of [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180], [u1 - r, v0 + r, 270]])
    for (let k = 0; k <= n; k++) {
      const a = rad(a0 + (90 * k) / n), ca = Math.cos(a), sa = Math.sin(a);
      out.push({ u: cu + r * ca, v: cv + r * sa, nu: ca, nv: sa });
    }
  return out;
}

/** A circle of radius R about the origin, sampled the same way. */
function circ(R, n = 48) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    out.push({ u: R * ca, v: R * sa, nu: ca, nv: sa });
  }
  return out;
}

/** A circle about (cx, cy). */
const circAt = (cx, cy, R, n = 48) => circ(R, n).map((q) => ({ u: cx + q.u, v: cy + q.v, nu: q.nu, nv: q.nv }));

/** A ring laid flat at height z, projected. */
const ringAt = (P, ring, z) => ring.map((q) => P(q.u, q.v, z));

/** Convex hull (monotone chain), counter-clockwise in screen space. */
function hull(input) {
  const pts = input.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length > 1 && x(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length > 1 && x(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop();
  return lo.concat(up);
}

/** The one cyclic run of samples that pass `keep`, in ring order. */
function run(ring, keep) {
  const n = ring.length;
  let s = -1;
  for (let i = 0; i < n; i++) if (keep(ring[i]) && !keep(ring[(i + n - 1) % n])) { s = i; break; }
  if (s < 0) return keep(ring[0]) ? ring.slice() : [];
  const out = [];
  for (let k = 0; k < n && keep(ring[(s + k) % n]); k++) out.push(ring[(s + k) % n]);
  return out;
}

/**
 * eli5 · solid — rounded solids, with no DOM.
 *
 * A solid is the hull of two rounded rings, its top and its base, so the
 * vertical corners are never drawn; its one inner line is a crease, the front
 * run of an inset ring on the lid, which reads as a bevel. A taper is two rings
 * of different size. Every solid returns its two path strings and a shape
 * descriptor: the shape is what the audit measures, and it is the same numbers
 * the drawing uses, so a stand-in shape is impossible by construction.
 */


/** A prism standing from z0 to z1: `{ sil, crease }`. */
function prism(P, front, ring, inner, z0, z1) {
  return {
    sil: poly(hull(ringAt(P, ring, z1).concat(ringAt(P, ring, z0)))),
    crease: inner ? open(ringAt(P, run(inner, front), z1)) : "",
  };
}

/** A rounded box from (x0, y0) to (x1, y1), from z0 to z1. */
function slab(x0, y0, x1, y1, r, z0, z1, P, front, { inset = 1.1, steps = 4 } = {}) {
  const ring = rrect(x0, y0, x1, y1, r, steps);
  const inner = inset > 0 ? rrect(x0 + inset, y0 + inset, x1 - inset, y1 - inset, Math.max(0.3, r - inset), steps) : null;
  return { paths: prism(P, front, ring, inner, z0, z1), shape: { kind: "box", x0, y0, x1, y1, z0, z1, r } };
}

/** A round post, puck, foot or boss about (cx, cy), from z0 to z1. */
function cylinder(cx, cy, r, z0, z1, P, front, steps = 32) {
  return {
    paths: prism(P, front, circAt(cx, cy, r, steps), circAt(cx, cy, Math.max(0.3, r - 1.1), steps), z0, z1),
    shape: { kind: "cyl", cx, cy, r, z0, z1 },
  };
}

/**
 * A surface of revolution about the z axis from a meridian `prof`, a list of
 * `[z, r]` from one end to the other. Convex profiles only for now: the
 * silhouette is the hull of every ring, and the crease is the front run of the
 * inset top ring. A waisted profile needs the true silhouette and is not here yet.
 */
function lathe(prof, P, front, { steps = 48 } = {}) {
  const rings = prof.map(([z, r]) => ringAt(P, circ(r, steps), z));
  const sil = poly(hull(rings.flat()));
  const [tz, tr] = prof[prof.length - 1];
  const crease = open(ringAt(P, run(circ(Math.max(0.3, tr - 1.1), steps), front), tz));
  return { paths: { sil, crease }, shape: { kind: "turn", prof, steps } };
}

/**
 * eli5 · motion — the two clocks, with no DOM.
 *
 * A discrete change (which item) gets a long ease-out on a tween; a continuous
 * input (where the pointer is) gets a spring, because its target moves every
 * frame and a timed ease would always be chasing it. Reduced motion is one flag
 * here so this file stays pure and a test can flip it.
 */


let reduced = false;
const setReducedMotion = (on) => { reduced = Boolean(on); };
const reducedMotion = () => reduced;

/** A spring at rest on x. k 100 · c 18 · m 1 unless told otherwise. */
function spring(x, o = {}) {
  return { x, v: 0, t: x, k: o.k ?? 100, c: o.c ?? 18, m: o.m ?? 1, eps: o.eps ?? 0.01 };
}

/** Advances a spring toward `sp.t`, substepped at 240 Hz so a long frame can't overshoot. Returns whether it is still moving. */
function stepS(sp, dt) {
  if (reduced) { sp.x = sp.t; sp.v = 0; return false; }
  const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = (-sp.k * (sp.x - sp.t) - sp.c * sp.v) / sp.m;
    sp.v += a * h; sp.x += sp.v * h;
  }
  if (Math.abs(sp.x - sp.t) < sp.eps && Math.abs(sp.v) < sp.eps * 10) { sp.x = sp.t; sp.v = 0; return false; }
  return true;
}

/** A CSS cubic-bezier as a function of progress: Newton first, bisection if it strays. */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (u) => ((ax * u + bx) * u + cx) * u;
  const Y = (u) => ((ay * u + by) * u + cy) * u;
  const dX = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const e = X(u) - t;
      if (Math.abs(e) < 1e-5) break;
      const d = dX(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    if (!(u >= 0 && u <= 1) || Math.abs(X(u) - t) > 1e-4) {
      let lo = 0, hi = 1; u = t;
      for (let i = 0; i < 24; i++) { if (X(u) < t) lo = u; else hi = u; u = (lo + hi) / 2; }
    }
    return Y(u);
  };
}

/** The lift curve: 700 ms on (.32, .72, 0, 1). The discrete clock. */
const EASE = bezier(0.32, 0.72, 0, 1);

/** A tween on EASE. `t0` may be in the future: that is how a stagger delays it. */
const tween = (v, dur = 700) => ({ from: v, to: v, t0: -1e9, dur });
const tval = (tw, now) => {
  const p = clamp((now - tw.t0) / tw.dur, 0, 1);
  return tw.from + (tw.to - tw.from) * (reduced ? 1 : EASE(p));
};
/** Retargets from wherever it is now, starting after `delay` ms. A no-op if the target is unchanged. */
const tset = (tw, to, now, delay) => {
  if (tw.to === to) return;
  tw.from = tval(tw, now); tw.to = to; tw.t0 = now + delay;
};
const tdone = (tw, now) => reduced || now >= tw.t0 + tw.dur;

/**
 * eli5 · dom — the only place a figure makes a node, and where a solid is
 * painted. `draw` writes a solid's two paths and records its shape for the
 * audit, so a figure never has to remember to record: the shape is the solid's
 * own numbers, taken as it is drawn.
 */
const NS = "http://www.w3.org/2000/svg";

/** One svg element, with its attributes, appended to `parent` when there is one. */
function mk(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

/** A solid's two paths in one group: the silhouette (`.el-sil`) and its crease (`.el-cr`). */
function solid(parent) {
  const g = mk("g", {}, parent);
  return { g, sil: mk("path", { class: "el-sil" }, g), cr: mk("path", { class: "el-cr" }, g) };
}

/** Writes a solid's `{ sil, crease }` into a `solid()`'s two paths. */
const put = (el, paths) => { el.sil.setAttribute("d", paths.sil); el.cr.setAttribute("d", paths.crease || ""); };

/* the audit's shapes, collected as things are drawn */
const shapes = [];
let recording = false;
const setRecording = (on) => { recording = Boolean(on); if (on) shapes.length = 0; };
const recorded = () => shapes.slice();

/**
 * Paints a solid built by slab/cylinder/lathe and records its shape. `meta` is
 * `{ name, at }`: `at` is the world point its sort key is taken from.
 */
function draw(el, part, meta) {
  put(el, part.paths);
  if (recording && part.shape && meta && meta.name) shapes.push({ shape: part.shape, name: meta.name, at: meta.at ?? [0, 0, 0] });
}

/** A line on the drawing, classed `el-lo`/`el-hi`/`el-dash`, or set by `cls`. */
const line = (parent, d, cls = "el-lo") => mk("path", { class: cls, d }, parent);

/** A flat dot: an ellipse squashed by the camera. Position it with `place`. */
const dot = (parent, C, r, cls = "el-dot") => mk("ellipse", { rx: r2c(r * C.S), ry: r2c(r * C.S * C.k), class: cls }, parent);
const place = (el, q) => { el.setAttribute("cx", String(r2c(q[0]))); el.setAttribute("cy", String(r2c(q[1]))); };
const r2c = (n) => Math.round(n * 100) / 100;

/** A group around children, with optional attributes. */
const group = (parent, attrs) => mk("g", attrs, parent);

/**
 * eli5 · stage — one frame loop for every figure on the page, the pointer, and
 * tear-down. A figure joins the loop with `register`, reads the pointer with
 * `pointer`, and hands every disposer to `disposer()`, so `destroy` is one call
 * and the page is exactly as it was before.
 *
 * Nothing here touches `window` at import: the module is evaluated during a
 * server render too, so the loop, the observer and the media query are created
 * by the first `register`.
 */


let boards = [];
let raf = 0, last = 0;
let io = null, rm = null;

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  let any = false;
  for (const b of boards.slice()) if (b.vis && b.awake) {
    try { b.awake = !!b.tick(dt, now); } catch (err) { b.awake = false; setTimeout(() => { throw err; }); }
    any = any || b.awake;
  }
  raf = any ? requestAnimationFrame(frame) : 0;
}

function wake(b) { b.awake = true; if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

const onMotion = () => { setReducedMotion(!!rm?.matches); boards.forEach(wake); };

function start() {
  if (io) return;
  io = new IntersectionObserver((es) => {
    for (const e of es) for (const b of boards) if (b.stage === e.target) { b.vis = e.isIntersecting; if (b.vis) wake(b); }
  }, { rootMargin: "80px" });
  rm = matchMedia("(prefers-reduced-motion: reduce)");
  setReducedMotion(rm.matches);
  rm.addEventListener("change", onMotion);
}

function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  io?.disconnect(); io = null;
  rm?.removeEventListener("change", onMotion); rm = null;
}

/** Joins the shared loop. Runs the tick once now, then every frame while its stage is near the viewport and it keeps returning true. */
function register(stage, tick) {
  start();
  /* starts visible and the observer turns it off when it scrolls away, so a
     figure is drawn before the first observer callback and a headless run,
     which may never deliver one, still animates. */
  const b = { stage, tick, vis: true, awake: true };
  boards.push(b);
  io.observe(stage);
  tick(0, performance.now());
  let gone = false;
  return {
    wake: () => { if (!gone) wake(b); },
    unregister: () => {
      if (gone) return;
      gone = true;
      boards = boards.filter((x) => x !== b);
      io?.unobserve(stage);
      if (!boards.length) stop();
    },
  };
}

/** Steps every visible board once with a synthetic dt. For a deterministic capture, where rAF may not advance. */
function advance(dt, now) {
  for (const b of boards) if (b.vis) {
    try { b.awake = !!b.tick(dt, now); } catch { b.awake = false; }
  }
}

/** Pointer input in viewBox units. Returns the disposer. */
function pointer(stage, on) {
  const pt = (e) => {
    const r = stage.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 400, ((e.clientY - r.top) / r.height) * 320];
  };
  const move = (e) => on.move?.(pt(e), e);
  const down = (e) => { if (e.pointerType !== "mouse") stage.releasePointerCapture?.(e.pointerId); (on.down ?? on.move)?.(pt(e), e); };
  const leave = (e) => on.leave?.(e);
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerdown", down);
  stage.addEventListener("pointerleave", leave);
  return () => {
    stage.removeEventListener("pointermove", move);
    stage.removeEventListener("pointerdown", down);
    stage.removeEventListener("pointerleave", leave);
  };
}

/** Collects a figure's tear-down, so its `destroy` can be `bag.dispose`. */
function disposer() {
  let fns = [];
  return {
    add: (fn) => { fns.push(fn); },
    on: (target, type, fn, opts) => { const h = fn; target.addEventListener(type, h, opts); fns.push(() => target.removeEventListener(type, h, opts)); },
    dispose: () => { const run = fns; fns = []; for (let i = run.length - 1; i >= 0; i--) run[i](); },
  };
}

/**
 * eli5 · theme — the stylesheet, as a string, and the one function that puts it
 * in a document or a shadow root. Every selector is inside `:where()`, so each
 * rule has zero specificity: a rule of the page's always wins. Light is the
 * default; `.dark`/`[data-theme="dark"]` and the figure's own `data-theme`
 * override it. The `--eli5-*` properties are the public theme.
 */
const LIGHT = { plate: "#ffffff", hi: "#1b1b1e", mid: "#7b7b84", lo: "#c8c8ce", edge: "#3a3a40" };
const DARK = { plate: "#0b0b0d", hi: "#e6e6ea", mid: "#8b8b93", lo: "#33333a", edge: "#9a9aa2" };
const KEYS = ["plate", "hi", "mid", "lo", "edge"];
const vars = (p) => KEYS.map((k) => `--el-${k}:var(--eli5-${k},${p[k]});`).join("");
const S = ":where([data-eli5]>svg)";

/** The stylesheet, as a string. */
function css() {
  return [
    `:where([data-eli5]){display:block;position:relative;aspect-ratio:5/4;touch-action:pan-y;user-select:none;-webkit-user-select:none;--el-sw:var(--eli5-stroke,0.9);${vars(LIGHT)}}`,
    `:where(.dark,[data-theme="dark"]) :where([data-eli5]){${vars(DARK)}}`,
    `:where([data-eli5][data-eli5-theme="dark"]){${vars(DARK)}}`,
    `${S}{position:absolute;inset:0;width:100%;height:100%;display:block}`,
    `${S} :where(path,polygon,ellipse,line){fill:var(--el-plate);stroke:var(--el-mid);stroke-width:var(--el-sw);vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}`,
    `${S} :where(.el-nf){fill:none}`,
    `${S} :where(.el-sil){stroke:var(--el-edge)}`,
    `${S} :where(.el-cr){fill:none;stroke:var(--el-lo)}`,
    `${S} :where(.el-hi){stroke:var(--el-hi)}`,
    `${S} :where(.el-lo){fill:none;stroke:var(--el-lo)}`,
    `${S} :where(.el-dash){fill:none;stroke:var(--el-mid);stroke-dasharray:1 3}`,
    `${S} :where(.el-dot){stroke:none;fill:var(--el-hi)}`,
    `${S} :where(.el-dot.m){fill:var(--el-mid)}`,
  ].join("");
}

const done = new WeakSet();

/** Puts the stylesheet in a document or a shadow root, once. */
function inject(root) {
  if (done.has(root)) return;
  done.add(root);
  const doc = root.nodeType === 9 ? root : root.ownerDocument;
  const win = doc.defaultView;
  const text = css();
  if (win && "adoptedStyleSheets" in root) {
    try {
      const sheet = new win.CSSStyleSheet();
      sheet.replaceSync(text);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      return;
    } catch { /* fall through */ }
  }
  const style = doc.createElement("style");
  style.setAttribute("data-eli5-style", "");
  style.textContent = text;
  (root.nodeType === 9 ? doc.head ?? doc.documentElement : root).appendChild(style);
}

/**
 * eli5 · tour — an unseen pointer that walks a figure's stops, so a stranger
 * sees the interaction with no hand on the page. It emits real pointer events
 * on the stage (tagged `ghost`), so the figure needs to know nothing about it;
 * a real pointer or focus takes over and the tour resumes when they leave.
 */



/** The default stops: a diamond around the centre, then a leave. */
const LAP = [[128, 150], [200, 118], [272, 150], [200, 206], null];

const TRAVEL = 900, DWELL = 1200, REST = 1800, RESUME = 1200, STAGGER = 450;
let started = 0;

/** Where a pointer heading for `p` first touches the viewBox: the ray from the centre through `p` meets the edge. */
function entry([x, y]) {
  const dx = x - 200, dy = y - 160;
  if (!dx && !dy) return [200, 320];
  const k = Math.min(dx ? (dx > 0 ? 200 : -200) / dx : Infinity, dy ? (dy > 0 ? 160 : -160) / dy : Infinity);
  return [200 + dx * k, 160 + dy * k];
}

/** Walks `stops` on `stage`, `[x, y]` in viewBox units or null to leave. Returns `{ stop }`. */
function tour(stage, stops = LAP, onStop) {
  let i = 0;
  let wait = RESUME + STAGGER * (started++ % 4);
  let t = -1, at = null, origin = [200, 320], hand = false, gone = false;
  const move = (p) => {
    const r = stage.getBoundingClientRect();
    stage.dispatchEvent(new PointerEvent("pointermove", { clientX: r.left + (p[0] / 400) * r.width, clientY: r.top + (p[1] / 320) * r.height, bubbles: true, pointerType: "ghost" }));
  };
  const leave = () => stage.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "ghost" }));
  const onReal = (e) => { if (e.pointerType === "ghost") return; hand = true; at = null; t = -1; };
  const onRealLeave = (e) => { if (e.pointerType === "ghost") return; hand = false; i = 0; t = -1; wait = RESUME; loop.wake(); };

  const tick = (dt) => {
    if (hand || !stops.length) return false;
    if (wait > 0) { wait -= dt * 1000; return true; }
    const stop = stops[i];
    if (stop === null) { if (at) leave(); onStop?.(i); i = (i + 1) % stops.length; wait = REST; return true; }
    if (t < 0) { origin = at ?? entry(stop); t = 0; }
    t = Math.min(TRAVEL, t + dt * 1000);
    const k = EASE(t / TRAVEL);
    at = [origin[0] + (stop[0] - origin[0]) * k, origin[1] + (stop[1] - origin[1]) * k];
    move(at);
    if (t < TRAVEL) return true;
    onStop?.(i); i = (i + 1) % stops.length; t = -1; wait = DWELL;
    return true;
  };

  stage.addEventListener("pointermove", onReal);
  stage.addEventListener("pointerleave", onRealLeave);
  const loop = register(stage, tick);

  return {
    stop() {
      if (gone) return;
      gone = true;
      loop.unregister();
      stage.removeEventListener("pointermove", onReal);
      stage.removeEventListener("pointerleave", onRealLeave);
      if (at) leave();
    },
  };
}

/**
 * eli5 · audit — the measured gate, lightweight and honest about being an
 * approximation. Every solid is drawn through `draw`, which records its shape;
 * this reads them back and checks, from axis-aligned footprints and the camera,
 * three things the eye misses:
 *
 *   order      a solid painted before a solid that is nearer on screen
 *   support    a solid that rests on nothing and floats
 *   clearance  two solids that pass through each other
 *
 * It is not a proof: footprints are boxes, not the true outline, so it is
 * generous with tolerances on purpose. It finds the gross faults, and the look
 * (by eye) finds the rest.
 */



const aabb = (s) => {
  if (s.kind === "box") return [s.x0, s.y0, s.z0, s.x1, s.y1, s.z1];
  if (s.kind === "cyl") return [s.cx - s.r, s.cy - s.r, s.z0, s.cx + s.r, s.cy + s.r, s.z1];
  if (s.kind === "turn") {
    const ps = s.prof, R = Math.max(...ps.map((p) => p[1]));
    return [-R, -R, Math.min(...ps.map((p) => p[0])), R, R, Math.max(...ps.map((p) => p[0]))];
  }
  return [0, 0, 0, 0, 0, 0];
};
const xyOverlap = (a, b, tol) => a[0] < b[3] + tol && b[0] < a[3] + tol && a[1] < b[4] + tol && b[1] < a[4] + tol;
const span = (a, b) => Math.min(a[5], b[5]) - Math.max(a[2], b[2]); // > 0 overlap in z; < 0 gap

/** Representative world points on a shape, so its screen box is of the shape, not of its bounding box. */
function samplePoints(s) {
  const [x0, y0, z0, x1, y1, z1] = aabb(s);
  const pts = [];
  if (s.kind === "cyl" || s.kind === "turn") {
    const R = s.kind === "cyl" ? s.r : Math.max(...s.prof.map((p) => p[1]));
    const cx = s.kind === "cyl" ? s.cx : 0, cy = s.kind === "cyl" ? s.cy : 0;
    for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; for (const z of [z0, z1]) pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R, z]); }
  } else {
    for (const X of [x0, x1]) for (const Y of [y0, y1]) for (const Z of [z0, z1]) pts.push([X, Y, Z]);
  }
  return pts;
}

function screenBox(s, P) {
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (const [X, Y, Z] of samplePoints(s)) {
    const q = P(X, Y, Z);
    a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]);
  }
  return [a, c, b, d];
}
/** The screen area two boxes share in px², so a hairline edge touch is not an overlap. */
const sbArea = (p, q) => Math.max(0, Math.min(p[2], q[2]) - Math.max(p[0], q[0])) * Math.max(0, Math.min(p[3], q[3]) - Math.max(p[1], q[1]));
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const inBox = (p, b) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
const xzOverlap = (a, b, tol) => a[0] < b[3] + tol && b[0] < a[3] + tol && a[2] < b[5] + tol && b[2] < a[5] + tol;

/** Runs the three checks over what `draw` recorded, at the rest pose. Returns `{ ok, lines, failures }`. */
function audit(options = {}) {
  const order = options.order ?? 2.5, touch = options.touch ?? 0.35, into = options.into ?? 0.5, area = options.area ?? 6;
  const C = lastCamera;
  if (!C) return { ok: false, lines: ["  ✗ audit: no camera was recorded"], failures: 1 };
  const shapes = recorded();
  const P = proj(C), v = viewOf(C);
  const A = shapes.map((r) => {
    const box = aabb(r.shape);
    const pts = samplePoints(r.shape).map((p) => { const q = P(p[0], p[1], p[2]); return [q[0], q[1], p[0] * v[0] + p[1] * v[1] + p[2] * v[2]]; });
    return { name: r.name, box, sb: screenBox(r.shape, P), pts };
  });

  const lines = [];
  let failures = 0;
  const fail = (s) => { failures++; lines.push(`  ✗ ${s}`); };

  /* order: paint order is the recorded order. Compare depth where the two actually
     overlap on screen, not at their centroids, so a large backdrop is not mistaken
     for a near part. */
  for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
    if (A[i].name === A[j].name) continue;
    if (sbArea(A[i].sb, A[j].sb) < area) continue;
    const di = A[i].pts.filter((p) => inBox(p, A[j].sb)).map((p) => p[2]);
    const dj = A[j].pts.filter((p) => inBox(p, A[i].sb)).map((p) => p[2]);
    if (!di.length || !dj.length) continue;
    if (median(di) - median(dj) > order) fail(`order: ${A[i].name} paints before ${A[j].name} but ${A[i].name} is nearer where they overlap (at rest)`);
  }

  /* support: stands on the ground or another part, or is mounted on a backer behind it */
  const ground = Math.min(...A.map((x) => x.box[2]));
  for (const a of A) {
    if (a.box[2] <= ground + touch) continue;
    const stood = A.some((b) => b !== a && xyOverlap(a.box, b.box, 0) && b.box[5] >= a.box[2] - touch && b.box[2] < a.box[2]);
    const backed = A.some((b) => b !== a && xzOverlap(a.box, b.box, 0) && b.box[4] <= a.box[1] + touch);
    if (!stood && !backed) fail(`support: ${a.name} rests on nothing`);
  }

  /* clearance: footprints and heights both overlap by more than a hair */
  for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
    const a = A[i].box, b = A[j].box;
    const zs = span(a, b);
    if (zs <= into) continue;                             // touching or apart, not passing through
    const inX = Math.min(a[3], b[3]) - Math.max(a[0], b[0]);
    const inY = Math.min(a[4], b[4]) - Math.max(a[1], b[1]);
    if (inX > into && inY > into) fail(`clearance: ${A[i].name} and ${A[j].name} pass through each other by ${Math.min(inX, inY, zs).toFixed(1)}`);
  }

  return { ok: failures === 0, lines, failures, items: A.length };
}
return { cam, proj, unproj, fit, facing, viewOf, rrect, circ, circAt, ringAt, run, hull, poly, open, seg, clamp, lerp, rad, r2, prism, slab, cylinder, lathe, spring, stepS, tween, tset, tval, tdone, EASE, reducedMotion, setReducedMotion, mk, solid, put, draw, line, dot, place, group, setRecording, register, advance, pointer, disposer, audit, css, inject, tour, LAP };
})();
export { EL };
