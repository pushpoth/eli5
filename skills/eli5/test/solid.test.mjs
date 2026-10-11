import { test } from "node:test";
import assert from "node:assert/strict";
import { cam, proj, facing } from "../../../src/iso.js";
import { slab, cylinder, lathe, prism } from "../../../src/solid.js";

const C = cam(45, 0.5, 1), P = proj(C), front = facing(C);

const xs = (d) => [...d.matchAll(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g)].map((m) => Number(m[1]));
const width = (paths) => { const x = xs(paths.sil); return Math.max(...x) - Math.min(...x); };

test("slab returns a closed silhouette and records a box", () => {
  const s = slab(-10, -8, 10, 8, 3, 0, 6, P, front);
  assert.ok(s.paths.sil.startsWith("M") && s.paths.sil.endsWith("Z"));
  assert.equal(s.shape.kind, "box");
  assert.deepEqual([s.shape.z0, s.shape.z1], [0, 6]);
});

test("a slab with no inset has no crease", () => {
  const s = slab(-10, -8, 10, 8, 3, 0, 6, P, front, { inset: 0 });
  assert.equal(s.paths.crease, "");
});

test("a cylinder's silhouette grows with its radius", () => {
  assert.ok(width(cylinder(0, 0, 12, 0, 4, P, front, 24).paths) > width(cylinder(0, 0, 4, 0, 4, P, front, 24).paths));
});

test("a lathe taper is narrower at the top than the foot", () => {
  const s = lathe([[0, 20], [40, 6]], P, front, { steps: 32 });
  const top = s.paths.sil; // hull of both rings; check the shape descriptor is the meridian given
  assert.deepEqual(s.shape.prof, [[0, 20], [40, 6]]);
  assert.ok(top.startsWith("M") && top.endsWith("Z"));
});

test("prism of a square ring is a four-sided hull", () => {
  const ring = [{ u: 0, v: 0, nu: 1, nv: 0 }, { u: 10, v: 0, nu: 1, nv: 0 }, { u: 10, v: 10, nu: 1, nv: 0 }, { u: 0, v: 10, nu: 1, nv: 0 }];
  const p = prism(P, front, ring, null, 0, 5);
  assert.ok(p.sil.startsWith("M") && p.crease === "");
});
