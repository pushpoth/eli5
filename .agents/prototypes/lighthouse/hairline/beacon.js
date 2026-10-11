/**
 * Beacon: a lighthouse on a rock. The pointer's bearing turns the sweep across
 * the water, the nearest ray takes the bright stroke and the lamp gives it up.
 * At rest the lamp is lit and the beam points seaward. The slider is the reach.
 *
 * The pattern: a continuous field on a plane that never moves. The pointer is
 * read on the ground, one spring carries the bearing, and rest is composed:
 * a dune of rock, a tapered tower, one bright lamp and the beam out to sea.
 */
const {
  Cam, circ, disposer, facing, fillet, fit, flatDot, hull, lerp, mk, open, place,
  pointer, poly, prism, proj, put, rad, register, rrect, ringAt, rings, run, seg,
  solid, spring, stepS, unproj,
} = HL;

const T = 72;      // tower height
const FT = 24;     // foot half-width
const TT = 12;     // top half-width
const GAL = 3.5;   // gallery deck thickness
const LAN = 15;    // lantern height
const DOME = 8;    // dome height
const ROCK = 7;    // rock below the base
const LAN_R = 11;  // lantern radius
const LAMP = T + GAL + LAN * 0.5;      // height of the lamp
const RAYS = 9, SPREAD = rad(25);      // the beam fan
const REST_A = rad(-70);               // rest bearing: out to sea
const MAXR = 126;                      // the farthest reach, for the fit

/** A bearing in degrees, clockwise from +y, for the read-out. */
const bearing = (dx, dy) => (Math.round((Math.atan2(dx, -dy) * 180) / Math.PI) + 360) % 360;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.52);
  const ring0 = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    ring0.push([Math.cos(a) * MAXR, Math.sin(a) * MAXR, 0]);
  }
  fit(C, [
    [-FT - 8, -FT - 8, 0], [FT + 8, FT + 8, 0], [-FT - 8, FT + 8, 0], [FT + 8, -FT - 8, 0],
    ...ring0, [0, 0, T + GAL + LAN + DOME + 4],
  ], 200, 166);
  const P = proj(C), front = facing(C);
  let reach = value;

  const g = mk("g", {}, svg);
  // the beam first, on the water, so the rock and tower paint over what is behind
  const rays = [];
  for (let k = 0; k < RAYS; k++) rays.push(mk("path", { class: "dash", d: "" }, g));

  {
    const [r, i] = rings(-FT - 8, -FT - 8, FT + 8, FT + 8, 11, 2.2);
    put(solid(g), prism(P, front, r, i, -ROCK, 0));
  }
  {
    const foot = rrect(-FT, -FT, FT, FT, 7);
    const top = rrect(-TT, -TT, TT, TT, 5);
    const inner = rrect(-TT + 1.8, -TT + 1.8, TT - 1.8, TT - 1.8, 3.2);
    put(solid(g), {
      sil: poly(hull(ringAt(P, foot, 0).concat(ringAt(P, top, T)))),
      crease: open(ringAt(P, run(inner, front), T)),
    });
    // daymark bands and a door: the features that make it a lighthouse
    for (const f of [0.34, 0.6]) {
      const hw = lerp(FT, TT, f);
      mk("path", { class: "lo", d: poly(ringAt(P, rrect(-hw, -hw, hw, hw, lerp(7, 5, f)), T * f)) }, g);
    }
    const face = FT + 0.05;
    mk("path", { class: "lo", d: poly(fillet([P(face, -6, 3), P(face, 6, 3), P(face, 6, 18), P(face, -6, 18)], [2, 2, 2, 2])) }, g);
  }
  {
    const [r, i] = rings(-TT - 4, -TT - 4, TT + 4, TT + 4, 4, 1.2);
    put(solid(g), prism(P, front, r, i, T, T + GAL));
  }
  {
    put(solid(g), prism(P, front, circ(LAN_R, 48), circ(LAN_R - 2, 48), T + GAL, T + GAL + LAN));
    put(solid(g), {
      sil: poly(hull(ringAt(P, circ(LAN_R, 48), T + GAL + LAN).concat(ringAt(P, circ(2.5, 24), T + GAL + LAN + DOME)))),
      crease: "",
    });
  }
  const lamp = flatDot(g, C, 2.3, "dot");
  place(lamp, P(0, 0, LAMP));

  let over = null, a = REST_A;
  const sa = spring(REST_A, { eps: 0.002 });
  let key = NaN;
  const draw = () => {
    const deg = Math.round((((sa.x * 180) / Math.PI) % 360 + 360) % 360);
    if (deg === key) return;
    key = deg;
    for (let k = 0; k < RAYS; k++) {
      const t = k / (RAYS - 1), ang = sa.x + (t - 0.5) * 2 * SPREAD;
      const dx = Math.cos(ang), dy = Math.sin(ang);
      rays[k].setAttribute("d", seg(P(dx * (FT + 9), dy * (FT + 9), 0), P(dx * reach, dy * reach, 0)));
      rays[k].setAttribute("class", over && k === (RAYS - 1) / 2 ? "hi" : "dash");
    }
    lamp.setAttribute("class", over ? "dot m" : "dot");
    read.textContent = over ? `bearing ${bearing(Math.cos(sa.x), Math.sin(sa.x))}°` : "rest";
  };

  const B = register(stage, (dt) => { const m = stepS(sa, dt); draw(); return m; });
  bag.add(B.unregister);

  const retarget = () => { sa.t = over ? Math.atan2(over[1], over[0]) : REST_A; B.wake(); };
  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { reach = v; key = NaN; B.wake(); }, destroy: bag.dispose };
}

hairline({
  name: "beacon",
  means: "A lighthouse on a rock: the pointer's bearing turns the beam across the water.",
  rules: [1, 4, 5, 9],
  range: [82, 104, 126],
  tour: [[120, 210], [300, 150], [200, 60], [90, 150], null],
  mount,
});
