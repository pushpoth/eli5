/**
 * shutter — the focal-plane shutter of a 35 mm camera, seen from the front:
 * the film gate, two curtains (first and second) with the exposure slit between
 * them, a winding knob and a sprocket. The curtains travel together at one
 * speed, so how long the film is exposed is the width of the slit: the pointer
 * widens the slit and the read-out names the shutter speed. At rest the shutter
 * is nearly closed. intensity is the widest slit, so a stronger setting lets the
 * pointer reach a slower speed.
 *
 * A figure creates its solids and draws them in the same order it wants them
 * painted: the audit reads paint order from the order `draw` was called.
 */
const W = 36, H = 48, CY = H / 2, EDGE = 4;       // the gate, and the film's sprocket margins
const STOPS = [[1.6, "1000"], [2.6, "500"], [4, "250"], [6, "125"], [9, "60"], [13, "30"], [19, "15"]];
const speed = (s) => STOPS.reduce((a, b) => (Math.abs(b[0] - s) < Math.abs(a[0] - s) ? b : a))[1];

function mount({ stage, svg, read }, value) {
  const bag = EL.disposer();
  const C = EL.cam(45, 0.5, 1.95);
  EL.fit(C, [[-6, -12, -6], [W + 20, -12, -6], [W + 20, -12, H + 6], [-6, -12, H + 6], [W + 20, 8, 0]], 200, 162);
  const P = EL.proj(C), front = EL.facing(C);
  const g = EL.mk("g", {}, svg);

  let over = null, last = NaN;
  let A, B, slats, slit;
  /** Paints the two curtains at slit `s`. `record` draws them once, in paint order, for the audit. */
  const paint = (s, record) => {
    if (!record && s === last) return;
    last = s;
    const za = CY + s / 2, zb = CY - s / 2;
    const pa = EL.slab(EDGE, 1, W - EDGE, 5, 0.6, za, H, P, front, { inset: 0.8 });
    const pb = EL.slab(EDGE, 1, W - EDGE, 5, 0.6, 0, zb, P, front, { inset: 0.8 });
    if (record) {
      EL.draw(A, pa, { name: "curtain", at: [W / 2, 3, (za + H) / 2] });
      EL.draw(B, pb, { name: "curtain", at: [W / 2, 3, zb / 2] });
    } else { EL.put(A, pa.paths); EL.put(B, pb.paths); }
    let d = "";
    for (let z = za + 4; z < H - 1; z += 4) d += EL.seg(P(EDGE + 1, 5.06, z), P(W - EDGE - 1, 5.06, z));
    for (let z = zb - 4; z > 1; z -= 4) d += EL.seg(P(EDGE + 1, 5.06, z), P(W - EDGE - 1, 5.06, z));
    slats.innerHTML = `<path class="el-lo" d="${d}"/>`;
    slit.setAttribute("d", EL.seg(P(EDGE + 1, 5.12, CY), P(W - EDGE - 1, 5.12, CY)));
    read.textContent = over ? `1/${speed(s)} s` : "rest";
  };

  // body → film → curtains → frame → drive, in paint order
  EL.draw(EL.solid(g), EL.slab(-6, -12, W + 9, -5, 3, -6, H + 6, P, front, { inset: 2.2 }), { name: "body", at: [W / 2, -8, H / 2] });
  EL.draw(EL.solid(g), EL.slab(0, -4, W, -1, 1, 0, H, P, front, { inset: 0 }), { name: "film", at: [W / 2, -2.5, H / 2] });
  for (const x of [2, W - 2]) for (let z = 5; z < H - 3; z += 6) { const d = EL.dot(g, C, 0.8, "el-dot m"); EL.place(d, P(x, -0.9, z)); }
  for (const [x0, x1] of [[-4, 0], [W, W + 4]]) EL.draw(EL.solid(g), EL.slab(x0, -2, x1, 1, 1, 0, H, P, front, { inset: 0.8 }), { name: "rail", at: [(x0 + x1) / 2, -0.5, H / 2] });
  for (const [z0, z1] of [[-4, 0], [H, H + 4]]) EL.draw(EL.solid(g), EL.slab(-4, -2, W + 4, 1, 1, z0, z1, P, front, { inset: 0.8 }), { name: "rail", at: [W / 2, -0.5, (z0 + z1) / 2] });
  A = EL.solid(g); B = EL.solid(g); slats = EL.mk("g", {}, g); slit = EL.line(g, "", "el-hi");
  paint(value * 0.4, true);
  EL.draw(EL.solid(g), EL.cylinder(W + 12, 2, 7, -2, 10, P, front, 32), { name: "knob", at: [W + 12, 2, 4] });
  let kd = ""; for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8; kd += EL.seg(P(W + 12 + Math.cos(a) * 6.3, 2 + Math.sin(a) * 6.3, 10), P(W + 12 + Math.cos(a) * 7, 2 + Math.sin(a) * 7, 10)); }
  EL.line(g, kd, "el-lo");
  EL.draw(EL.solid(g), EL.cylinder(W + 12, 2, 4.5, 14, 20, P, front, 28), { name: "sprocket", at: [W + 12, 2, 17] });
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; const d = EL.dot(g, C, 0.8, "el-dot m"); EL.place(d, P(W + 12 + Math.cos(a) * 3.2, 2 + Math.sin(a) * 3.2, 20)); }

  const sp = EL.spring(value * 0.4, { eps: 0.01 });
  const loop = EL.register(stage, (dt) => { const m = EL.stepS(sp, dt); paint(sp.x, false); return m; });
  bag.add(loop.unregister);
  const retarget = () => { sp.t = over ? EL.clamp((over[0] / W) * value, 1.2, value) : value * 0.4; loop.wake(); };
  bag.add(EL.pointer(stage, {
    move: (p) => { over = EL.unproj(C, p[0], p[1], 2.5); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { value = v; if (over) retarget(); }, destroy: bag.dispose };
}

figure({
  name: "shutter",
  means: "A focal-plane shutter: the pointer widens the slit between the two curtains, and the read-out names the shutter speed.",
  rule: [1, 3, 4, 9],
  range: [10, 16, 24],
  rest: "rest",
  tour: [[90, 150], [200, 130], [310, 150], [200, 200], null],
  parts: [
    { name: "film", shows: ["a portrait frame", "sprocket holes down both edges"] },
    { name: "curtain", shows: ["horizontal slats", "a wound edge"] },
    { name: "slit", shows: ["the light between the two curtains"] },
  ],
  mount,
});
