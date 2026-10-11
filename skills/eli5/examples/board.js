/**
 * board — a demo figure for the bench: a plinth of pillars that rise under the
 * pointer. Each pillar is a spring, so the field settles; the one above 60% of
 * full height takes the bright stroke. The pattern: a continuous field, a hit
 * test on the ground plane (which never moves), and a rest that is quiet.
 */
const N = 5, CELL = 20, R = 5, HMAX = 34, EXT = N * CELL;

function mount({ stage, svg, read }, value) {
  const bag = EL.disposer();
  const C = EL.cam(45, 0.5, 1.35);
  EL.fit(C, [
    [-8, -8, 0], [EXT + 8, EXT + 8, 0], [-8, EXT + 8, 0], [EXT + 8, -8, 0], [0, 0, HMAX + 4],
  ], 200, 166);
  const P = EL.proj(C), front = EL.facing(C);
  const g = EL.mk("g", {}, svg);

  {
    const s = EL.solid(g);
    EL.put(s, EL.slab(-8, -8, EXT + 8, EXT + 8, 7, -6, 0, P, front).paths);
  }
  const cols = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const cx = i * CELL + CELL / 2, cy = j * CELL + CELL / 2;
    cols.push({ cx, cy, el: EL.solid(g), sp: EL.spring(2, { eps: 0.03 }), drawn: NaN });
  }

  let over = null, reach = value;
  const tick = (dt) => {
    let moving = false;
    for (const c of cols) {
      if (EL.stepS(c.sp, dt)) moving = true;
      const h = Math.max(1, c.sp.x);
      if (h === c.drawn) continue;
      c.drawn = h;
      EL.put(c.el, EL.cylinder(c.cx, c.cy, R, 0, h, P, front, 16).paths);
      c.el.sil.classList.toggle("el-hi", h > HMAX * 0.6);
    }
    return moving;
  };
  const loop = EL.register(stage, tick);
  bag.add(loop.unregister);

  const retarget = () => {
    for (const c of cols) {
      if (!over) { c.sp.t = 2; continue; }
      const d = Math.hypot(c.cx - over[0], c.cy - over[1]);
      c.sp.t = EL.clamp(HMAX * (1 - d / reach), 2, HMAX);
    }
    if (over) read.textContent = `cell ${EL.clamp(Math.floor(over[0] / CELL), 0, N - 1)}·${EL.clamp(Math.floor(over[1] / CELL), 0, N - 1)}`;
    else read.textContent = "rest";
    loop.wake();
  };
  bag.add(EL.pointer(stage, {
    move: (p) => { over = EL.unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { reach = v; if (over) retarget(); }, destroy: bag.dispose };
}

figure({
  name: "board",
  means: "A plinth of pillars rises under the pointer and falls off with distance.",
  rule: [1, 3, 5, 9],
  range: [26, 44, 66],
  rest: "rest",
  tour: [[80, 220], [320, 140], [200, 60], null],
  mount,
});
