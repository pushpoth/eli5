/**
 * eli5 · parts — a small library of the details that make a machine read: the
 * knurl on a knob, a seam or band around a body, a bolt ring. Each returns a
 * path `d` for `line`, and each draws only what faces the camera, so a figure
 * does not have to work out visibility. These are the details a real object
 * really has; a machine without them is a row of blocks.
 */
import { circ, rrect, run, ringAt, open, seg } from "./iso.js";

/** Vertical knurl lines on the visible half of a cylinder: a knob or a thumb screw. */
export function knurl(cx, cy, r, z0, z1, n, P, front, out = 0.15, phase = 0) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * 2 * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
    if (!front({ nu: ca, nv: sa })) continue;
    d += seg(P(cx + ca * (r + out), cy + sa * (r + out), z0), P(cx + ca * (r + out), cy + sa * (r + out), z1));
  }
  return d;
}

/** The visible front run of a horizontal circle on a cylinder: a seam, band or bevel line. */
export function sideArc(cx, cy, r, z, P, front, n = 40) {
  const ring = circ(r, n).map((q) => ({ u: cx + q.u, v: cy + q.v, nu: q.nu, nv: q.nv }));
  return open(ringAt(P, run(ring, front), z));
}

/** The visible near run of a rounded plan at height z: a seam or weld line on a box, wrapping its corners. */
export function sideSeam(x0, y0, x1, y1, r, z, P, front, steps = 4) {
  return open(ringAt(P, run(rrect(x0, y0, x1, y1, r, steps), front), z));
}

/** Screen points of a bolt circle on a face at height z, for `dot`. */
export function boltRing(cx, cy, r, count, z, P, front, phase = 0) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * 2 * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
    if (!front({ nu: ca, nv: sa })) continue;
    out.push(P(cx + ca * r, cy + sa * r, z));
  }
  return out;
}
