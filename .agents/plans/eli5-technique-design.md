# eli5 — technique design

Status: draft for review · 2026-10-11
Supersedes: nothing. Motivated by the two prototypes in `../prototypes/lighthouse/`
and the reference skills in `../ref/hairline` and `../ref/anatomy`.

## Purpose

One self-contained isometric figure that **is** a real machine whose working
explains a technical idea — and that is verified three ways: it is **consistent**
(measured), it is **well-made** (rules), and it **reads** (by eye, at two scales).

The third gate is the reason this exists. Both reference houses verify the first
two and stop short of the third; the lighthouse boulder discs in
`../prototypes/lighthouse/anatomy` pass `audit passed` and still look like coins.

## Non-goals

- Not a chart, dashboard or data-plot library. Numbers appear as a live read-out
  driven by a model, never as axes or series.
- Not an illustration engine for arbitrary scenes. Machines, instruments, tools,
  furniture — things with a mechanism.
- One idea per figure. A figure that needs a second idea is two figures.
- Not React-first. Framework-free output first; a React entry is a later, additive
  concern.

## The spine

**A frozen kernel.** `kernel.js` holds the drawing maths, the parts library, one
shared frame loop, the pointer, the tour engine, the theme tokens and a
lightweight geometry recorder. It is generated from `src/`, carries a hash on its
first line, and a hand-written index at its top listing everything a figure may
call. The agent reads the index and never edits the kernel — a change to the
engine is a change to the engine, not to the figure.

**A declarative figure file.** `figure.js` is the only thing the agent writes:

```js
figure({
  name: "beacon",                 // lowercase, one word
  means: "…",                     // one sentence, the line under the stage
  rule: [1, 4, 5, 9],             // which of the rules it leans on
  range: [lo, mid, hi],           // the slider's one number, at intensity 0/0.5/1
  tour: [[x, y], … | null],       // 3–6 autoplay stops, or null to leave
  parts: [{ name: "boulder", shows: ["faceted top", "shadowed side", "contact"] }],
  mount({ stage, svg, read, audit }, value) { … return { set, destroy }; },
});
```

`parts` is new, and it is what the read gate checks against.

**Build.** `build.mjs <figure.js>` writes one self-contained HTML (the bench:
kernel + figure + controls). Query params for verification and hand-over:
`?at=x,y` (hold the pointer), `?intensity=`, `?theme=`, `?play=1`, `?w=240`.

## The three gates

Ordered, and each must be zero before the next:

1. **Static** — `validate.mjs`, textual, like hairline's. Kernel hash intact; no
   colour, fill, stroke width, timer or DOM measurement of the figure's own; input
   only through the kernel pointer; joins the one loop; ends with `figure({…})`;
   `tour` shape legal; `parts` declared; a line budget for a Figure.
2. **Measured** — `audit.mjs`, geometry, in the kernel (anatomy's idea, trimmed).
   The figure records a shape for everything it draws; the audit proves painter's
   order, support, and no interpenetration over the rest pose and any moved poses.
   Non-zero exit on any failure. Sized to be fast on a small figure.
3. **Read** — `look.mjs` + `look.md`, by eye. Renders **240px and 4×, light and
   dark**, plus an answering pose and the slider's two ends, into one sheet with
   the frame coverage and the console; then a fixed checklist the agent answers
   from the sheet. The checklist includes the one neither house asks:

   > For each part in `parts`, point at it in the 240px picture and name the
   > features it must show. A part that shows none of them is a no, however it
   > looks at 4×.

   A "no" is fixed in the figure before anything is handed over.

## Detail dial, not a cap

Two sizes, chosen before any geometry (state which and the rough estimate):

- **Figure** — one mechanism, ~15–40 parts, minutes. The default; built without asking.
- **Hero** — a dense object or several mechanisms, ~40–120 parts, hours. Chosen
  explicitly, not assumed.

Restraint is the default aesthetic regardless of size: **one lit accent**, light
theme designed first, no colour unless colour is the subject. Detail is *earned*,
not sprayed on — every part belongs to the mechanism and shows the features that
make it what it is.

## Theme and autoplay, by design

- **Theme.** Light-first; tokens only; a figure sets no colour of its own. `auto`
  follows the system, a runtime toggle overrides it, `?theme=` sets it.
- **Autoplay.** `tour` is required. A play control and `?play=1` walk the stops; a
  real pointer or focus holds it; idle resumes after they leave; reduced motion
  holds the figure still.

## Layout

```
skills/eli5/
  SKILL.md        the router: workflow, sizing, the three gates, rules in short form
  rules.md        the craft rules, condensed from both houses
  concepts.md     idea -> object + gesture + read-out + the parts list
  kernel.js       frozen, hashed, indexed (generated from src/)
  build.mjs  validate.mjs  audit.mjs  look.mjs  look.md
  examples/       reference figures, built pages committed
src/              kernel source: maths, stage, parts, audit
```

## Workflow (`SKILL.md`)

1. **Size it** — Figure or Hero; say the estimate (read `date` at the start).
2. **Truth first** — the real numbers and behaviour; a small pure model drives the
   read-out and the motion.
3. **Concept** — object + gesture + read-out, one line; one idea (read `concepts.md`).
4. **Parts list** — named parts, each with the features it must show and what it
   rests on. This list is the read gate's checklist.
5. **Build** against the kernel index; paint back to front; one lit accent.
6. **Declare** `tour`, `rule`, `range`, `parts`.
7. **Verify** — static, then measured, then read. Fix read failures first; the
   tenth version is held to the same bar as the first.
8. **Hand over** — the HTML and the read sheet; one line each on the metaphor, the
   rules it leans on, the tour, and anything not verified (no browser, no audit).

## Reuse vs invent

| From `hairline` | From `anatomy` | Ours |
|---|---|---|
| frozen hashed kernel + index | parts library (lathe, tube) | **the read gate** |
| figure contract, `tour`, `rule`/`range` | card + live read-out + legend | **parts list that feeds the read gate** |
| the ten rules, `concepts.md` "what gives it away" | the measured audit (trimmed, in-kernel) | **light-first + runtime toggle + auto** |
| one highlight, restraint, <N lines | "features that make it what it is", two looks | |

## Done when

- A reference figure passes all three gates, in both themes.
- The boulder-disc case is **caught by the read gate and missed by the audit** —
  demonstrated, not asserted.
- `SKILL.md` + `rules.md` + `concepts.md` + `kernel.js` + the four scripts run on
  Node 20+ with **no dependencies**.

## Open questions

- The kernel's exact API surface: how much of `anatomy`'s `lathe`/`tube` to include
  without bloating the index the agent must read.
- Whether the audit is in the kernel or a sibling module loaded by the bench.
- Whether `look.mjs` should use Playwright (both houses do) or a plain headless
  Chrome invocation (this environment has the latter but not the former).
