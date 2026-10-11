import { test } from "node:test";
import assert from "node:assert/strict";
import { cam, proj, unproj, fit, hull, rrect, circ, facing, ringAt } from "../../../src/iso.js";

test("proj and unproj round-trip on a plane", () => {
  const C = cam(45, 0.5, 2);
  fit(C, [[-10, -10, 0], [10, 10, 0]], 200, 160);
  const P = proj(C);
  const w = [3, -4, 7];
  const s = P(w[0], w[1], w[2]);
  const back = unproj(C, s[0], s[1], 7);
  assert.ok(Math.abs(back[0] - w[0]) < 1e-6 && Math.abs(back[1] - w[1]) < 1e-6);
});

test("hull of a square with an interior point is four points", () => {
  assert.equal(hull([[0, 0], [10, 0], [10, 10], [0, 10], [5, 5]]).length, 4);
});

test("rrect has 4*(n+1) samples", () => {
  assert.equal(rrect(-5, -5, 5, 5, 2, 4).length, 20);
});

test("the corner radius is clamped to half the shorter side", () => {
  const r = rrect(0, 0, 4, 20, 50, 1);
  const us = r.map((q) => q.u);
  assert.ok(Math.min(...us) >= -1e-9 && Math.max(...us) <= 4 + 1e-9);
});

test("facing keeps the near half of a ring, not all or none", () => {
  const keep = facing(cam(45, 0.5, 1));
  const near = circ(10, 16).filter(keep);
  assert.ok(near.length > 0 && near.length < 16);
});

test("ringAt projects every sample", () => {
  const C = cam(45, 0.5, 1);
  const P = proj(C);
  const pts = ringAt(P, circ(10, 8), 3);
  assert.equal(pts.length, 8);
  assert.ok(pts.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])));
});
