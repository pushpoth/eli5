# eli5 kernel & skill — implementation plan

> **For the implementer:** this plan is executed inline in this session (one
> subagent at a time is the local rule; no parallel agents). Steps use `- [ ]`.

**Goal:** build the `eli5` figure skill from basics — a dep-free kernel, a
declarative figure contract, three gates (static, measured, read), and one
reference figure that passes them all.

**Architecture:** the kernel is a few small ESM source files concatenated by a
dep-free generator (`scripts/kernel.mjs`) into one frozen `kernel.js` with a
hash line and a hand-written index. The agent writes one `figure.js` against the
documented index. `build.mjs` inlines kernel + figure into one HTML bench with
controls and query params. Verification is `validate.mjs` (text) → `audit.mjs`
(geometry) → `look.mjs` (screenshots) + `look.md` (checklist).

**Tech stack:** plain Node 20+ ESM, no dependencies. Node's built-in `node:test`
for unit tests. Plain headless Chrome for screenshots (path via `CHROME_PATH`,
falling back to the Playwright cache). Browser APIs only in the page.

**Design:** `../plans/eli5-technique-design.md`. Reference material (read-only):
`../ref/hairline`, `../ref/anatomy`.

---

## File structure

```
skills/eli5/
  SKILL.md            router: sizing, workflow, three gates, rules short form
  rules.md            the craft rules, condensed
  concepts.md         idea -> object + gesture + read-out + parts list
  kernel.js           GENERATED: header+hash, INDEX, concatenated src
  build.mjs           build a figure into one HTML bench
  validate.mjs        gate 1 (text)
  audit.mjs           gate 2 entry (uses EL.rec built into the page)
  look.mjs            gate 3: screenshots via headless Chrome
  look.md             gate 3: the read checklist
  serve.mjs           a tiny static server for local viewing
  test/               node:test unit tests
  examples/           reference figures + committed built pages
src/
  iso.js              camera, projection, rounding, hull, path strings
  solid.js            rounded solids from rings: slab, cylinder, extrude, lathe
  motion.js           spring + tween (two clocks)
  stage.js            one loop, IntersectionObserver, pointer, disposer
  theme.js            tokens + CSS + inject
  tour.js             unseen-pointer autoplay
  audit.js            lightweight recorder + settle + checks
  kernel.head.js      hand-written INDEX doc comment (not concatenated)
scripts/
  kernel.mjs          generate kernel.js from src/ (+ --check); hash it
```

Module concatenation rule: `src/*.js` use single-line `import`/`export`
statements only. `scripts/kernel.mjs` orders them (iso, solid, motion, stage,
theme, tour, audit), strips `/^export /` and `/^import .*$/` lines, wraps the
result in an IIFE that returns the public API, and prepends the header+INDEX.

---

## Milestone 0 — scaffold & generator

**Files:** `scripts/kernel.mjs`, `src/iso.js` (stub `export const EL_VERSION="0"`), `skills/eli5/kernel.js` (generated), `skills/eli5/serve.mjs`.

- [ ] **Step 1:** write `scripts/kernel.mjs` (dep-free): read `src/` files in order, strip `export `/`import`, wrap, prepend `/* eli5 kernel sha256:<hash> */` + `src/kernel.head.js`, write `skills/eli5/kernel.js`; `--check` writes nothing and exits 1 if stale.
- [ ] **Step 2:** run `node scripts/kernel.mjs` → kernel.js exists; `node scripts/kernel.mjs --check` exits 0; edit src, `--check` exits 1.
- [ ] **Step 3:** write `serve.mjs` (Node http, serves `skills/eli5/` on a port), verify `curl` returns the file.
- [ ] **Step 4:** commit.

## Milestone 1 — maths, solids, stage, theme, one viewable figure

**Files:** `src/iso.js`, `src/solid.js`, `src/motion.js`, `src/stage.js`, `src/theme.js`, `src/kernel.head.js`, `skills/eli5/build.mjs`, `skills/eli5/test/iso.test.mjs`, `skills/eli5/test/solid.test.mjs`, demo `skills/eli5/examples/board.js`.

