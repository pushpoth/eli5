/**
 * lighthouse — the same subject as the hairline and anatomy prototypes, drawn
 * on the eli5 kernel: a tower on a rock, a lantern and a lamp, and a beam that
 * turns to the pointer's bearing. intensity is the beam's reach.
 *
 * The pattern: a continuous input on a plane that never moves. The pointer is
 * read on the water, one spring carries the bearing, and rest is composed: a
 * taper with daymark bands, a curved cap, and one bright lamp.
 */
const T = 74, R0 = 27, R1 = 12;          // the tower shaft
const GZ = T, DECK = 3, DTOP = GZ + DECK;
const L1 = DTOP + 16, LZ = (DTOP + L1) / 2;
const ROCK = { x0: -44, y0: -40, x1: 48, y1: 44, r: 15 };
const MAXR = 150, RAYS = 9, SPREAD = EL.rad(24), REST = EL.rad(-70);

const bearing = (dx, dy) => (Math.round((Math.atan2(dx, -dy) * 180) / Math.PI) + 360) % 360;

function mount({ stage, svg, read }, value) {
  const bag = EL.disposer();
  const C = EL.cam(45, 0.5, 1.45);
  const ring = [];
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ring.push([Math.cos(a) * MAXR, Math.sin(a) * MAXR, 0]); }
  EL.fit(C, [
    [ROCK.x0 - 6, ROCK.y0 - 6, 0], [ROCK.x1 + 6, ROCK.y1 + 6, 0],
    [ROCK.x0 - 6, ROCK.y1 + 6, 0], [ROCK.x1 + 6, ROCK.y0 - 6, 0],
    ...ring, [0, 0, L1 + 12],
  ], 200, 166);
  const P = EL.proj(C), front = EL.facing(C);
  const g = EL.mk("g", {}, svg);

  // the beam first, on the water, so the rock and tower paint over what is behind
  const far = EL.line(g, "", "el-lo"), hi = EL.line(g, "", "el-hi");

  EL.draw(EL.solid(g), EL.slab(ROCK.x0, ROCK.y0, ROCK.x1, ROCK.y1, ROCK.r, -7, 0, P, front, { inset: 1.8 }), { name: "rock", at: [(ROCK.x0 + ROCK.x1) / 2, (ROCK.y0 + ROCK.y1) / 2, -3.5] });
  EL.draw(EL.solid(g), EL.lathe([[0, R0], [T, R1]], P, front, { steps: 40 }), { name: "tower", at: [0, 0, T / 2] });
  for (const f of [0.34, 0.62]) {
    const z = T * f, r = EL.lerp(R0, R1, f);
    EL.line(g, EL.open(EL.ringAt(P, EL.run(EL.circ(r, 48), front), z)), "el-lo");
  }
  { const d = EL.dot(g, C, 1.7, "el-dot m"); EL.place(d, P(0.707 * R0 * 0.72, 0.707 * R0 * 0.72, 6)); }

  const RB = 1.2, RT = 1.2;             // the lantern's bottom and top rings
  EL.draw(EL.solid(g), EL.cylinder(0, 0, R1 + 4, GZ, DTOP, P, front, 48), { name: "gallery", at: [0, 0, GZ + DECK / 2] });
  EL.draw(EL.solid(g), EL.cylinder(0, 0, R1 + 2, DTOP, DTOP + RB, P, front, 48), { name: "lantern.base", at: [0, 0, DTOP] });
  // the cage wraps the lens, so it is split: the far bars, the lens, then the near bars
  const bars = [];
  for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5; bars.push({ x: Math.cos(a) * (R1 + 1), y: Math.sin(a) * (R1 + 1), near: Math.cos(a) + Math.sin(a) > 0 }); }
  const bar = (b) => EL.draw(EL.solid(g), EL.cylinder(b.x, b.y, 0.5, DTOP + RB, L1 - RT, P, front, 8), { name: "bar", at: [b.x, b.y, (DTOP + L1) / 2] });
  bars.filter((b) => !b.near).forEach(bar);
  EL.draw(EL.solid(g), EL.cylinder(0, 0, 7.5, DTOP + RB, L1 - RT, P, front, 40), { name: "lens", at: [0, 0, LZ] });
  { const d = EL.dot(g, C, 2.0, "el-dot"); EL.place(d, P(0, 0, LZ)); }
  bars.filter((b) => b.near).forEach(bar);
  EL.draw(EL.solid(g), EL.cylinder(0, 0, R1 + 2, L1 - RT, L1, P, front, 48), { name: "lantern.top", at: [0, 0, L1] });
  EL.draw(EL.solid(g), EL.lathe([[L1, 10], [L1 + 3, 9.6], [L1 + 9, 0]], P, front, { steps: 40 }), { name: "dome", at: [0, 0, L1 + 4.5] });
  EL.draw(EL.solid(g), EL.cylinder(0, 0, 1.6, L1 + 9, L1 + 11, P, front, 20), { name: "vent", at: [0, 0, L1 + 10] });

  let over = null, reach = value, key = NaN;
  const sa = EL.spring(REST, { eps: 0.002 });
  const ray = (ang, r) => EL.seg(P(Math.cos(ang) * r, Math.sin(ang) * r, 0), P(Math.cos(ang) * reach, Math.sin(ang) * reach, 0));
  const drawBeam = () => {
    const deg = Math.round((((sa.x * 180) / Math.PI) % 360 + 360) % 360);
    if (deg === key) return;
    key = deg;
    let fd = "";
    for (let i = 0; i < RAYS; i++) { const t = i / (RAYS - 1); fd += ray(sa.x + (t - 0.5) * 2 * SPREAD, R0 + 8); }
    far.setAttribute("d", fd);
    hi.setAttribute("d", ray(sa.x, R0 + 8));
    read.textContent = over ? `bearing ${bearing(Math.cos(sa.x), Math.sin(sa.x))}°` : "rest";
  };

  const loop = EL.register(stage, (dt) => { const m = EL.stepS(sa, dt); drawBeam(); return m; });
  bag.add(loop.unregister);
  const retarget = () => { sa.t = over ? Math.atan2(over[1], over[0]) : REST; loop.wake(); };
  bag.add(EL.pointer(stage, {
    move: (p) => { over = EL.unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { reach = v; key = NaN; loop.wake(); }, destroy: bag.dispose };
}

figure({
  name: "lighthouse",
  means: "A lighthouse on a rock: the pointer's bearing turns the beam across the water.",
  rule: [1, 4, 5, 9],
  range: [90, 120, 150],
  rest: "rest",
  tour: [[120, 210], [300, 150], [200, 60], [90, 150], null],
  parts: [
    { name: "tower", shows: ["a taper", "daymark bands", "a door"] },
    { name: "rock", shows: ["a rounded mass", "a contact with the ground"] },
    { name: "dome", shows: ["a curved cap", "a ventilator"] },
  ],
  mount,
});
