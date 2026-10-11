# eli5 — status

A repo skill that turns an idea into an isometric SVG figure: a real machine
whose working *is* the idea, that answers the pointer, with a live read-out, and
that is verified three ways.

## What's built

- **The kernel** — `skills/eli5/kernel.js`, generated from `src/` by
  `scripts/kernel.mjs`, hashed on its first line, with a hand-written index at the
  top. No dependencies. `node scripts/kernel.mjs --check` fails if it is stale.
  - Maths (`src/iso.js`): `cam`/`frame`/`proj`/`unproj`/`facing`, rounded rings,
    `hull`.
  - Solids (`src/solid.js`): `slab`, `cylinder`, `lathe` (about z), `latheY` and
    `ringY` (about the view axis), `prism`; each returns its paths and its shape.
  - Parts (`src/parts.js`): `knurl`, `sideArc`, `sideSeam`, `boltRing`.
  - Motion (`src/motion.js`): spring + tween; `src/stage.js`: one loop, pointer,
    disposer, `advance`; `src/theme.js`: tokens + CSS (light-first, `auto` +
    toggle); `src/tour.js`: autoplay; `src/audit.js`: the measured checks.
- **The gates** — `validate.mjs` (static), `audit.mjs` (measured, needs Chrome),
  `look.mjs` + `look.md` (the sheet), `read.mjs` (the read recorded).
- **The docs** — `SKILL.md`, `rules.md`, `concepts.md`.
- **Figures** — `examples/board.js`, `examples/boulders.js` (the read-gate proof);
  `prototypes/lighthouse/eli5/lighthouse.js`; `prototypes/shutter/eli5/shutter.js`.

All four figures pass static + audit; the two references pass the read too.

## How to run

```sh
node scripts/kernel.mjs                      # regenerate the kernel after editing src/
node skills/eli5/build.mjs <figure.js>       # one page
node skills/eli5/serve.mjs                   # open it at localhost:4321
node skills/eli5/validate.mjs <figure.js>    # gate 1
node skills/eli5/audit.mjs <figure.js>       # gate 2
node skills/eli5/look.mjs <figure.js> --answer x,y   # gate 3
node skills/eli5/read.mjs <figure.js>        # gate 3b
node --test skills/eli5/test/                # unit tests
```

## Known limits and open items

- **The measured gate is a net, not a proof.** Its screen test is boxes of
  projected sample points; it needed filters to fit face/panel assemblies
  (order by depth-at-overlap; support by "backed"; a 2.5u tolerance for coplanar
  parts). Each new shape of object may break it again. `read.mjs` is the last word.
- **The read gate is a judgment.** `read.mjs` requires the answer but cannot tell
  a true one from a false one.
- **Shading is two-tone + a recede role**, not four per-face tones. Enough to give
  volume and a focus; a per-side ramp would be the next step.
- **`look.mjs` drives Chrome but rAF is throttled headless**, so animated states
  are captured with `?settle=1`. A proper CDP-driven capture would be better.
- **No horizontal-axis solid is smoothed on curves** (a curved barrel), only
  straight meridians.

## Next

- Richer per-side shading (four tones, as anatomy).
- A smoother `latheY`/`lathe` (analytic profiles) for bells and lenses.
- Another worked example, refined against the read.
