/**
 * typewriter — how a typewriter's key prints a letter. The pointer presses a
 * key; its typebar swings up out of the basket and strikes the ribbon against
 * the platen, printing a mark on the paper, and the carriage steps one space.
 * The read-out names the key. Letters stay out of the drawing (rule 10): the
 * impression is a mark, the read-out carries the name.
 *
 * The pattern: a discrete choice (which key) on a fixed plane, a strike on a
 * spring, and a rest that is a composed keyboard. intensity is the strike lift.
 */
const KW = 11, KR = 2.5;                    // key pitch and radius
const ROWS = [6, 12, 18], COLS = [-24, -16, -8, 0, 8, 16, 24];
const PY = -5, PZ = 38, PR = 8.6;          // the platen: its axis line and radius
const TOP = PZ + PR;                       // the paper sits on the platen

function mount({ stage, svg, read }, value) {
  const bag = EL.disposer();
  const C = EL.cam(45, 0.5, 1);
  EL.frame(C, [[-46, -22, 0], [46, -22, 0], [46, 20, 0], [-46, 20, 0], [-46, -22, TOP + 6], [46, -22, TOP + 6], [46, 20, TOP + 6], [-46, 20, TOP + 6]], { fill: 0.82 });
  const P = EL.proj(C), front = EL.facing(C);
  const g = EL.mk("g", {}, svg);

  // the frame and the keyboard, receding so the mechanism leads
  EL.draw(EL.solid(g), EL.slab(-46, -20, 46, 20, 4, 0, 6, P, front, { inset: 1.6 }), { name: "frame", at: [0, 0, 3], recede: true });
  EL.draw(EL.solid(g), EL.slab(-28, 3, 28, 19, 3, 6, 12, P, front, { inset: 1.2 }), { name: "keyboard", at: [0, 11, 9], recede: true });
  const keys = [];

  // two posts carry the platen; the ribbon runs in front of it
  for (const px of [-22, 22]) EL.draw(EL.solid(g), EL.slab(px - 3, PY - 4, px + 3, PY + 4, 1, 6, PZ - PR, P, front, { inset: 0.8 }), { name: "post", at: [px, PY, (6 + PZ - PR) / 2], recede: true });
  EL.draw(EL.solid(g), EL.latheX([[-26, 0], [-22, PR], [22, PR], [26, 0]], PY, PZ, P, { steps: 44 }), { name: "platen", at: [0, PY, PZ] });
  EL.line(g, EL.seg(P(-26, PY - 5, PZ + 2), P(26, PY - 5, PZ + 2)), "el-lo");
  EL.draw(EL.solid(g), EL.slab(-22, PY - 6, 22, PY + 6, 1, TOP, TOP + 1, P, front, { inset: 0 }), { name: "paper", at: [0, PY, TOP + 0.5], recede: true });
  for (let r = 0; r < ROWS.length; r++) for (let c = 0; c < COLS.length; c++) {
    const x = COLS[c], y = ROWS[r];
    EL.draw(EL.solid(g), EL.cylinder(x, y, KR, 12, 15, P, front, 18), { name: "key", at: [x, y, 13.5], recede: true });
    keys.push({ x, y, r, c, el: EL.solid(g), sp: EL.spring(0, { eps: 0.02 }) });
  }

  // the type basket: a fan of typebars up to the type guide, and the one in play
  const GUIDE = [0, PY + 2, PZ - PR + 2];
  const STRIKE = [0, PY - 2, PZ + PR - 1];
  const baseOf = (x) => [x, 12, 16];
  for (const c of COLS) EL.line(g, EL.seg(P(...baseOf(c)), P(...GUIDE)), "el-lo");
  const active = EL.line(g, "", "el-hi");
  const marks = EL.mk("g", {}, g);

  let key = null, printed = 0, strike = EL.spring(0, { eps: 0.015 });
  const drawBar = () => {
    const k = strike.x, sx = key ? key.x * 0.5 : 0;
    const tip = [EL.lerp(GUIDE[0], sx, k), EL.lerp(GUIDE[1], STRIKE[1], k), EL.lerp(GUIDE[2], STRIKE[2], k)];
    active.setAttribute("d", EL.seg(P(...baseOf(key ? key.x * 0.6 : 0)), P(tip[0], tip[1], tip[2])));
  };
  const print = () => {
    const d = EL.dot(marks, C, 1.1, "el-dot");
    EL.place(d, P(key.x, PY - 6.1, TOP + 0.4));
    printed++;
    read.textContent = `key ${key.r + 1}·${key.c + 1}`;
  };

  const loop = EL.register(stage, (dt) => {
    let m = EL.stepS(strike, dt);
    for (const kk of keys) if (EL.stepS(kk.sp, dt)) m = true;
    drawBar();
    return m;
  });
  bag.add(loop.unregister);

  const choose = (p) => {
    const w = EL.unproj(C, p[0], p[1], 13);
    let best = keys[0], bd = 1e9;
    for (const kk of keys) { const d = Math.hypot(kk.x - w[0], kk.y - w[1]); if (d < bd) { bd = d; best = kk; } }
    if (best !== key) { key = best; strike.t = 1; print(); }
    loop.wake();
  };
  bag.add(EL.pointer(stage, {
    move: (p) => choose(p),
    leave: () => { strike.t = 0; loop.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { value = v; loop.wake(); }, destroy: bag.dispose };
}

figure({
  name: "typewriter",
  means: "A typewriter: the pointer presses a key, its typebar strikes the ribbon against the platen and prints a mark on the paper.",
  rule: [1, 4, 5, 9],
  range: [8, 14, 20],
  rest: "rest",
  tour: [[-26, 210], [0, 200], [26, 210], [0, 240], null],
  parts: [
    { name: "frame", shows: ["a slab base", "a keyboard of round keys"] },
    { name: "post", shows: ["a pillar under each end of the platen"] },
    { name: "platen", shows: ["a roller across the frame", "rounded ends"] },
    { name: "paper", shows: ["a sheet over the platen"] },
    { name: "typebar", shows: ["a fan of bars in the basket", "the one in play lifting to the platen"] },
  ],
  mount,
});
