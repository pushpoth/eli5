/**
 * eli5 · stage — one frame loop for every figure on the page, the pointer, and
 * tear-down. A figure joins the loop with `register`, reads the pointer with
 * `pointer`, and hands every disposer to `disposer()`, so `destroy` is one call
 * and the page is exactly as it was before.
 *
 * Nothing here touches `window` at import: the module is evaluated during a
 * server render too, so the loop, the observer and the media query are created
 * by the first `register`.
 */
import { setReducedMotion } from "./motion.js";

let boards = [];
let raf = 0, last = 0;
let io = null, rm = null;

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  let any = false;
  for (const b of boards.slice()) if (b.vis && b.awake) {
    try { b.awake = !!b.tick(dt, now); } catch (err) { b.awake = false; setTimeout(() => { throw err; }); }
    any = any || b.awake;
  }
  raf = any ? requestAnimationFrame(frame) : 0;
}

function wake(b) { b.awake = true; if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

const onMotion = () => { setReducedMotion(!!rm?.matches); boards.forEach(wake); };

function start() {
  if (io) return;
  io = new IntersectionObserver((es) => {
    for (const e of es) for (const b of boards) if (b.stage === e.target) { b.vis = e.isIntersecting; if (b.vis) wake(b); }
  }, { rootMargin: "80px" });
  rm = matchMedia("(prefers-reduced-motion: reduce)");
  setReducedMotion(rm.matches);
  rm.addEventListener("change", onMotion);
}

function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  io?.disconnect(); io = null;
  rm?.removeEventListener("change", onMotion); rm = null;
}

/** Joins the shared loop. Runs the tick once now, then every frame while its stage is near the viewport and it keeps returning true. */
export function register(stage, tick) {
  start();
  /* starts visible and the observer turns it off when it scrolls away, so a
     figure is drawn before the first observer callback and a headless run,
     which may never deliver one, still animates. */
  const b = { stage, tick, vis: true, awake: true };
  boards.push(b);
  io.observe(stage);
  tick(0, performance.now());
  let gone = false;
  return {
    wake: () => { if (!gone) wake(b); },
    unregister: () => {
      if (gone) return;
      gone = true;
      boards = boards.filter((x) => x !== b);
      io?.unobserve(stage);
      if (!boards.length) stop();
    },
  };
}

/** Steps every visible board once with a synthetic dt. For a deterministic capture, where rAF may not advance. */
export function advance(dt, now) {
  for (const b of boards) if (b.vis) {
    try { b.awake = !!b.tick(dt, now); } catch { b.awake = false; }
  }
}

/** Pointer input in viewBox units. Returns the disposer. */
export function pointer(stage, on) {
  const pt = (e) => {
    const r = stage.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 400, ((e.clientY - r.top) / r.height) * 320];
  };
  const move = (e) => on.move?.(pt(e), e);
  const down = (e) => { if (e.pointerType !== "mouse") stage.releasePointerCapture?.(e.pointerId); (on.down ?? on.move)?.(pt(e), e); };
  const leave = (e) => on.leave?.(e);
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerdown", down);
  stage.addEventListener("pointerleave", leave);
  return () => {
    stage.removeEventListener("pointermove", move);
    stage.removeEventListener("pointerdown", down);
    stage.removeEventListener("pointerleave", leave);
  };
}

/** Collects a figure's tear-down, so its `destroy` can be `bag.dispose`. */
export function disposer() {
  let fns = [];
  return {
    add: (fn) => { fns.push(fn); },
    on: (target, type, fn, opts) => { const h = fn; target.addEventListener(type, h, opts); fns.push(() => target.removeEventListener(type, h, opts)); },
    dispose: () => { const run = fns; fns = []; for (let i = run.length - 1; i >= 0; i--) run[i](); },
  };
}
