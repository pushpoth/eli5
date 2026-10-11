/**
 * eli5 · theme — the stylesheet, as a string, and the one function that puts it
 * in a document or a shadow root. Every selector is inside `:where()`, so each
 * rule has zero specificity: a rule of the page's always wins. Light is the
 * default; `.dark`/`[data-theme="dark"]` and the figure's own `data-theme`
 * override it. The `--eli5-*` properties are the public theme.
 */
const LIGHT = { plate: "#ffffff", face: "#ededf0", top: "#ffffff", hi: "#1b1b1e", mid: "#7b7b84", lo: "#c8c8ce", edge: "#3a3a40" };
const DARK = { plate: "#0b0b0d", face: "#17171a", top: "#222227", hi: "#e6e6ea", mid: "#8b8b93", lo: "#33333a", edge: "#9a9aa2" };
const KEYS = ["plate", "face", "top", "hi", "mid", "lo", "edge"];
const vars = (p) => KEYS.map((k) => `--el-${k}:var(--eli5-${k},${p[k]});`).join("");
const S = ":where([data-eli5]>svg)";

/** The stylesheet, as a string. */
export function css() {
  return [
    `:where([data-eli5]){display:block;position:relative;aspect-ratio:5/4;touch-action:pan-y;user-select:none;-webkit-user-select:none;--el-sw:var(--eli5-stroke,0.9);${vars(LIGHT)}}`,
    `:where(.dark,[data-theme="dark"]) :where([data-eli5]){${vars(DARK)}}`,
    `:where([data-eli5][data-eli5-theme="dark"]){${vars(DARK)}}`,
    `${S}{position:absolute;inset:0;width:100%;height:100%;display:block}`,
    `${S} :where(path,polygon,ellipse,line){fill:var(--el-plate);stroke:var(--el-mid);stroke-width:var(--el-sw);vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}`,
    `${S} :where(.el-nf){fill:none}`,
    `${S} :where(.el-sil){fill:var(--el-face);stroke:var(--el-edge)}`,
    `${S} :where(.el-top){fill:var(--el-top);stroke:none}`,
    `${S} :where(.el-cr){fill:none;stroke:var(--el-lo)}`,
    `${S} :where(.el-hi){stroke:var(--el-hi)}`,
    `${S} :where(.el-lo){fill:none;stroke:var(--el-lo)}`,
    `${S} :where(.el-dash){fill:none;stroke:var(--el-mid);stroke-dasharray:1 3}`,
    `${S} :where(.el-dot){stroke:none;fill:var(--el-hi)}`,
    `${S} :where(.el-dot.m){fill:var(--el-mid)}`,
  ].join("");
}

const done = new WeakSet();

/** Puts the stylesheet in a document or a shadow root, once. */
export function inject(root) {
  if (done.has(root)) return;
  done.add(root);
  const doc = root.nodeType === 9 ? root : root.ownerDocument;
  const win = doc.defaultView;
  const text = css();
  if (win && "adoptedStyleSheets" in root) {
    try {
      const sheet = new win.CSSStyleSheet();
      sheet.replaceSync(text);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      return;
    } catch { /* fall through */ }
  }
  const style = doc.createElement("style");
  style.setAttribute("data-eli5-style", "");
  style.textContent = text;
  (root.nodeType === 9 ? doc.head ?? doc.documentElement : root).appendChild(style);
}
