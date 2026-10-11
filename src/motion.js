/**
 * eli5 · motion — the two clocks, with no DOM.
 *
 * A discrete change (which item) gets a long ease-out on a tween; a continuous
 * input (where the pointer is) gets a spring, because its target moves every
 * frame and a timed ease would always be chasing it. Reduced motion is one flag
 * here so this file stays pure and a test can flip it.
 */
import { clamp } from "./iso.js";

let reduced = false;
export const setReducedMotion = (on) => { reduced = Boolean(on); };
export const reducedMotion = () => reduced;

/** A spring at rest on x. k 100 · c 18 · m 1 unless told otherwise. */
export function spring(x, o = {}) {
  return { x, v: 0, t: x, k: o.k ?? 100, c: o.c ?? 18, m: o.m ?? 1, eps: o.eps ?? 0.01 };
}

/** Advances a spring toward `sp.t`, substepped at 240 Hz so a long frame can't overshoot. Returns whether it is still moving. */
export function stepS(sp, dt) {
  if (reduced) { sp.x = sp.t; sp.v = 0; return false; }
  const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = (-sp.k * (sp.x - sp.t) - sp.c * sp.v) / sp.m;
    sp.v += a * h; sp.x += sp.v * h;
  }
  if (Math.abs(sp.x - sp.t) < sp.eps && Math.abs(sp.v) < sp.eps * 10) { sp.x = sp.t; sp.v = 0; return false; }
  return true;
}

/** A CSS cubic-bezier as a function of progress: Newton first, bisection if it strays. */
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (u) => ((ax * u + bx) * u + cx) * u;
  const Y = (u) => ((ay * u + by) * u + cy) * u;
  const dX = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const e = X(u) - t;
      if (Math.abs(e) < 1e-5) break;
      const d = dX(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    if (!(u >= 0 && u <= 1) || Math.abs(X(u) - t) > 1e-4) {
      let lo = 0, hi = 1; u = t;
      for (let i = 0; i < 24; i++) { if (X(u) < t) lo = u; else hi = u; u = (lo + hi) / 2; }
    }
    return Y(u);
  };
}

/** The lift curve: 700 ms on (.32, .72, 0, 1). The discrete clock. */
export const EASE = bezier(0.32, 0.72, 0, 1);

/** A tween on EASE. `t0` may be in the future: that is how a stagger delays it. */
export const tween = (v, dur = 700) => ({ from: v, to: v, t0: -1e9, dur });
export const tval = (tw, now) => {
  const p = clamp((now - tw.t0) / tw.dur, 0, 1);
  return tw.from + (tw.to - tw.from) * (reduced ? 1 : EASE(p));
};
/** Retargets from wherever it is now, starting after `delay` ms. A no-op if the target is unchanged. */
export const tset = (tw, to, now, delay) => {
  if (tw.to === to) return;
  tw.from = tval(tw, now); tw.to = to; tw.t0 = now + delay;
};
export const tdone = (tw, now) => reduced || now >= tw.t0 + tw.dur;
