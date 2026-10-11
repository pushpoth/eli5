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

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rad = (d) => (d * Math.PI) / 180;
/** Two decimals: enough for a hairline at any zoom, and path strings stay short. */
export const r2 = (n) => Math.round(n * 100) / 100;

/** A closed path through the points. */
export const poly = (pts) => "M" + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L") + "Z";
/** One straight segment, as its own subpath. */
export const seg = (a, b) => `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`;
/** An open polyline; empty for fewer than two points. */
export const open = (pts) => (pts.length < 2 ? "" : "M" + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L"));

/* ---------- projection ---------- */

/** An orthographic camera. `az` is in radians, `k` is sin(elevation) (.5 is the 2:1 view), `S` the scale. */
export const cam = (azDeg, k, S) => ({ az: rad(azDeg), k, S, ox: 0, oy: 0 });

/** The projector for the camera as it is now. */
export function proj(C) {
  const c = Math.cos(C.az), s = Math.sin(C.az), zf = Math.sqrt(1 - C.k * C.k);
  return (x, y, z) => [C.ox + C.S * (x * c - y * s), C.oy + C.S * ((x * s + y * c) * C.k - z * zf)];
}

/** The ground-plane inverse: the world x/y under a screen point, on the plane at height z. */
export function unproj(C, sx, sy, z) {
  const c = Math.cos(C.az), s = Math.sin(C.az), zf = Math.sqrt(1 - C.k * C.k);
  const X = (sx - C.ox) / C.S, Y = ((sy - C.oy) / C.S + z * zf) / C.k;
  return [X * c + Y * s, -X * s + Y * c];
}

/** Sets the camera's offset so the bounding box of `pts` is centred on (cx, cy). It centres; it never scales. */
export function fit(C, pts, cx, cy) {
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
export const facing = (C) => {
  const s = Math.sin(C.az), c = Math.cos(C.az);
  return (q) => q.nu * s + q.nv * c >= -1e-6;
};

/* ---------- rounded rings ---------- */

/** A rounded rectangle outline, sampled. Each sample carries its outward normal. `n` samples per corner. */
export function rrect(u0, v0, u1, v1, r, n = 4) {
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
export function circ(R, n = 48) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    out.push({ u: R * ca, v: R * sa, nu: ca, nv: sa });
  }
  return out;
}

/** A circle about (cx, cy). */
export const circAt = (cx, cy, R, n = 48) => circ(R, n).map((q) => ({ u: cx + q.u, v: cy + q.v, nu: q.nu, nv: q.nv }));

/** A ring laid flat at height z, projected. */
export const ringAt = (P, ring, z) => ring.map((q) => P(q.u, q.v, z));

/** Convex hull (monotone chain), counter-clockwise in screen space. */
export function hull(input) {
  const pts = input.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length > 1 && x(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length > 1 && x(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop();
  return lo.concat(up);
}

/** The one cyclic run of samples that pass `keep`, in ring order. */
export function run(ring, keep) {
  const n = ring.length;
  let s = -1;
  for (let i = 0; i < n; i++) if (keep(ring[i]) && !keep(ring[(i + n - 1) % n])) { s = i; break; }
  if (s < 0) return keep(ring[0]) ? ring.slice() : [];
  const out = [];
  for (let k = 0; k < n && keep(ring[(s + k) % n]); k++) out.push(ring[(s + k) % n]);
  return out;
}
