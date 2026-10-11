---
name: eli5
description: Use when someone wants an idea explained as a real machine — an isometric SVG figure that answers the pointer, in the eli5 style. Turns a technical idea (a rate limiter, a camera shutter, a deploy pipeline) into a physical object whose working is the idea, with a live read-out, verified by a static check, a measured geometry audit, and a read by eye.
---

# eli5 — explain an idea by building it

You write one thing: a figure. The engine (`kernel.js`) is fixed: read its index
at the top, never edit it. A figure draws in a 400 × 320 viewBox with `EL`, joins
one frame loop, answers the pointer, and declares what it is.

## Workflow

1. **Size it.** A **Figure** is one mechanism and its features; a **Hero** is a
   dense object. Say which and roughly how long, before you start. A working page
   within the first hour.
2. **Truth first.** Collect the real numbers and behaviour. A small pure model
   drives the read-out and the motion, so every number is true.
3. **Concept.** Object + what the pointer does + the read-out, one line
   (`concepts.md`). One idea. If the object's name depends on its setting, draw
   the setting.
4. **Parts list.** Name every part and the features it must show (`concepts.md`).
   This list is the figure's `parts` and the read gate's checklist.
5. **Build** against the kernel index (`kernel.js`): `cam`/`fit`/`proj`/`facing`,
   `slab`/`cylinder`/`lathe`, `line`/`dot`, `knurl`/`sideArc`/`sideSeam`, springs
   and tweens. Create and draw each solid in paint order.
6. **Declare** `figure({ name, means, rule, range, rest, tour, parts, mount })`.
7. **Verify** — the three gates, in order, until each passes:
   - `node validate.mjs <figure.js>` — the static check: the contract, no colour
     or timer of its own, one loop, `parts` and `tour` declared.
   - `node audit.mjs <figure.js>` — the measured check: painter's order, support
     and clearance over the shapes `draw` recorded.
   - `node look.mjs <figure.js> --answer x,y` — the read: eight views on one
     sheet. Read `look.md` against it and answer `read.mjs`.
8. **Hand over.** Say the metaphor, the rules it leans on, the tour, and anything
   you could not verify (no browser, no audit). Do not hand over a figure the
   validator rejects, and do not say the look is done if you did not look.

## Commands

```sh
node build.mjs <figure.js> [out.html]     # one self-contained page
node serve.mjs                            # open it at localhost:4321
node validate.mjs <figure.js>             # gate 1
node audit.mjs <figure.js>                # gate 2 (needs Chrome)
node look.mjs <figure.js> --answer x,y    # gate 3 (needs Chrome)
node read.mjs <figure.js> --new           # answer the sheet, then:
node read.mjs <figure.js>                 # gate 3b: refuses an unread figure
node ../scripts/kernel.mjs                # after editing src/, regenerate the kernel
```

## The bench

`build.mjs` writes a page with the slider (`range`), a theme toggle and a play
button. Query params for looking and hand-over: `?at=x,y`, `?intensity=`,
`?theme=`, `?play=1`, `?w=240`, `?settle=1`.

## What goes wrong

| If you catch yourself | Do this instead |
| --- | --- |
| a part that is a rounded block | give it the features you named in the concept (`concepts.md`) |
| the object reads only because you know what you drew | draw the context that names it (the shutter needs its camera) |
| reaching for a colour, fill or shadow | move a stroke to `el-hi` (rule 04) |
| a timer or its own frame loop | `EL.register`, with springs or tweens (rules 07, 08) |
| creating a solid in one place and drawing it in another | create and draw in paint order (rule 06) |
| a lone object small in the corner | `frame`, centred, about 75–85% of the card |
| a knob or lever that never moves | drive it with the mechanism (cause and effect) |
| detail spread evenly | spend it on the subject; keep the rest just enough to name the machine |
| passing the audit and calling it done | answer `read.mjs` from the sheet; the audit cannot see a coin that should be a rock |
