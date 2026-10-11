/**
 * boulders — a test figure, not a real one. It is the boulder case from the
 * anatomy prototype: a base with three rocks that are flat low cylinders, so
 * they pass the measured gate and read as coins. Its read.json answers the read
 * honestly (`rock: no`), so `read.mjs` fails where `audit.mjs` passes. It exists
 * to prove that the read gate catches what the audit cannot.
 */
function mount({ stage, svg }, value) {
  const bag = EL.disposer();
  const C = EL.cam(45, 0.5, 1.5);
  EL.fit(C, [[-42, -42, 0], [42, 42, 0], [-42, 42, 0], [42, -42, 0], [0, 0, 8]], 200, 166);
  const P = EL.proj(C), front = EL.facing(C), g = EL.mk("g", {}, svg);
  EL.draw(EL.solid(g), EL.slab(-42, -42, 42, 42, 8, -6, 0, P, front, { inset: 1.6 }), { name: "ground", at: [0, 0, -3] });
  for (const [x, y] of [[-20, 8], [18, 12], [4, -18]]) {
    EL.draw(EL.solid(g), EL.cylinder(x, y, 10, 0, Math.max(1, value * 0.12), P, front, 20), { name: "rock", at: [x, y, 1] });
  }
  EL.register(stage, () => false);
  EL.pointer(stage, {});
  return { set() {}, destroy: bag.dispose };
}

figure({
  name: "boulders",
  means: "A test figure: rocks drawn as flat discs, to prove the read gate fails what the audit passes.",
  rule: [5, 9],
  range: [8, 16, 24],
  rest: "rest",
  tour: [[120, 160], [280, 160], [200, 220]],
  parts: [
    { name: "ground", shows: ["a floor"] },
    { name: "rock", shows: ["a faceted top", "a shadowed side", "a contact with the ground"] },
  ],
  mount,
});