- [ ] **Step 1 (iso):** camera `cam(az,k,S)`, `proj`, `unproj`, `fit`, `facing`, `rrect`, `circ`, `ringAt`, `run`, `hull`, `poly`, `open`, `seg`, `clamp`, `lerp`, `rad`, `r2`. Test: `proj`/`unproj` round-trip within 1e-6; `hull` of a square is 4 points; `rrect` corner count = `4*(n+1)`.
- [ ] **Step 2 (solid):** `solid(parent)` → `{g,sil,cr}`; `put(solid,{sil,crease})`; `prism(P,front,ring,inner,z0,z1)`; `slab(x,y,w,d,r,z0,z1,P,{inset})`; `cylinder(cx,cy,r,z0,z1,P,steps)`; `extrude(ring,z0,z1,P)`. All return `{sil,crease}`; a separate `shape` descriptor per part for the audit. Test: `prism` on a square ring yields a silhouette hull with 4 distinct corners and one crease path; a cylinder's silhouette width grows with `r`.
- [ ] **Step 3 (stage):** `register(stage,tick)` (one rAF loop, IntersectionObserver sleep, returns `{wake,unregister}`); `pointer(stage,{move,down,leave})` in viewBox units; `disposer()`.
- [ ] **Step 4 (motion):** `spring`, `stepS` (substepped 240 Hz), `tween`, `tset`, `tval`, `EASE`; reduced-motion flag.
- [ ] **Step 5 (theme):** `CSS` string with `--eli5-*` tokens (light default, `.dark`/`[data-theme]` overrides), `inject(root)`; `:where()` selectors for zero specificity.
- [ ] **Step 6 (index + build):** write `src/kernel.head.js` INDEX listing exactly the public names; `build.mjs <figure.js>` inlines `kernel.js` + figure into `bench.html`. Test: `node build.mjs examples/board.js` writes HTML containing the kernel hash line.
- [ ] **Step 7 (demo figure):** `examples/board.js` — a rounded plinth with one pillar that rises on a spring under the pointer; read-out `cell i·j`. Build it and open `serve.mjs` → **viewable checkpoint**.
- [ ] **Step 8:** commit.

## Milestone 2 — lathe, lines, dots (drawn from basics)

**Files:** `src/solid.js` (add `lathe`), `src/draw.js` (lines/dots), tests.

- [ ] **Step 1:** `lathe(profile, z0|F, steps)` — a surface of revolution from a `[s,r]` meridian: silhouette from the two side edges (sampled), a crease from the visible top ring. Ported from the study's maths, written fresh; no anatomy import.
- [ ] **Step 2:** `lineOnTop(a,b,z,P)`, `arcAt(...)`, `dot(x,y,z,r,P,cls)`, `dots(points,{size,tone})`. Test: a dot's screen position equals `proj`.
- [ ] **Step 3:** extend the demo to a tapered tower (lathe) with a dot lamp.
- [ ] **Step 4:** commit.

## Milestone 3 — figure contract, tour, play, bench controls

**Files:** `src/tour.js`, `skills/eli5/bench.html`, `build.mjs`, `examples/beacon.js`.

- [ ] **Step 1:** `tour(stage, stops, onStop)` — unseen pointer walks stops (travel/dwell/rest/stagger), yields to a real pointer/focus, sleeps offscreen; `LAP` default.
- [ ] **Step 2:** bench defines global `figure({name,means,rule,range,tour,parts,mount})`, mounts the figure, wires: slider→`set(value)`, theme toggle (`auto`→system, click→override), play button (`tour`), query params `?at=x,y & ?intensity= & ?theme= & ?play=1 & ?w=240`, prints `rules` and the read-out.
- [ ] **Step 3:** `examples/beacon.js` — the lighthouse from the prototype, rewritten against the eli5 kernel (tower via lathe, beam fan, tour, parts). Build, view, verify the play button and both themes. **Viewable checkpoint.**
- [ ] **Step 4:** commit.

## Milestone 4 — gate 1: static validator

**Files:** `skills/eli5/validate.mjs`, `test/validate.test.mjs`.

- [ ] **Step 1:** implement the checks: kernel hash intact; no `fill=`/`stroke=`/`stroke-width`/`opacity`/`filter`/`box-shadow` in the figure source; no `setTimeout`/`setInterval`/`requestAnimationFrame`/`matchMedia` of its own; input only via `EL.pointer`; calls `EL.register`; ends with `figure({…})`; `tour` shape; `parts` declared; lines ≤ budget (Figure 200).
- [ ] **Step 2:** test: a good figure passes; each planted violation fails with a named line. Reuse hairline's comment-stripper approach (read source as JS).
- [ ] **Step 3:** wire `validate.mjs` into `build.mjs` (refuse to write a rejected page unless `--force`).
- [ ] **Step 4:** commit.

