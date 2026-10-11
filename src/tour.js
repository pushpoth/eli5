/**
 * eli5 · tour — an unseen pointer that walks a figure's stops, so a stranger
 * sees the interaction with no hand on the page. It emits real pointer events
 * on the stage (tagged `ghost`), so the figure needs to know nothing about it;
 * a real pointer or focus takes over and the tour resumes when they leave.
 */
import { EASE } from "./motion.js";
import { register } from "./stage.js";

/** The default stops: a diamond around the centre, then a leave. */
export const LAP = [[128, 150], [200, 118], [272, 150], [200, 206], null];

const TRAVEL = 900, DWELL = 1200, REST = 1800, RESUME = 1200, STAGGER = 450;
let started = 0;

/** Where a pointer heading for `p` first touches the viewBox: the ray from the centre through `p` meets the edge. */
function entry([x, y]) {
  const dx = x - 200, dy = y - 160;
  if (!dx && !dy) return [200, 320];
  const k = Math.min(dx ? (dx > 0 ? 200 : -200) / dx : Infinity, dy ? (dy > 0 ? 160 : -160) / dy : Infinity);
  return [200 + dx * k, 160 + dy * k];
}

/** Walks `stops` on `stage`, `[x, y]` in viewBox units or null to leave. Returns `{ stop }`. */
export function tour(stage, stops = LAP, onStop) {
  let i = 0;
  let wait = RESUME + STAGGER * (started++ % 4);
  let t = -1, at = null, origin = [200, 320], hand = false, gone = false;
  const move = (p) => {
    const r = stage.getBoundingClientRect();
    stage.dispatchEvent(new PointerEvent("pointermove", { clientX: r.left + (p[0] / 400) * r.width, clientY: r.top + (p[1] / 320) * r.height, bubbles: true, pointerType: "ghost" }));
  };
  const leave = () => stage.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, pointerType: "ghost" }));
  const onReal = (e) => { if (e.pointerType === "ghost") return; hand = true; at = null; t = -1; };
  const onRealLeave = (e) => { if (e.pointerType === "ghost") return; hand = false; i = 0; t = -1; wait = RESUME; loop.wake(); };

  const tick = (dt) => {
    if (hand || !stops.length) return false;
    if (wait > 0) { wait -= dt * 1000; return true; }
    const stop = stops[i];
    if (stop === null) { if (at) leave(); onStop?.(i); i = (i + 1) % stops.length; wait = REST; return true; }
    if (t < 0) { origin = at ?? entry(stop); t = 0; }
    t = Math.min(TRAVEL, t + dt * 1000);
    const k = EASE(t / TRAVEL);
    at = [origin[0] + (stop[0] - origin[0]) * k, origin[1] + (stop[1] - origin[1]) * k];
    move(at);
    if (t < TRAVEL) return true;
    onStop?.(i); i = (i + 1) % stops.length; t = -1; wait = DWELL;
    return true;
  };

  stage.addEventListener("pointermove", onReal);
  stage.addEventListener("pointerleave", onRealLeave);
  const loop = register(stage, tick);

  return {
    stop() {
      if (gone) return;
      gone = true;
      loop.unregister();
      stage.removeEventListener("pointermove", onReal);
      stage.removeEventListener("pointerleave", onRealLeave);
      if (at) leave();
    },
  };
}
