/**
 * eli5 · dom — the only place a figure makes a node, and where a solid is
 * painted. `draw` writes a solid's two paths and records its shape for the
 * audit, so a figure never has to remember to record: the shape is the solid's
 * own numbers, taken as it is drawn.
 */
const NS = "http://www.w3.org/2000/svg";

/** One svg element, with its attributes, appended to `parent` when there is one. */
export function mk(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

/** A solid's two paths in one group: the silhouette (`.el-sil`) and its crease (`.el-cr`). */
export function solid(parent) {
  const g = mk("g", {}, parent);
  return { g, sil: mk("path", { class: "el-sil" }, g), cr: mk("path", { class: "el-cr" }, g) };
}

/** Writes a solid's `{ sil, crease }` into a `solid()`'s two paths. */
export const put = (el, paths) => { el.sil.setAttribute("d", paths.sil); el.cr.setAttribute("d", paths.crease || ""); };

/* the audit's shapes, collected as things are drawn */
export const shapes = [];
let recording = false;
export const setRecording = (on) => { recording = Boolean(on); if (on) shapes.length = 0; };
export const recorded = () => shapes.slice();

/**
 * Paints a solid built by slab/cylinder/lathe and records its shape. `meta` is
 * `{ name, at }`: `at` is the world point its sort key is taken from.
 */
export function draw(el, part, meta) {
  put(el, part.paths);
  if (recording && part.shape && meta && meta.name) shapes.push({ shape: part.shape, name: meta.name, at: meta.at ?? [0, 0, 0] });
}

/** A line on the drawing, classed `el-lo`/`el-hi`/`el-dash`, or set by `cls`. */
export const line = (parent, d, cls = "el-lo") => mk("path", { class: cls, d }, parent);

/** A flat dot: an ellipse squashed by the camera. Position it with `place`. */
export const dot = (parent, C, r, cls = "el-dot") => mk("ellipse", { rx: r2c(r * C.S), ry: r2c(r * C.S * C.k), class: cls }, parent);
export const place = (el, q) => { el.setAttribute("cx", String(r2c(q[0]))); el.setAttribute("cy", String(r2c(q[1]))); };
const r2c = (n) => Math.round(n * 100) / 100;

/** A group around children, with optional attributes. */
export const group = (parent, attrs) => mk("g", attrs, parent);