## Milestone 5 — gate 2: lightweight measured audit

**Files:** `src/audit.js`, `skills/eli5/audit.mjs`, `test/audit.test.mjs`.

- [ ] **Step 1:** `rec()` store; shape constructors `box()`, `cyl()`, `turn()` returning world-space footprints (the same numbers the draw helpers use). Drawing helpers record automatically when the bench asks (`EL.audit.on`).
- [ ] **Step 2:** `settle()` — for each overlapping pair, decide depth from the shape centroids projected on the camera view vector; assign painter keys; flag pairs a single key can't order (interlock).
- [ ] **Step 3:** checks: `order` (no pair drawn wrong way at rest), `support` (every part rests on the ground or another), `clearance` (no interpenetration beyond a tolerance). `auditOrExit(R,P)` prints a report, exit 1 on failure.
- [ ] **Step 4:** test: a figure with a deliberately reversed pair fails `order`; a floating box fails `support`.
- [ ] **Step 5:** run on `examples/beacon.js` until `audit passed`.
- [ ] **Step 6:** commit.

## Milestone 6 — gate 3: the read harness

**Files:** `skills/eli5/look.mjs`, `skills/eli5/look.md`.

- [ ] **Step 1:** `look.mjs <figure.js>` — build, validate, then drive headless Chrome (path from `--chrome`/`CHROME_PATH`/Playwright cache) to screenshot the eight shots (rest/answer/240/240-answer/low/high/dark/light) into one labelled sheet PNG; print frame coverage, the read-out per shot, and any console error; exit 1 on a missing answer, a frame overflow, or a console error.
- [ ] **Step 2:** `look.md` — the checklist, including the part-feature question against `parts` (the boulder test).
- [ ] **Step 3:** commit.

## Milestone 7 — the skill docs

**Files:** `SKILL.md`, `rules.md`, `concepts.md`.

- [ ] **Step 1:** `concepts.md` — idea → object + gesture + read-out; the parts list with "what gives it away".
- [ ] **Step 2:** `rules.md` — the ten rules condensed from both houses, each with Keep it / Rejected when.
- [ ] **Step 3:** `SKILL.md` — the router: sizing, the workflow, the three gates, run commands.
- [ ] **Step 4:** commit.

## Milestone 8 — reference figure & the read-gate proof

**Files:** `examples/lighthouse.js` (+ built pages), `examples/boulders.js` (a deliberately un-readable base).

- [ ] **Step 1:** finish `examples/lighthouse.js` on the eli5 kernel; pass static + measured; produce the read sheet; answer the checklist.
- [ ] **Step 2:** add a **boulder case**: a base whose parts are flat `lo` cylinders that pass `audit.mjs` but show none of the features the `parts` list demands, so `look.md`'s checklist fails it. Record both outputs in `NOTES.md`.
- [ ] **Step 3:** commit.

## Milestone 9 — status

**Files:** `.agents/status.md`, `skills/eli5/README.md`.

- [ ] **Step 1:** write the status doc (what's built, open items, how to run) and the skill README (install as an agent skill).

---

## Self-review (against the spec)

- **Spine** (frozen kernel, figure contract) → M0/M1/M3. ✅
- **Three gates** → M4 (static), M5 (measured), M6 (read). ✅
- **Read gate tied to `parts`** → M3 (`parts`), M6 (checklist), M8 (proof). ✅
- **Detail dial (Figure/Hero)** → M7 (`concepts.md`/`SKILL.md` sizing). ✅
- **Theme `auto` + toggle** → M1/M3. ✅
- **Autoplay `tour` + play + `?play=1`** → M3. ✅
- **Dep-free, Node 20+, plain Chrome** → all milestones; no imports outside `src/`. ✅
- **Done-when (reference figure passes all gates; boulder caught by read, missed by audit)** → M8. ✅

No placeholders; names are consistent (`EL` namespace, `figure(...)`, `parts`, `tour`, `rule`, `range`).
