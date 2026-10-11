/**
 * shutter — the focal-plane shutter of a 35 mm camera, seen head-on. The camera
 * is drawn with its shutter at the centre of the lens: the two curtains and the
 * slit between them. The curtains travel at one speed, so how long the film is
 * exposed is the width of the slit — the pointer widens the slit and the
 * read-out names the shutter speed. At rest the shutter is nearly closed.
 * intensity is the widest slit, so a stronger setting reaches a slower speed.
 */
const BW = 36, BH = 40, BY = 16;              // the body's half-width/height, and its front face
const LX = 0, LZ = 20, GAP = 9;              // the lens, and the shutter opening inside it
const STOPS = [[1.6, "1000"], [2.6, "500"], [4, "250"], [6, "125"], [9, "60"], [13, "30"], [19, "15"]];
const speed = (s) => STOPS.reduce((a, b) => (Math.abs(b[0] - s) < Math.abs(a[0] - s) ? b : a))[1];

function mount({ stage, svg, read }, value) {
  const bag = EL.disposer();
  const C = EL.cam(45, 0.5, 1);
  EL.frame(C, [
    [-BW, -20, 0], [BW, -20, 0], [BW, BY, 0], [-BW, BY, 0],
    [-BW, -20, BH + 13], [BW, -20, BH + 13], [BW, BY, BH + 13], [-BW, BY, BH + 13],
  ], { fill: 0.85 });
  const P = EL.proj(C), front = EL.facing(C);
  const g = EL.mk("g", {}, svg);
  /** A circle drawn on the vertical front face (the x–z plane at y). */
  const ringOnFace = (cx, cz, r, y, n = 48) => EL.poly([...Array(n)].map((_, i) => { const t = (i / n) * 2 * Math.PI; return P(cx + Math.cos(t) * r, y, cz + Math.sin(t) * r); }));

  // the body, and the top plate with the wind lever and the shutter button
  EL.draw(EL.solid(g), EL.slab(-BW, -20, BW, BY, 5, 0, BH, P, front, { inset: 2.2 }), { name: "body", at: [0, -2, BH / 2] });
  EL.line(g, EL.sideSeam(-BW, -20, BW, BY, 5, BH - 6, P, front, 5), "el-lo");
  EL.line(g, EL.sideSeam(-BW, -20, BW, BY, 5, 4, P, front, 5), "el-lo");
  EL.draw(EL.solid(g), EL.slab(-BW + 2, -18, BW - 2, BY - 2, 4, BH, BH + 4, P, front, { inset: 1.4 }), { name: "top", at: [0, -2, BH + 2] });
  EL.draw(EL.solid(g), EL.slab(-9, -17, 9, 1, 2, BH + 4, BH + 13, P, front, { inset: 1 }), { name: "prism", at: [0, -8, BH + 8] });
  EL.draw(EL.solid(g), EL.cylinder(23, 4, 3.2, BH + 4, BH + 8, P, front, 24), { name: "release", at: [23, 4, BH + 6] });
  EL.line(g, EL.knurl(23, 4, 3.2, BH + 4, BH + 8, 14, P, front), "el-lo");
  EL.draw(EL.solid(g), EL.cylinder(-26, 2, 4.6, BH + 4, BH + 10, P, front, 28), { name: "rewind", at: [-26, 2, BH + 7] });
  const knobK = EL.line(g, "", "el-lo"), knobI = EL.line(g, "", "el-lo");   // the knob turns with the shutter
  EL.draw(EL.solid(g), EL.cylinder(-23, -14, 2, BH + 4, BH + 6, P, front, 16), { name: "lever.pivot", at: [-23, -14, BH + 5] });
  EL.draw(EL.solid(g), EL.slab(-33, -16, -19, -12, 1, BH + 6, BH + 7, P, front, { inset: 0.4 }), { name: "lever", at: [-26, -14, BH + 6.5] });

  // the lens: concentric rings on the front face, the shutter inside the glass
  EL.line(g, ringOnFace(LX, LZ, 19, BY + 0.04), "el-sil");
  EL.line(g, ringOnFace(LX, LZ, 15.5, BY + 0.05), "el-lo");
  EL.line(g, ringOnFace(LX, LZ, 11.5, BY + 0.06), "el-lo");

  let over = null, last = NaN, A, B, slats, slit;
  const paint = (s, record) => {
    if (!record && s === last) return;
    last = s;
    const za = LZ + s / 2, zb = LZ - s / 2;
    const pa = EL.slab(LX - GAP + 1, BY, LX + GAP - 1, BY + 0.6, 0.6, za, LZ + GAP, P, front, { inset: 0.6 });
    const pb = EL.slab(LX - GAP + 1, BY, LX + GAP - 1, BY + 0.6, 0.6, LZ - GAP, zb, P, front, { inset: 0.6 });
    if (record) { EL.draw(A, pa, { name: "curtain", at: [LX, BY + 0.3, (za + LZ + GAP) / 2] }); EL.draw(B, pb, { name: "curtain", at: [LX, BY + 0.3, (LZ - GAP + zb) / 2] }); }
    else { EL.put(A, pa.paths); EL.put(B, pb.paths); }
    let d = "";
    for (let z = za + 3; z < LZ + GAP - 1; z += 3) d += EL.seg(P(LX - GAP + 2, BY + 0.66, z), P(LX + GAP - 2, BY + 0.66, z));
    for (let z = zb - 3; z > LZ - GAP + 1; z -= 3) d += EL.seg(P(LX - GAP + 2, BY + 0.66, z), P(LX + GAP - 2, BY + 0.66, z));
    slats.innerHTML = `<path class="el-lo" d="${d}"/>`;
    slit.setAttribute("d", EL.seg(P(LX - GAP + 2, BY + 0.72, LZ), P(LX + GAP - 2, BY + 0.72, LZ)));
    // the knob turns as the shutter opens, so the control answers the mechanism
    const ph = s * 0.14;
    knobK.setAttribute("d", EL.knurl(-26, 2, 4.6, BH + 4, BH + 10, 22, P, front, 0.15, ph));
    knobI.setAttribute("d", EL.seg(P(-26, 2, BH + 10.1), P(-26 + Math.cos(ph) * 4.2, 2 + Math.sin(ph) * 4.2, BH + 10.1)));
    read.textContent = over ? `1/${speed(s)} s` : "rest";
  };

  A = EL.solid(g); B = EL.solid(g); slats = EL.mk("g", {}, g); slit = EL.line(g, "", "el-hi");
  paint(value * 0.4, true);

  const sp = EL.spring(value * 0.4, { eps: 0.01 });
  const loop = EL.register(stage, (dt) => { const m = EL.stepS(sp, dt); paint(sp.x, false); return m; });
  bag.add(loop.unregister);
  const retarget = () => { sp.t = over ? EL.clamp(((over[0] - LX) / GAP) * 0.5 * value + 1.2, 1.2, value) : value * 0.4; loop.wake(); };
  bag.add(EL.pointer(stage, {
    move: (p) => { over = EL.unproj(C, p[0], p[1], LZ); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { value = v; if (over) retarget(); }, destroy: bag.dispose };
}

figure({
  name: "shutter",
  means: "A 35 mm camera's focal-plane shutter seen through the lens: the pointer widens the slit between the two curtains and the read-out names the shutter speed.",
  rule: [1, 3, 4, 9],
  range: [10, 16, 24],
  rest: "rest",
  tour: [[120, 200], [200, 160], [280, 200], [200, 250], null],
  parts: [
    { name: "body", shows: ["a rounded slab", "a top plate with a wind lever and a shutter button"] },
    { name: "lens", shows: ["concentric rings", "a glass at the centre"] },
    { name: "curtain", shows: ["horizontal slats", "an opaque edge at the slit"] },
    { name: "slit", shows: ["the light between the two curtains"] },
  ],
  mount,
});
