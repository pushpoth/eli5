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
import { rrect, circ, circAt, ringAt, hull, run, poly, open } from "./iso.js";

/** A prism standing from z0 to z1: `{ sil, top, crease }`. `top` is the lid, filled lighter than the body so the solid has volume. */
export function prism(P, front, ring, inner, z0, z1) {
  return {
    sil: poly(hull(ringAt(P, ring, z1).concat(ringAt(P, ring, z0)))),
    top: poly(ringAt(P, ring, z1)),
    crease: inner ? open(ringAt(P, run(inner, front), z1)) : "",
  };
}

/** A rounded box from (x0, y0) to (x1, y1), from z0 to z1. */
export function slab(x0, y0, x1, y1, r, z0, z1, P, front, { inset = 1.1, steps = 4 } = {}) {
  const ring = rrect(x0, y0, x1, y1, r, steps);
  const inner = inset > 0 ? rrect(x0 + inset, y0 + inset, x1 - inset, y1 - inset, Math.max(0.3, r - inset), steps) : null;
  return { paths: prism(P, front, ring, inner, z0, z1), shape: { kind: "box", x0, y0, x1, y1, z0, z1, r } };
}

/** A round post, puck, foot or boss about (cx, cy), from z0 to z1. */
export function cylinder(cx, cy, r, z0, z1, P, front, steps = 32) {
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
export function lathe(prof, P, front, { steps = 48 } = {}) {
  const rings = prof.map(([z, r]) => ringAt(P, circ(r, steps), z));
  const sil = poly(hull(rings.flat()));
  const [tz, tr] = prof[prof.length - 1];
  const top = tr > 0.6 ? poly(ringAt(P, circ(tr, steps), tz)) : "";
  const crease = open(ringAt(P, run(circ(Math.max(0.3, tr - 1.1), steps), front), tz));
  return { paths: { sil, top, crease }, shape: { kind: "turn", prof, steps } };
}
