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
import { lastCamera, proj, viewOf } from "./iso.js";
import { recorded } from "./dom.js";

const aabb = (s) => {
  if (s.kind === "box") return [s.x0, s.y0, s.z0, s.x1, s.y1, s.z1];
  if (s.kind === "cyl") return [s.cx - s.r, s.cy - s.r, s.z0, s.cx + s.r, s.cy + s.r, s.z1];
  if (s.kind === "turn") {
    const ps = s.prof, R = Math.max(...ps.map((p) => p[1]));
    return [-R, -R, Math.min(...ps.map((p) => p[0])), R, R, Math.max(...ps.map((p) => p[0]))];
  }
  if (s.kind === "ringY") return [s.cx - s.rOut, s.y, s.cz - s.rOut, s.cx + s.rOut, s.y, s.cz + s.rOut];
  if (s.kind === "turnY") {
    const ps = s.prof, R = Math.max(...ps.map((p) => p[1])), ys = ps.map((p) => p[0]);
    return [s.cx - R, Math.min(...ys), s.cz - R, s.cx + R, Math.max(...ys), s.cz + R];
  }
  if (s.kind === "turnX") {
    const ps = s.prof, R = Math.max(...ps.map((p) => p[1])), xs = ps.map((p) => p[0]);
    return [Math.min(...xs), s.cy - R, s.cz - R, Math.max(...xs), s.cy + R, s.cz + R];
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
  } else if (s.kind === "turnX") {
    for (const [x, r] of s.prof) for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; pts.push([x, s.cy + Math.cos(a) * r, s.cz + Math.sin(a) * r]); }
  } else if (s.kind === "turnY") {
    for (const [y, r] of s.prof) for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; pts.push([s.cx + Math.cos(a) * r, y, s.cz + Math.sin(a) * r]); }
  } else if (s.kind === "ringY") {
    for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; pts.push([s.cx + Math.cos(a) * s.rOut, s.y, s.cz + Math.sin(a) * s.rOut]); }
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
export function audit(options = {}) {
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
